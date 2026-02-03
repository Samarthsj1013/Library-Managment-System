/**
 * Index Page
 * 
 * This is the landing page for the Library Management System.
 * It redirects authenticated users to their dashboard and
 * shows a welcome page for unauthenticated users.
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, ArrowRight, BookCopy, Users, Shield } from 'lucide-react';

export default function Index() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-8 shadow-lg">
              <BookOpen className="h-10 w-10 text-primary-foreground" />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Library Management
              <br />
              <span className="text-primary">System</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              A comprehensive solution for managing library books, student borrowings,
              and tracking returns. Simple, efficient, and easy to use.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Key Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="dashboard-card text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <BookCopy className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Book Management</h3>
            <p className="text-muted-foreground">
              Add, edit, and organize your entire book collection with categories and
              real-time availability tracking.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="dashboard-card text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/20 mb-4">
              <Users className="h-7 w-7 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Student Portal</h3>
            <p className="text-muted-foreground">
              Students can browse books, view their borrowings, check due dates, and
              monitor any outstanding fines.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="dashboard-card text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-success/10 mb-4">
              <Shield className="h-7 w-7 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Secure System</h3>
            <p className="text-muted-foreground">
              Role-based access control ensures admins and students have appropriate
              permissions for their actions.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">Library Management System</span>
            </div>
            <p className="text-sm text-muted-foreground">
              College Project • Built with React & Supabase
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
