import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      db.logActivity(user.id, 'USER_LOGOUT', 'Logged out of session');
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear cookie
    response.cookies.set({
      name: 'assetflow_token',
      value: '',
      httpOnly: true,
      expires: new Date(0),
      path: '/'
    });

    return response;
  } catch (err) {
    console.error('Logout API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
