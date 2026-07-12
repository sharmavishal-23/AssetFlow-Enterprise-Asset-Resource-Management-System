import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET() {
  const auth = await requireRole(['Admin']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const logs = db.get('activityLogs');
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    console.error('Fetch logs error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
