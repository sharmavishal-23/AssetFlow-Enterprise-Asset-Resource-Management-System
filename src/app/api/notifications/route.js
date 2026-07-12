import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import db from '@/lib/db';

// Get active user notifications
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notifications = db.query('notifications', n => n.userId === user.id);
    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Mark notifications as read
export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, all } = await req.json();

    if (all) {
      // Mark all read for this user
      const userNotifications = db.query('notifications', n => n.userId === user.id && !n.read);
      userNotifications.forEach(n => {
        db.update('notifications', n.id, { read: true });
      });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = db.getById('notifications', id);
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    db.update('notifications', id, { read: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update notifications error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
