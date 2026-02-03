/**
 * Dashboard Layout Component
 * 
 * This component provides a consistent layout for all dashboard pages.
 * Features:
 * - Responsive sidebar navigation
 * - Header with user info and logout
 * - Mobile-friendly navigation
 */

import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  LayoutDashboard,
  BookCopy,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

// Navigation items for admin dashboard
const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Books', href: '/admin/books', icon: <BookCopy className="h-5 w-5" /> },
  { label: 'Students', href: '/admin/students', icon: <Users className="h-5 w-5" /> },
  { label: 'Issued Books', href: '/admin/issued', icon: <ClipboardList className="h-5 w-5" /> },
];

// Navigation items for student dashboard
const studentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Browse Books', href: '/student/books', icon: <BookCopy className="h-5 w-5" /> },
  { label: 'My Books', href: '/student/my-books', icon: <ClipboardList className="h-5 w-5" /> },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Select navigation items based on user role
  const navItems = userRole === 'admin' ? adminNavItems : studentNavItems;

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-sidebar-foreground">Library</h2>
                <p className="text-xs text-sidebar-foreground/70">Management System</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  location.pathname === item.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-4 px-4">
              <p className="text-sm font-medium text-sidebar-foreground">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">{userRole} Account</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Library</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground p-4 animate-slide-in-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                  <span className="font-bold">Library</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sidebar-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      location.pathname === item.href
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="absolute bottom-4 left-4 right-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
