'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setSentryUser, setSyncContext, updateSyncContextOnNetworkChange } from '@/lib/monitoring/sentry';
const APP_NAME = 'ProStreet';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Set up network change listener for sync context updates
  useEffect(() => {
    const cleanup = updateSyncContextOnNetworkChange();
    return cleanup;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Set Sentry user context for error attribution
      setSentryUser({ id: data.user.id, email: data.user.email || '' });
      // Initialize sync context
      setSyncContext();

      // Store remember me preference in localStorage
      if (rememberMe) {
        localStorage.setItem('prostreet_remember_me', 'true');
      } else {
        localStorage.removeItem('prostreet_remember_me');
      }

      // Get user role from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single<{ role: 'admin' | 'field_user' }>();

      if (userError || !userData) {
        // User exists in auth but not in users table - default to field_user
        router.push('/tasks');
        return;
      }

      // Role-based redirect
      if (userData.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/tasks');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            {/* App Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center bg-foreground"
              >
                <span
                  className="text-2xl font-bold text-primary"
                >
                  P
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {APP_NAME}
            </h1>
            <p className="text-muted-foreground mt-3">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-base font-medium text-foreground mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-border rounded-md bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium text-foreground mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-border rounded-md bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center touch-target pt-1">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-5 w-5 text-primary focus:ring-primary border-border rounded cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-3 text-base text-foreground cursor-pointer"
              >
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background text-base touch-target disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
