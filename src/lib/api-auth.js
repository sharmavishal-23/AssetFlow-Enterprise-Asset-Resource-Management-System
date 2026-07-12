import { cookies } from 'next/headers';
import { verifyToken } from './auth-utils';
import db from './db';

// Gets the currently logged-in user from the session cookies
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('assetflow_token')?.value;
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload) return null;
    
    // Fetch the latest user info from the database
    const user = db.getById('users', payload.id);
    if (!user || user.status !== 'Active') return null;
    
    return user;
  } catch (err) {
    console.error('Error fetching session user:', err);
    return null;
  }
}

// Verifies that the user has one of the allowed roles
export async function requireRole(roles) {
  const user = await getSessionUser();
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  if (roles && !roles.includes(user.role)) {
    return { error: 'Forbidden', status: 403 };
  }
  
  return { user };
}
