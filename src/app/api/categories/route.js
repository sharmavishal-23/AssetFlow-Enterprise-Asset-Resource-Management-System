import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const categories = db.get('categories');
    return NextResponse.json({ success: true, categories });
  } catch (err) {
    console.error('Fetch categories error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, code, description, customFields } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    // Validate code formatting (alphanumeric uppercase code)
    const formattedCode = code.trim().toUpperCase();

    // Check if category code already exists
    const codeExists = db.query('categories', c => c.code === formattedCode)[0];
    if (codeExists) {
      return NextResponse.json({ error: 'Category code already exists' }, { status: 400 });
    }

    const newCategory = db.insert('categories', {
      name: name.trim(),
      code: formattedCode,
      description: description ? description.trim() : '',
      customFields: Array.isArray(customFields) ? customFields : []
    });

    db.logActivity(auth.user.id, 'CATEGORY_CREATE', `Created category ${newCategory.name} [${formattedCode}]`);

    return NextResponse.json({ success: true, category: newCategory });
  } catch (err) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
