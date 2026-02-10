/**
 * Admin Dashboard Page
 * 
 * This is the main dashboard for library administrators (librarians).
 * It displays:
 * - Overview statistics (total books, issued books, overdue, fines)
 * - Recent activities
 * - Quick actions
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  BookCopy,
  Users,
  AlertCircle,
  IndianRupee,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

// Statistics card data type
interface DashboardStats {
  totalBooks: number;
  totalStudents: number;
  issuedBooks: number;
  overdueBooks: number;
  totalFines: number;
}

// Recent activity type
interface RecentActivity {
  id: string;
  bookTitle: string;
  studentName: string;
  action: 'issued' | 'returned';
  date: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    totalStudents: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    totalFines: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch dashboard statistics from the database
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total books count
        const { count: booksCount } = await supabase
          .from('books')
          .select('*', { count: 'exact', head: true });

        // Fetch total students count
        const { count: studentsCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        // Fetch issued books (not yet returned)
        const { data: issuedData } = await supabase
          .from('issued_books')
          .select('*')
          .is('return_date', null);

        // Calculate overdue books
        const today = new Date().toISOString().split('T')[0];
        const overdueCount = issuedData?.filter(
          (book) => book.due_date < today
        ).length || 0;

        // Calculate total fines
        const { data: finesData } = await supabase
          .from('issued_books')
          .select('fine_amount')
          .not('fine_amount', 'is', null);

        const totalFines = finesData?.reduce(
          (sum, item) => sum + (Number(item.fine_amount) || 0),
          0
        ) || 0;

        setStats({
          totalBooks: booksCount || 0,
          totalStudents: studentsCount || 0,
          issuedBooks: issuedData?.length || 0,
          overdueBooks: overdueCount,
          totalFines: totalFines,
        });

        // Fetch recent activities (last 5 transactions)
        const { data: recentData } = await supabase
          .from('issued_books')
          .select(`
            id,
            issue_date,
            return_date,
            books (title),
            profiles:user_id (name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentData) {
          const activities: RecentActivity[] = recentData.map((item: any) => ({
            id: item.id,
            bookTitle: item.books?.title || 'Unknown Book',
            studentName: item.profiles?.name || 'Unknown Student',
            action: item.return_date ? 'returned' : 'issued',
            date: item.return_date || item.issue_date,
          }));
          setRecentActivities(activities);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Page Header */}
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-description">Welcome back! Here's what's happening in your library.</p>
          </div>
          <Link to="/admin/books/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Books</p>
                <p className="text-3xl font-bold mt-1">{stats.totalBooks}</p>
              </div>
              <BookCopy className="h-10 w-10 opacity-80" />
            </div>
          </div>

          <div className="stat-card-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Registered Students</p>
                <p className="text-3xl font-bold mt-1">{stats.totalStudents}</p>
              </div>
              <Users className="h-10 w-10 opacity-80" />
            </div>
          </div>

          <div className="stat-card-success">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Books Issued</p>
                <p className="text-3xl font-bold mt-1">{stats.issuedBooks}</p>
              </div>
              <BookCopy className="h-10 w-10 opacity-80" />
            </div>
          </div>

          <div className="stat-card-destructive">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Overdue Books</p>
                <p className="text-3xl font-bold mt-1">{stats.overdueBooks}</p>
              </div>
              <AlertCircle className="h-10 w-10 opacity-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Fines Collected */}
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-accent" />
                Total Fines Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">₹{stats.totalFines.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Fine rate: ₹1.00 per day overdue</p>
            </CardContent>
          </Card>

        </div>

        {/* Recent Activities */}
        <Card className="dashboard-card mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Activities</CardTitle>
            <Link to="/admin/issued">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent activities. Start by issuing some books!
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{activity.bookTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action === 'issued' ? 'Issued to' : 'Returned by'}{' '}
                        {activity.studentName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          activity.action === 'issued'
                            ? 'badge-issued'
                            : 'badge-returned'
                        }`}
                      >
                        {activity.action === 'issued' ? 'Issued' : 'Returned'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
