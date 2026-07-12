import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get user list (Admin and Asset Manager only)
export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const users = db.get('users').map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Update User details (e.g. role or status) - strictly Admin only
export async function PATCH(req) {
  const auth = await requireRole(['Admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { userId, role, status, departmentId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetUser = db.getById('users', userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent changing the last admin role to avoid lockouts
    if (targetUser.id === 1 && role && role !== 'Admin') {
      return NextResponse.json({ error: 'System Admin role cannot be modified' }, { status: 400 });
    }

    const updates = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (departmentId) updates.departmentId = parseInt(departmentId);

    const updatedUser = db.update('users', userId, updates);
    const { password, ...userWithoutPassword } = updatedUser;

    db.createNotification(userId, 'Account Updated', `Your account details have been updated by the Admin.`);
    db.logActivity(auth.user.id, 'USER_UPDATE', `Updated user ID ${userId} status/role to: ${JSON.stringify(updates)}`);

    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
