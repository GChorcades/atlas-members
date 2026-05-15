import { AuthBrand } from '@/components/auth-brand';
import LoginForm from './login-form';

export default function LoginPage() {
  return <LoginForm brandHeader={<AuthBrand />} />;
}
