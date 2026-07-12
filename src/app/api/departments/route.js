import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const departments = db.get('departments');
    return NextResponse.json({ success: true, departments });
  } catch (err) {
    console.error('Fetch departments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireRole(['Admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, parentId, managerId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const newDept = db.insert('departments', {
      name: name.trim(),
      parentId: parentId ? parseInt(parentId) : null,
      managerId: managerId ? parseInt(managerId) : null
    });

    db.logActivity(auth.user.id, 'DEPARTMENT_CREATE', `Created department ${newDept.name}`);

    return NextResponse.json({ success: true, department: newDept });
  } catch (err) {
    console.error('Create department error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
