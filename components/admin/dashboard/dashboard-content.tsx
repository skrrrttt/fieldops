'use client';

/**
 * DashboardContent - Premium admin dashboard with refined visual hierarchy
 * Features: vibrant stat cards, clear data visualization, elegant spacing
 */

import Link from 'next/link';
import { useBranding } from '@/lib/branding/branding-context';
import type { DashboardStats } from '@/lib/dashboard/actions';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from '@/lib/utils/date';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Image as ImageIcon,
  Tags,
  FileText,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardContentProps {
  stats: DashboardStats;
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const { branding } = useBranding();
  const supabase = createClient();

  const completionPercentage = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your field operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {completionPercentage}% completion rate
          </span>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Tasks"
          value={stats.totalTasks}
          icon={<ClipboardList className="w-6 h-6" />}
          href="/admin/tasks"
          color={branding.primary_color}
          trend={stats.totalTasks > 0 ? 'active' : undefined}
        />
        <StatCard
          label="Completed"
          value={stats.completedTasks}
          subtext={`${completionPercentage}% of total`}
          icon={<CheckCircle2 className="w-6 h-6" />}
          color="#22c55e"
        />
        <StatCard
          label="Pending"
          value={stats.pendingTasks}
          icon={<Clock className="w-6 h-6" />}
          color="#f59e0b"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueTasks}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="#ef4444"
          alert={stats.overdueTasks > 0}
          href={stats.overdueTasks > 0 ? "/admin/tasks?filter=overdue" : undefined}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks by Status */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">
                Tasks by Status
              </h2>
              <Link
                href="/admin/tasks"
                className="text-sm font-medium flex items-center gap-1 transition-colors hover:gap-2"
                style={{ color: branding.primary_color }}
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {stats.tasksByStatus.length > 0 ? (
              <div className="space-y-5">
                {stats.tasksByStatus.map(statusItem => {
                  const percentage = stats.totalTasks > 0
                    ? Math.round((statusItem.count / stats.totalTasks) * 100)
                    : 0;

                  return (
                    <div key={statusItem.status_id} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: statusItem.status_color }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {statusItem.status_name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {statusItem.count}
                          <span className="text-muted-foreground font-normal ml-1.5">
                            ({percentage}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out group-hover:opacity-80"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: statusItem.status_color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Tags className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No statuses configured yet.
                </p>
                <Link
                  href="/admin/statuses"
                  className="inline-flex items-center gap-1.5 text-sm font-medium mt-2"
                  style={{ color: branding.primary_color }}
                >
                  Create statuses
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* User Stats */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: `${branding.primary_color}15`,
                  color: branding.primary_color,
                }}
              >
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Users</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Users</span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {stats.totalUsers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Today</span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {stats.activeUsersToday}
                </span>
              </div>
            </div>
            <Link
              href="/admin/users"
              className="flex items-center justify-center gap-2 w-full mt-5 py-2.5 rounded-xl font-medium text-sm transition-all hover:gap-3"
              style={{
                backgroundColor: `${branding.primary_color}12`,
                color: branding.primary_color,
              }}
            >
              Manage Users
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="space-y-1">
              <QuickLink
                href="/admin/tasks?action=create"
                label="Create Task"
                icon={<Plus className="w-4 h-4" />}
                shortcut="n"
                color={branding.primary_color}
              />
              <QuickLink
                href="/admin/media"
                label="View Media"
                icon={<ImageIcon className="w-4 h-4" />}
                color={branding.primary_color}
              />
              <QuickLink
                href="/admin/divisions"
                label="Manage Divisions"
                icon={<Tags className="w-4 h-4" />}
                color={branding.primary_color}
              />
              <QuickLink
                href="/admin/templates"
                label="Task Templates"
                icon={<FileText className="w-4 h-4" />}
                color={branding.primary_color}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            Recent Uploads
          </h2>
          <Link
            href="/admin/media"
            className="text-sm font-medium flex items-center gap-1 transition-colors hover:gap-2"
            style={{ color: branding.primary_color }}
          >
            View all media
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {stats.recentUploads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {stats.recentUploads.map(upload => {
              const publicUrl = supabase.storage
                .from('photos')
                .getPublicUrl(upload.storage_path).data.publicUrl;

              return (
                <Link
                  key={upload.id}
                  href={`/admin/media?photo=${upload.id}`}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl}
                    alt={`Photo from ${upload.task_title}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs text-white font-medium truncate">
                        {upload.task_title}
                      </p>
                      <p className="text-[10px] text-white/70 mt-0.5">
                        {formatDistanceToNow(new Date(upload.created_at))}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No photos uploaded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  alert?: boolean;
  trend?: 'active' | 'up' | 'down';
}

function StatCard({ label, value, subtext, icon, color, href, alert, trend }: StatCardProps) {
  const content = (
    <div
      className={`
        relative bg-card rounded-2xl border p-6 transition-all duration-200
        ${href ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''}
        ${alert
          ? 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10'
          : 'border-border/50 hover:border-border'
        }
      `}
    >
      {/* Glow effect for alert */}
      {alert && (
        <div className="absolute inset-0 rounded-2xl bg-destructive/10 animate-pulse" />
      )}

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-4xl font-bold text-foreground mt-2 tabular-nums tracking-tight">
            {value.toLocaleString()}
          </p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              {trend === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
              {subtext}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-xl shadow-sm"
          style={{
            backgroundColor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

interface QuickLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  color: string;
}

function QuickLink({ href, label, icon, shortcut, color }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary transition-all"
    >
      <div className="flex items-center gap-3">
        <span
          className="p-1.5 rounded-lg transition-colors"
          style={{
            backgroundColor: `${color}10`,
            color: color,
          }}
        >
          {icon}
        </span>
        <span className="text-sm font-medium text-foreground group-hover:text-foreground">
          {label}
        </span>
      </div>
      {shortcut && (
        <kbd className="px-2 py-0.5 text-xs bg-secondary rounded font-mono text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </Link>
  );
}
