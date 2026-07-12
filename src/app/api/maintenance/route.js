import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get Maintenance Records
export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const maintenance = db.get('maintenance');
    return NextResponse.json({ success: true, maintenance });
  } catch (err) {
    console.error('Fetch maintenance error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Request Maintenance (Admin, Asset Manager, Department Head)
export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { assetId, description, technicianName, cost, startDate, endDate } = await req.json();

    if (!assetId || !description) {
      return NextResponse.json({ error: 'Asset and description are required' }, { status: 400 });
    }

    const asset = db.getById('assets', assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Insert maintenance record as Requested
    const maintenance = db.insert('maintenance', {
      assetId: parseInt(assetId),
      description: description.trim(),
      technicianName: technicianName ? technicianName.trim() : 'Unassigned',
      cost: cost ? parseFloat(cost) : 0.00,
      status: 'Requested',
      startDate: startDate || null,
      endDate: endDate || null
    });

    db.logActivity(auth.user.id, 'MAINTENANCE_REQUEST', `Requested maintenance for asset ${asset.tag}`);

    return NextResponse.json({ success: true, maintenance });
  } catch (err) {
    console.error('Create maintenance error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update / Approve / Progress Maintenance Status (Admin and Asset Manager only)
export async function PATCH(req) {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, technicianName, cost, startDate, endDate, description } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Maintenance ID and status are required' }, { status: 400 });
    }

    if (!['Requested', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid maintenance status value' }, { status: 400 });
    }

    const record = db.getById('maintenance', id);
    if (!record) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }

    const asset = db.getById('assets', record.assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const updates = { status };
    if (technicianName) updates.technicianName = technicianName.trim();
    if (cost !== undefined) updates.cost = parseFloat(cost);
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    if (description) updates.description = description.trim();

    // Trigger Asset state transitions based on maintenance state
    if (status === 'In Progress') {
      db.update('assets', record.assetId, { status: 'Under Maintenance' });
    } 
    else if (status === 'Completed') {
      db.update('assets', record.assetId, { 
        status: 'Available',
        condition: 'Good' // Reverts back to Good after service
      });
      // Set end date to today if not provided
      if (!record.endDate && !endDate) {
        updates.endDate = new Date().toISOString().split('T')[0];
      }
    } 
    else if (status === 'Cancelled') {
      // Revert asset to Available if it was Under Maintenance
      if (asset.status === 'Under Maintenance') {
        db.update('assets', record.assetId, { status: 'Available' });
      }
    }

    const updatedRecord = db.update('maintenance', id, updates);

    db.logActivity(auth.user.id, 'MAINTENANCE_UPDATE', `Updated maintenance ID ${record.id} status to ${status}`);

    // If asset has an assignee, notify them about maintenance update
    if (asset.allocatedToUserId) {
      db.createNotification(
        asset.allocatedToUserId, 
        'Asset Maintenance Update', 
        `Asset ${asset.name} (${asset.tag}) maintenance status changed to: ${status}.`
      );
    }

    return NextResponse.json({ success: true, maintenance: updatedRecord });
  } catch (err) {
    console.error('Update maintenance error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
