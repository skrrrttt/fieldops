import { requireAuth, signOut } from '@/lib/auth/actions';
import { DetailHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ProfileForm } from '@/components/profile/profile-form';
import type { User } from '@/lib/database.types';

export default async function ProfilePage() {
  const authUser = await requireAuth();

  // Convert AuthUser to User type for ProfileForm
  const user: User = {
    id: authUser.id,
    email: authUser.email,
    role: authUser.role,
    display_name: authUser.display_name,
    avatar_url: authUser.avatar_url,
    is_active: true,
    last_active_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <DetailHeader title="Profile" backHref="/tasks" />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-card rounded-lg shadow-sm p-6 space-y-6">
          {/* Profile Customization */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">
              Your Profile
            </h3>
            <ProfileForm user={user} />
          </div>

          {/* Account Info */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Account
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-base text-muted-foreground">Email</span>
                <span className="text-base text-foreground">{authUser.email}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-base text-muted-foreground">Role</span>
                <span className="text-base text-foreground capitalize">
                  {authUser.role?.replace('_', ' ') || 'Field User'}
                </span>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Settings
            </h3>
            <ThemeToggle />
          </div>

          {/* Sign Out */}
          <div className="border-t border-border pt-6">
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
