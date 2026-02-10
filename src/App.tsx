/**
 * App.tsx - Main Application Component
 * 
 * This is the root component that sets up:
 * - React Query for data fetching
 * - Authentication Provider
 * - Routing for all pages
 * - Toast notifications
 * 
 * Routes:
 * - / : Landing page (redirects to dashboard if logged in)
 * - /auth : Login and Signup page
 * - /admin/* : Admin dashboard routes (protected, admin only)
 * - /student/* : Student dashboard routes (protected, student only)
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Page imports
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBooks from "./pages/admin/AdminBooks";
import AdminBookForm from "./pages/admin/AdminBookForm";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminIssuedBooks from "./pages/admin/AdminIssuedBooks";
import AdminIssueBook from "./pages/admin/AdminIssueBook";
import AdminBookRequests from "./pages/admin/AdminBookRequests";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentBooks from "./pages/student/StudentBooks";
import StudentMyBooks from "./pages/student/StudentMyBooks";

import { Loader2 } from "lucide-react";

// Create React Query client
const queryClient = new QueryClient();

/**
 * Protected Route Component
 * Redirects unauthenticated users to login
 * Redirects users to correct dashboard based on role
 */
function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode; 
  requiredRole: 'admin' | 'student';
}) {
  const { user, userRole, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to correct dashboard if wrong role
  if (userRole !== requiredRole) {
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/student" replace />;
    }
  }

  return <>{children}</>;
}

/**
 * App Routes Component
 * Must be inside AuthProvider to use useAuth hook
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />

      {/* Admin Routes - Protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/books"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminBooks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/books/new"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminBookForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/books/:bookId/edit"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminBookForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/issued"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminIssuedBooks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/issued/new"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminIssueBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminBookRequests />
          </ProtectedRoute>
        }
      />

      {/* Student Routes - Protected */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/books"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentBooks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/my-books"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentMyBooks />
          </ProtectedRoute>
        }
      />

      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * Main App Component
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
