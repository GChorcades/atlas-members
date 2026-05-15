import { AuthBrand } from '@/components/auth-brand';
import ResetForm from './reset-form';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  return <ResetForm params={params} brandHeader={<AuthBrand />} />;
}
