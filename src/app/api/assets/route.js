import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get Assets (visible to all authorized users, supports query parameters)
export async function GET(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const allocatedToUserId = searchParams.get('allocatedToUserId') || '';

    let assets = db.get('assets');

    // If Employee, they can only see all assets if searching, but let's allow them to see active inventory.
    // If allocatedToUserId parameter is set to "me", filter by current user ID
    if (allocatedToUserId === 'me') {
      assets = assets.filter(a => a.allocatedToUserId === auth.user.id);
    } else if (allocatedToUserId) {
      assets = assets.filter(a => a.allocatedToUserId === parseInt(allocatedToUserId));
    }

    if (search) {
      assets = assets.filter(a => 
        a.name.toLowerCase().includes(search) || 
        a.tag.toLowerCase().includes(search) ||
        (a.condition && a.condition.toLowerCase().includes(search))
      );
    }

    if (status) {
      assets = assets.filter(a => a.status === status);
    }

    if (categoryId) {
      assets = assets.filter(a => a.categoryId === parseInt(categoryId));
    }

    if (departmentId) {
      assets = assets.filter(a => a.departmentId === parseInt(departmentId));
    }

    return NextResponse.json({ success: true, assets });
  } catch (err) {
    console.error('Fetch assets error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Create new Asset (Admin and Asset Manager only)
export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, categoryId, departmentId, condition, customFieldValues, fileUploads } = await req.json();

    if (!name || !categoryId || !departmentId) {
      return NextResponse.json({ error: 'Name, Category, and Department are required' }, { status: 400 });
    }

    // Check category exists
    const category = db.getById('categories', categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Check department exists
    const dept = db.getById('departments', departmentId);
    if (!dept) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }

    // Insert new asset row with temporary tag
    const tempAsset = db.insert('assets', {
      tag: 'AST-TEMP',
      name: name.trim(),
      categoryId: parseInt(categoryId),
      departmentId: parseInt(departmentId),
      allocatedToUserId: null,
      status: 'Available',
      condition: condition || 'Good',
      customFieldValues: customFieldValues || {},
      fileUploads: fileUploads || []
    });

    // Update with formatted auto-generated tag (e.g. AST-0005)
    const generatedTag = `AST-${tempAsset.id.toString().padStart(4, '0')}`;
    const asset = db.update('assets', tempAsset.id, { tag: generatedTag });

    db.logActivity(auth.user.id, 'ASSET_CREATE', `Created asset ${asset.name} with Tag ${generatedTag}`);

    return NextResponse.json({ success: true, asset });
  } catch (err) {
    console.error('Create asset error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update Asset details / status (Admin, Asset Manager, and Department Head)
export async function PATCH(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, name, categoryId, departmentId, allocatedToUserId, status, condition, customFieldValues, fileUploads } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const asset = db.getById('assets', id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Restriction: Department Heads can only edit assets in their own department
    if (auth.user.role === 'Department Head' && asset.departmentId !== auth.user.departmentId) {
      return NextResponse.json({ error: 'Access Denied: Can only edit department assets' }, { status: 403 });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (categoryId) updates.categoryId = parseInt(categoryId);
    if (departmentId) updates.departmentId = parseInt(departmentId);
    if (allocatedToUserId !== undefined) {
      updates.allocatedToUserId = allocatedToUserId ? parseInt(allocatedToUserId) : null;
      // Automatically adjust status if allocated user changes
      if (updates.allocatedToUserId) {
        updates.status = 'Allocated';
      } else if (asset.status === 'Allocated') {
        updates.status = 'Available';
      }
    }
    if (status) updates.status = status;
    if (condition) updates.condition = condition;
    if (customFieldValues) updates.customFieldValues = { ...asset.customFieldValues, ...customFieldValues };
    if (fileUploads) updates.fileUploads = fileUploads; // Expected format: Array of base64 objects or links

    const updatedAsset = db.update('assets', id, updates);

    // Logging action
    db.logActivity(auth.user.id, 'ASSET_UPDATE', `Updated asset ${asset.tag} - Status: ${updatedAsset.status}, Condition: ${updatedAsset.condition}`);

    // If allocated user changed, notify them
    if (allocatedToUserId && allocatedToUserId !== asset.allocatedToUserId) {
      db.createNotification(allocatedToUserId, 'Asset Allocated', `Asset ${asset.name} (${asset.tag}) has been allocated to you.`);
    }

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (err) {
    console.error('Update asset error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
