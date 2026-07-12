import { NextResponse } from 'next/server';
import db, { hashPassword } from '@/lib/db';
import { signToken } from '@/lib/auth-utils';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.query('users', u => u.email.toLowerCase() === normalizedEmail)[0];

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact Admin.' }, { status: 403 });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Generate JWT token
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // Build the response and attach the token as an HttpOnly, secure cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      }
    });

    response.cookies.set({
      name: 'assetflow_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 1 day
      path: '/'
    });

    db.logActivity(user.id, 'USER_LOGIN', `Logged in successfully from IP: ${req.headers.get('x-forwarded-for') || 'local'}`);

    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
