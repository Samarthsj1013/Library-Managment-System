/**
 * Student Dashboard Page
 * 
 * This is the main dashboard for students.
 * It displays:
 * - Books currently issued to the student
 * - Due dates and any outstanding fines
 * - Quick access to browse books
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BookCopy, AlertCircle, IndianRupee, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

// Stats type
interface DashboardStats {
  booksIssued: number;
  overdueBooks: number;
  totalFines: number;
}

// Issued book type
interface IssuedBook {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  issueDate: string;
  dueDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
  fine: number;
}

// Fine rate: ₹1 per day
const FINE_PER_DAY = 1.0;

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    booksIssued: 0,
    overdueBooks: 0,
    totalFines: 0,
  });
  const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch student's dashboard data
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch issued books for this student
        const { data, error } = await supabase
          .from('issued_books')
          .select(`
            id,
            issue_date,
            due_date,
            return_date,
            fine_amount,
            books (title, author)
          `)
          .eq('user_id', user.id)
          .is('return_date', null)
          .order('due_date', { ascending: true });

        if (error) throw error;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let totalFines = 0;
        let overdueCount = 0;

        const mappedBooks: IssuedBook[] = (data || []).map((item: any) => {
          const dueDate = parseISO(item.due_date);
          const isOverdue = item.due_date < todayStr;
          const daysUntilDue = differenceInDays(dueDate, today);
          
          let fine = 0;
          if (isOverdue) {
            fine = Math.abs(daysUntilDue) * FINE_PER_DAY;
            totalFines += fine;
            overdueCount++;
          }

          return {
            id: item.id,
            bookTitle: item.books?.title || 'Unknown Book',
            bookAuthor: item.books?.author || 'Unknown Author',
            issueDate: item.issue_date,
            dueDate: item.due_date,
            isOverdue,
            daysUntilDue,
            fine,
          };
        });

        setIssuedBooks(mappedBooks);
        setStats({
          booksIssued: mappedBooks.length,
          overdueBooks: overdueCount,
          totalFines,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

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
        <div className="page-header">
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-description">Welcome! Here's an overview of your library activity.</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="stat-card-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Books Borrowed</p>
                <p className="text-3xl font-bold mt-1">{stats.booksIssued}</p>
              </div>
              <BookCopy className="h-10 w-10 opacity-80" />
            </div>
          </div>

          <div className={stats.overdueBooks > 0 ? 'stat-card-destructive' : 'stat-card-success'}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Overdue Books</p>
                <p className="text-3xl font-bold mt-1">{stats.overdueBooks}</p>
              </div>
              <AlertCircle className="h-10 w-10 opacity-80" />
            </div>
          </div>

          <div className={stats.totalFines > 0 ? 'stat-card-destructive' : 'stat-card-accent'}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Outstanding Fines</p>
                <p className="text-3xl font-bold mt-1">₹{stats.totalFines.toFixed(2)}</p>
              </div>
              <IndianRupee className="h-10 w-10 opacity-80" />
            </div>
          </div>
        </div>

        {/* Currently Issued Books */}
        <Card className="dashboard-card mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Currently Borrowed Books</CardTitle>
            <Link to="/student/my-books">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {issuedBooks.length === 0 ? (
              <div className="text-center py-8">
                <BookCopy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  You haven't borrowed any books yet.
                </p>
                <Link to="/student/books">
                  <Button>Browse Books</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {issuedBooks.slice(0, 3).map((book) => (
                  <div
                    key={book.id}
                    className={`p-4 rounded-lg border ${
                      book.isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{book.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">{book.bookAuthor}</p>
                      </div>
                      {book.isOverdue && (
                        <span className="badge-overdue border px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Due: {format(parseISO(book.dueDate), 'MMM d, yyyy')}
                      </div>
                      {book.isOverdue ? (
                        <span className="fine-amount">Fine: ₹{book.fine.toFixed(2)}</span>
                      ) : book.daysUntilDue <= 3 ? (
                        <span className="text-warning font-medium">
                          {book.daysUntilDue === 0 ? 'Due today!' : `${book.daysUntilDue} days left`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{book.daysUntilDue} days left</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/student/books">
              <Button variant="outline" className="w-full justify-start">
                <BookCopy className="h-4 w-4 mr-2" />
                Browse All Books
              </Button>
            </Link>
            <Link to="/student/my-books">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                View My Borrowed Books
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Fine Notice */}
        {stats.totalFines > 0 && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Outstanding Fines</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have outstanding fines of <strong>₹{stats.totalFines.toFixed(2)}</strong>.
                  Please return overdue books and pay fines at the library desk.
                  Fine rate: ₹1.00 per day after due date.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
