'use client';

import LoginForm from '@/components/LoginForm';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (success: boolean) => {
    if (success) {
      router.push('/');
    }
  };

  return <LoginForm onLogin={handleLogin} />;
}
