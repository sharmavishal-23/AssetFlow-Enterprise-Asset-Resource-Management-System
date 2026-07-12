import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get Audits (Admin and Asset Manager only)
export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const audits = db.get('audits');
    return NextResponse.json({ success: true, audits });
  } catch (err) {
    console.error('Fetch audits error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Create new Audit Cycle
export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, startDate, endDate, auditorUserId } = await req.json();

    if (!name || !startDate || !endDate || !auditorUserId) {
      return NextResponse.json({ error: 'All fields (name, startDate, endDate, auditorUserId) are required' }, { status: 400 });
    }

    const auditor = db.getById('users', auditorUserId);
    if (!auditor) {
      return NextResponse.json({ error: 'Auditor not found' }, { status: 404 });
    }

    // Default discrepancy report structure
    const discrepancyReport = {
      checkedAssets: [], // Array of checked asset IDs
      missingAssets: [], // Array of missing asset IDs
      damagedAssets: []  // Array of damaged asset IDs
    };

    const audit = db.insert('audits', {
      name: name.trim(),
      startDate,
      endDate,
      auditorUserId: parseInt(auditorUserId),
      status: 'Draft',
      discrepancyReport
    });

    db.createNotification(auditorUserId, 'Audit Assigned', `You have been assigned as the auditor for: ${audit.name}`);
    db.logActivity(auth.user.id, 'AUDIT_CREATE', `Created audit cycle: ${audit.name}`);

    return NextResponse.json({ success: true, audit });
  } catch (err) {
    console.error('Create audit error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update Audit Checklist or Cycle status (e.g. locking)
export async function PATCH(req) {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, discrepancyReport } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    const audit = db.getById('audits', id);
    if (!audit) {
      return NextResponse.json({ error: 'Audit cycle not found' }, { status: 404 });
    }

    // Strict Lock Check: If cycle is already Locked, prevent any modifications!
    if (audit.status === 'Locked') {
      return NextResponse.json({ error: 'Strict Lockout: Locked audit cycles cannot be modified.' }, { status: 400 });
    }

    const updates = {};
    if (status) {
      if (!['Draft', 'In Progress', 'Completed', 'Locked'].includes(status)) {
        return NextResponse.json({ error: 'Invalid audit status value' }, { status: 400 });
      }
      updates.status = status;
    }

    if (discrepancyReport) {
      updates.discrepancyReport = {
        checkedAssets: Array.isArray(discrepancyReport.checkedAssets) ? discrepancyReport.checkedAssets.map(x => parseInt(x)) : audit.discrepancyReport.checkedAssets,
        missingAssets: Array.isArray(discrepancyReport.missingAssets) ? discrepancyReport.missingAssets.map(x => parseInt(x)) : audit.discrepancyReport.missingAssets,
        damagedAssets: Array.isArray(discrepancyReport.damagedAssets) ? discrepancyReport.damagedAssets.map(x => parseInt(x)) : audit.discrepancyReport.damagedAssets
      };
    }

    // Handle Cycle Locking Operations
    if (status === 'Locked') {
      const finalReport = updates.discrepancyReport || audit.discrepancyReport;
      
      // 1. Process missing assets: Mark as 'Lost' in the asset database
      finalReport.missingAssets.forEach(assetId => {
        const asset = db.getById('assets', assetId);
        if (asset && asset.status !== 'Lost') {
          db.update('assets', assetId, { status: 'Lost' });
          db.logActivity(auth.user.id, 'AUDIT_ASSET_LOST', `Asset ${asset.tag} marked as Lost via Audit Lock.`);
        }
      });

      // 2. Process damaged assets: Mark as 'Under Maintenance' or 'Retired' depending on condition
      finalReport.damagedAssets.forEach(assetId => {
        const asset = db.getById('assets', assetId);
        if (asset && !['Under Maintenance', 'Retired'].includes(asset.status)) {
          db.update('assets', assetId, { 
            status: 'Under Maintenance',
            condition: 'Poor'
          });
          // Automatically trigger a maintenance request
          db.insert('maintenance', {
            assetId: parseInt(assetId),
            description: `Flagged as damaged during Audit: ${audit.name}`,
            technicianName: 'Unassigned',
            cost: 0.00,
            status: 'Requested',
            startDate: new Date().toISOString().split('T')[0],
            endDate: null
          });
          db.logActivity(auth.user.id, 'AUDIT_ASSET_DAMAGED', `Asset ${asset.tag} marked as Damaged, maintenance requested.`);
        }
      });
    }

    const updatedAudit = db.update('audits', id, updates);

    db.logActivity(auth.user.id, 'AUDIT_UPDATE', `Updated audit cycle ID ${audit.id} - Status: ${status || audit.status}`);

    return NextResponse.json({ success: true, audit: updatedAudit });
  } catch (err) {
    console.error('Update audit error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
