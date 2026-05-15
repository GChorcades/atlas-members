import { requireSuperAdmin } from '@/lib/super-admin';
import AccountForm from './account-form';

export const metadata = { title: 'Super Admin · Conta' };

export default async function SuperAdminAccountPage() {
  const admin = await requireSuperAdmin();
  return <AccountForm admin={admin} />;
}
