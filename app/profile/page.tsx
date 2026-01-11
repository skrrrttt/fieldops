import { requireAuth, signOut } from '@/lib/auth/actions';
import { DetailHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <DetailHeader title="Profile" backHref="/tasks" />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-2 ring-blue-500/20 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white truncate">
                {user.email}
              </h2>
              <p className="text-base text-zinc-500 dark:text-zinc-400 capitalize">
                {user.role?.replace('_', ' ') || 'Field User'}
              </p>
            </div>
          </div>

          {/* Account Settings */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
              Account
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-700">
                <span className="text-base text-zinc-700 dark:text-zinc-300">Email</span>
                <span className="text-base text-zinc-900 dark:text-white">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-zinc-100 dark:border-zinc-700">
                <span className="text-base text-zinc-700 dark:text-zinc-300">Role</span>
                <span className="text-base text-zinc-900 dark:text-white capitalize">
                  {user.role?.replace('_', ' ') || 'Field User'}
                </span>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
              Settings
            </h3>
            <ThemeToggle />
          </div>

          {/* Sign Out */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <form action={signOut}>
              <button
                type="submit"
                className="w-full px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg active:bg-red-100 dark:active:bg-red-900/40 transition-colors touch-target"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Bottom nav spacer */}
      <MobileBottomNavSpacer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
