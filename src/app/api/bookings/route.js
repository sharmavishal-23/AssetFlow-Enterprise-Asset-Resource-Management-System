import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import db from '@/lib/db';

// Get Bookings (All or filtered by Asset / User)
export async function GET(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get('assetId');
    const userId = searchParams.get('userId');

    let bookings = db.get('bookings');

    if (assetId) {
      bookings = bookings.filter(b => b.assetId === parseInt(assetId));
    }
    if (userId) {
      bookings = bookings.filter(b => b.userId === parseInt(userId));
    }

    return NextResponse.json({ success: true, bookings });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Create a Booking (with strict overlap validation)
export async function POST(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { assetId, title, startTime, endTime } = await req.json();

    if (!assetId || !title || !startTime || !endTime) {
      return NextResponse.json({ error: 'All fields (assetId, title, startTime, endTime) are required' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Check if asset exists and is available for booking
    const asset = db.getById('assets', assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (['Retired', 'Disposed'].includes(asset.status)) {
      return NextResponse.json({ error: 'Asset is retired or disposed and cannot be booked' }, { status: 400 });
    }

    // Strict Overlap Check:
    // A booking overlaps if:
    // booking.startTime < new.endTime AND booking.endTime > new.startTime
    // and status is 'Confirmed'
    const overlapping = db.query('bookings', b => {
      if (b.assetId !== parseInt(assetId) || b.status !== 'Confirmed') {
        return false;
      }
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return bStart < end && bEnd > start;
    });

    if (overlapping.length > 0) {
      return NextResponse.json({ 
        error: 'Double-Booking Conflict: The asset is already reserved during this time slot.' 
      }, { status: 409 });
    }

    // Create booking
    const booking = db.insert('bookings', {
      assetId: parseInt(assetId),
      userId: auth.user.id,
      title: title.trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'Confirmed',
      reminderSent: false
    });

    // If booking starts within 24 hours, automatically mark asset as Reserved or update accordingly
    const now = new Date();
    if (start <= now && end >= now) {
      db.update('assets', assetId, { status: 'Reserved' });
    }

    db.logActivity(auth.user.id, 'BOOKING_CREATE', `Created booking ID ${booking.id} for ${asset.tag} - "${booking.title}"`);
    db.createNotification(auth.user.id, 'Booking Confirmed', `Your booking for ${asset.name} is scheduled for ${start.toLocaleString()}.`);

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error('Create booking error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Cancel or Reschedule Booking
export async function PATCH(req) {
  const auth = await requireRole(['Admin', 'Asset Manager', 'Department Head', 'Employee']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, status, startTime, endTime, title } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = db.getById('bookings', id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorization: Employees can only edit their own bookings, unless Admin or Asset Manager
    if (booking.userId !== auth.user.id && !['Admin', 'Asset Manager'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Access Denied: Cannot modify another user\'s booking' }, { status: 403 });
    }

    const updates = {};
    if (status) {
      if (!['Confirmed', 'Cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;

      // If cancelled, and asset is currently marked Reserved, release it
      if (status === 'Cancelled') {
        const asset = db.getById('assets', booking.assetId);
        if (asset && asset.status === 'Reserved') {
          db.update('assets', booking.assetId, { status: 'Available' });
        }
      }
    }

    if (title) updates.title = title.trim();

    // If rescheduling (changing times)
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : new Date(booking.startTime);
      const end = endTime ? new Date(endTime) : new Date(booking.endTime);

      if (start >= end) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
      }

      // Check overlaps excluding the current booking
      const overlapping = db.query('bookings', b => {
        if (b.assetId !== booking.assetId || b.id === booking.id || b.status !== 'Confirmed') {
          return false;
        }
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return bStart < end && bEnd > start;
      });

      if (overlapping.length > 0) {
        return NextResponse.json({ 
          error: 'Double-Booking Conflict: Another booking exists in the requested time frame.' 
        }, { status: 409 });
      }

      updates.startTime = start.toISOString();
      updates.endTime = end.toISOString();
    }

    const updatedBooking = db.update('bookings', id, updates);

    db.logActivity(
      auth.user.id, 
      'BOOKING_UPDATE', 
      `Updated booking ID ${booking.id} - Status: ${updatedBooking.status}, Times changed: ${!!(startTime || endTime)}`
    );

    if (booking.userId !== auth.user.id) {
      db.createNotification(booking.userId, 'Booking Updated', `Your booking "${booking.title}" was updated by ${auth.user.name}.`);
    }

    return NextResponse.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error('Update booking error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
