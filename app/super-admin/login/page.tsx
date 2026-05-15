import { redirect } from 'next/navigation';
import { getSuperAdmin } from '@/lib/super-admin';
import SuperAdminLoginForm from './login-form';

export const metadata = { title: 'Super Admin · Login' };

export default async function SuperAdminLoginPage() {
  if (await getSuperAdmin()) redirect('/super-admin');
  return <SuperAdminLoginForm />;
}
