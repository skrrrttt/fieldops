'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearSentryUser } from '@/lib/monitoring/sentry';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear Sentry user context
    clearSentryUser();

    const supabase = createClient();
    await supabase.auth.signOut();

    // Clear remember me preference
    localStorage.removeItem('prostreet_remember_me');

    router.push('/login');
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="touch-target"
    >
      Sign out
    </Button>
  );
}
