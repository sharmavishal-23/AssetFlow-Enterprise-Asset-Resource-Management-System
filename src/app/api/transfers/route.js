import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get Transfers (Employee sees their own, others see all relevant transfers)
export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let transfers = db.get('transfers');
    
    // Employee filter
    if (auth.user.role === 'Employee') {
      transfers = transfers.filter(t => 
        t.toUserId === auth.user.id || 
        t.fromUserId === auth.user.id || 
        t.requestedByUserId === auth.user.id
      );
    }
    // Department Head filter
    else if (auth.user.role === 'Department Head') {
      const deptUserIds = db.query('users', u => u.departmentId === auth.user.departmentId).map(u => u.id);
      transfers = transfers.filter(t => 
        t.departmentId === auth.user.departmentId ||
        deptUserIds.includes(t.toUserId) ||
        deptUserIds.includes(t.fromUserId)
      );
    }

    return NextResponse.json({ success: true, transfers });
  } catch (err) {
    console.error('Fetch transfers error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Request / Create a Transfer or Allocation request
export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { assetId, toUserId, notes } = await req.json();

    if (!assetId || !toUserId) {
      return NextResponse.json({ error: 'Asset and target assignee are required' }, { status: 400 });
    }

    const asset = db.getById('assets', assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Prevent allocation of Retired, Disposed, or Under Maintenance assets
    if (['Retired', 'Disposed', 'Under Maintenance'].includes(asset.status)) {
      return NextResponse.json({ 
        error: `Asset is currently ${asset.status} and cannot be allocated or transferred.` 
      }, { status: 400 });
    }

    const targetUser = db.getById('users', toUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Prevent double allocation (requesting same asset for transfer if it's already pending transfer to same user)
    const activeTransferExists = db.query('transfers', t => 
      t.assetId === parseInt(assetId) && 
      t.toUserId === parseInt(toUserId) && 
      t.status === 'Pending'
    )[0];

    if (activeTransferExists) {
      return NextResponse.json({ error: 'A pending transfer request already exists for this asset to this user.' }, { status: 400 });
    }

    const fromUserId = asset.allocatedToUserId;

    // Create the transfer record
    const transfer = db.insert('transfers', {
      assetId: parseInt(assetId),
      fromUserId: fromUserId ? parseInt(fromUserId) : null,
      toUserId: parseInt(toUserId),
      requestedByUserId: auth.user.id,
      departmentId: targetUser.departmentId,
      notes: notes ? notes.trim() : '',
      status: 'Pending'
    });

    // Notify Approvers (Managers & Admins) and Target User if requested by someone else
    const approvers = db.query('users', u => ['Admin', 'Asset Manager'].includes(u.role));
    approvers.forEach(appr => {
      db.createNotification(appr.id, 'New Transfer Request', `A transfer request is pending approval for Asset: ${asset.tag}.`);
    });

    if (auth.user.id !== targetUser.id) {
      db.createNotification(targetUser.id, 'Asset Transfer Initiated', `A transfer request has been created to allocate ${asset.name} to you.`);
    }

    db.logActivity(auth.user.id, 'TRANSFER_REQUEST', `Requested transfer of asset ${asset.tag} to user ${targetUser.name}`);

    return NextResponse.json({ success: true, transfer });
  } catch (err) {
    console.error('Create transfer error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Process / Approve / Reject Transfer (Admin, Asset Manager, and Department Head of target user)
export async function PATCH(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, approvalNote, returnCondition } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Transfer ID and target status are required' }, { status: 400 });
    }

    if (!['Approved', 'Rejected', 'Returned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
    }

    const transfer = db.getById('transfers', id);
    if (!transfer) {
      return NextResponse.json({ error: 'Transfer record not found' }, { status: 404 });
    }

    if (transfer.status !== 'Pending' && status !== 'Returned') {
      return NextResponse.json({ error: 'Can only approve/reject pending transfers' }, { status: 400 });
    }

    const asset = db.getById('assets', transfer.assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Associated asset not found' }, { status: 404 });
    }

    // Role verification: Department heads can only approve requests for their department
    if (auth.user.role === 'Department Head' && transfer.departmentId !== auth.user.departmentId) {
      return NextResponse.json({ error: 'Forbidden: Can only manage transfers in your department' }, { status: 403 });
    }

    const updates = { status };
    if (approvalNote) updates.approvalNote = approvalNote.trim();

    if (status === 'Approved') {
      // Complete the transfer in the asset table
      db.update('assets', transfer.assetId, {
        allocatedToUserId: transfer.toUserId,
        status: 'Allocated'
      });

      // Notify the recipient
      db.createNotification(transfer.toUserId, 'Transfer Request Approved', `Asset ${asset.name} (${asset.tag}) has been successfully allocated to you.`);
      if (transfer.fromUserId) {
        db.createNotification(transfer.fromUserId, 'Asset Returned / Transferred', `Asset ${asset.name} (${asset.tag}) has been transferred to another user.`);
      }
      
      db.logActivity(auth.user.id, 'TRANSFER_APPROVE', `Approved transfer ID ${transfer.id}. Allocated ${asset.tag} to user ID ${transfer.toUserId}`);
    } 
    else if (status === 'Rejected') {
      // Notify requester
      db.createNotification(transfer.requestedByUserId, 'Transfer Request Rejected', `Your request for asset ${asset.tag} was rejected.`);
      db.logActivity(auth.user.id, 'TRANSFER_REJECT', `Rejected transfer ID ${transfer.id}.`);
    } 
    else if (status === 'Returned') {
      // Process return of asset to inventory
      db.update('assets', transfer.assetId, {
        allocatedToUserId: null,
        status: 'Available',
        condition: returnCondition || asset.condition
      });

      updates.returnCondition = returnCondition || 'Good';
      updates.returnedAt = new Date().toISOString();

      db.createNotification(transfer.toUserId, 'Asset Return Complete', `Your return of asset ${asset.name} (${asset.tag}) has been checked in.`);
      db.logActivity(auth.user.id, 'ASSET_RETURN', `Returned asset ${asset.tag}. Condition: ${updates.returnCondition}`);
    }

    const updatedTransfer = db.update('transfers', id, updates);

    return NextResponse.json({ success: true, transfer: updatedTransfer });
  } catch (err) {
    console.error('Update transfer error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
