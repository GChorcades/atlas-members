import { AuthBrand } from '@/components/auth-brand';
import ForgotForm from './forgot-form';

export default function ForgotPasswordPage() {
  return <ForgotForm brandHeader={<AuthBrand />} />;
}
