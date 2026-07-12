import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('assetflow_token')?.value;

  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
