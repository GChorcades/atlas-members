import { AuthBrand } from '@/components/auth-brand';
import RegisterForm from './register-form';

export default function RegisterPage() {
  return <RegisterForm brandHeader={<AuthBrand />} />;
}
