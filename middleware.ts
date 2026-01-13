import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import type { Database, UserRole } from '@/lib/database.types';

type UserRoleResult = { role: UserRole };

// Public routes that don't require authentication
const publicRoutes = ['/login'];

// Admin-only routes
const adminRoutes = ['/admin'];

export async function middleware(request: NextRequest) {
  // First, update the session (refresh tokens if needed)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Create supabase client to check auth
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If not authenticated and at root, redirect to login
  if (pathname === '/' && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For authenticated users, fetch role ONCE if needed for routing decisions
  let userRole: UserRole | null = null;
  const needsRoleCheck = user && (pathname === '/login' || pathname === '/' || isAdminRoute);

  if (needsRoleCheck) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<UserRoleResult>();
    userRole = userData?.role ?? null;
  }

  // If authenticated and trying to access login page, redirect based on role
  if (user && pathname === '/login') {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  // Check admin routes - only allow admins
  if (isAdminRoute && user && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  // Handle root path redirect
  if (pathname === '/' && user) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
