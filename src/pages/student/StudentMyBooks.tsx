/**
 * Student My Books Page
 * 
 * This page shows all books issued to the current student.
 * Features:
 * - View currently borrowed books
 * - View past borrowed books
 * - See due dates and fines
 * - Clear indication of overdue books
 */

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookOpen, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

// Issued book type
interface IssuedBook {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  category: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  isOverdue: boolean;
  daysUntilDue: number;
  fine: number;
}

// Fine rate: $1 per day
const FINE_PER_DAY = 1.0;

export default function StudentMyBooks() {
  const { user } = useAuth();
  const [currentBooks, setCurrentBooks] = useState<IssuedBook[]>([]);
  const [pastBooks, setPastBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch student's issued books
   */
  useEffect(() => {
    const fetchBooks = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('issued_books')
          .select(`
            id,
            issue_date,
            due_date,
            return_date,
            fine_amount,
            books (title, author, category)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const current: IssuedBook[] = [];
        const past: IssuedBook[] = [];

        (data || []).forEach((item: any) => {
          const dueDate = parseISO(item.due_date);
          const isOverdue = !item.return_date && item.due_date < todayStr;
          const daysUntilDue = item.return_date
            ? 0
            : differenceInDays(dueDate, today);

          let fine = Number(item.fine_amount) || 0;
          if (isOverdue && !item.return_date) {
            fine = Math.abs(daysUntilDue) * FINE_PER_DAY;
          }

          const book: IssuedBook = {
            id: item.id,
            bookTitle: item.books?.title || 'Unknown Book',
            bookAuthor: item.books?.author || 'Unknown Author',
            category: item.books?.category || 'Unknown',
            issueDate: item.issue_date,
            dueDate: item.due_date,
            returnDate: item.return_date,
            isOverdue,
            daysUntilDue,
            fine,
          };

          if (item.return_date) {
            past.push(book);
          } else {
            current.push(book);
          }
        });

        setCurrentBooks(current);
        setPastBooks(past);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
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

  // Book card component for reuse
  const BookCard = ({ book, showReturn = false }: { book: IssuedBook; showReturn?: boolean }) => (
    <Card
      className={`dashboard-card ${
        book.isOverdue ? 'border-destructive/50 bg-destructive/5' : ''
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span className="px-2 py-1 bg-secondary rounded text-xs">{book.category}</span>
          {book.isOverdue && (
            <span className="badge-overdue border px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Overdue
            </span>
          )}
          {showReturn && book.returnDate && (
            <span className="badge-returned border px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Returned
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1">{book.bookTitle}</h3>
        <p className="text-muted-foreground mb-4">by {book.bookAuthor}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Issued:
            </span>
            <span>{format(parseISO(book.issueDate), 'MMM d, yyyy')}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due:
            </span>
            <span className={book.isOverdue ? 'text-destructive font-medium' : ''}>
              {format(parseISO(book.dueDate), 'MMM d, yyyy')}
            </span>
          </div>

          {showReturn && book.returnDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Returned:
              </span>
              <span>{format(parseISO(book.returnDate), 'MMM d, yyyy')}</span>
            </div>
          )}

          {!showReturn && !book.isOverdue && book.daysUntilDue >= 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time left:</span>
              <span className={book.daysUntilDue <= 3 ? 'text-warning font-medium' : ''}>
                {book.daysUntilDue === 0 ? 'Due today!' : `${book.daysUntilDue} days`}
              </span>
            </div>
          )}

          {book.fine > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-medium">Fine:</span>
              <span className="fine-amount">${book.fine.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">My Borrowed Books</h1>
          <p className="page-description">View your current and past book borrowings</p>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="current">
              Currently Borrowed ({currentBooks.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Borrowings ({pastBooks.length})
            </TabsTrigger>
          </TabsList>

          {/* Current Books Tab */}
          <TabsContent value="current">
            {currentBooks.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">
                  You don't have any books currently borrowed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Past Books Tab */}
          <TabsContent value="past">
            {pastBooks.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">
                  You haven't returned any books yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastBooks.map((book) => (
                  <BookCard key={book.id} book={book} showReturn />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Fine Information */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Fine Policy:</strong> Books are issued for 14 days. A fine of $1.00 per day
            is charged for overdue books. Please return books on time to avoid fines.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
