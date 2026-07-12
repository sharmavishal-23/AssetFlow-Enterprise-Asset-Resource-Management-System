import { NextResponse } from 'next/server';
import db, { hashPassword } from '@/lib/db';
import { signToken } from '@/lib/auth-utils';

export async function POST(req) {
  try {
    const { name, email, password, departmentId } = await req.json();

    if (!name || !email || !password || !departmentId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email already exists
    const existingUser = db.query('users', u => u.email.toLowerCase() === normalizedEmail)[0];
    if (existingUser) {
      return NextResponse.json({ error: 'Email address already registered' }, { status: 400 });
    }

    // Force default role to Employee
    const defaultRole = 'Employee';
    const hashedPassword = hashPassword(password);

    const newUser = db.insert('users', {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: defaultRole,
      departmentId: parseInt(departmentId),
      status: 'Active'
    });

    // Generate JWT token for auto-login after signup
    const token = signToken({ id: newUser.id, email: newUser.email, role: newUser.role });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId
      }
    }, { status: 201 });

    response.cookies.set({
      name: 'assetflow_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/'
    });

    // Create a notification for Admins
    const admins = db.query('users', u => u.role === 'Admin');
    admins.forEach(admin => {
      db.createNotification(admin.id, 'New Employee Registered', `${newUser.name} has joined the organization.`);
    });

    db.logActivity(newUser.id, 'USER_REGISTER', `New user registered with role Employee.`);

    return response;
  } catch (err) {
    console.error('Signup API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
