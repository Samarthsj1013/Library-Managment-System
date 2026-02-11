/**
 * Admin Issued Books Page
 * 
 * This page displays all issued book records and allows admins to:
 * - View all issued books (current and past)
 * - Process book returns
 * - View overdue books and fines
 * - Filter by status (all, issued, returned, overdue)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Loader2, RotateCcw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

// Issued book type definition
interface IssuedBook {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentEmail: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  fineAmount: number;
  status: 'issued' | 'returned' | 'overdue';
}

// Fine calculation: ₹1 per day overdue
const FINE_PER_DAY = 1.0;

export default function AdminIssuedBooks() {
  const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<IssuedBook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [returnBookId, setReturnBookId] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Fetch all issued books from the database
   */
  const fetchIssuedBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('issued_books')
        .select(`
          id,
          user_id,
          book_id,
          issue_date,
          due_date,
          return_date,
          fine_amount,
          books (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all profiles for mapping
      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds.length > 0 ? userIds : ['none']);

      const profileMap: Record<string, { name: string; email: string }> = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.user_id] = { name: p.name, email: p.email };
      });

      const today = new Date().toISOString().split('T')[0];

      const mappedBooks: IssuedBook[] = (data || []).map((item: any) => {
        // Determine status
        let status: 'issued' | 'returned' | 'overdue' = 'issued';
        if (item.return_date) {
          status = 'returned';
        } else if (item.due_date < today) {
          status = 'overdue';
        }

        // Calculate fine for overdue books
        let fine = Number(item.fine_amount) || 0;
        if (status === 'overdue' && !item.return_date) {
          const daysOverdue = differenceInDays(new Date(), parseISO(item.due_date));
          fine = daysOverdue * FINE_PER_DAY;
        }

        return {
          id: item.id,
          userId: item.user_id,
          bookId: item.book_id,
          bookTitle: item.books?.title || 'Unknown Book',
          studentName: profileMap[item.user_id]?.name || 'Unknown Student',
          studentEmail: profileMap[item.user_id]?.email || '',
          issueDate: item.issue_date,
          dueDate: item.due_date,
          returnDate: item.return_date,
          fineAmount: fine,
          status,
        };
      });

      setIssuedBooks(mappedBooks);
      setFilteredBooks(mappedBooks);
    } catch (error) {
      console.error('Error fetching issued books:', error);
      toast.error('Failed to load issued books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuedBooks();
  }, []);

  /**
   * Filter books based on search query and status
   */
  useEffect(() => {
    let filtered = issuedBooks;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((book) => book.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.bookTitle.toLowerCase().includes(query) ||
          book.studentName.toLowerCase().includes(query) ||
          book.studentEmail.toLowerCase().includes(query)
      );
    }

    setFilteredBooks(filtered);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, issuedBooks]);

  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /**
   * Handle book return
   */
  const handleReturnBook = async () => {
    if (!returnBookId) return;

    const bookToReturn = issuedBooks.find((b) => b.id === returnBookId);
    if (!bookToReturn) return;

    setIsReturning(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate final fine
      let finalFine = 0;
      if (bookToReturn.dueDate < today) {
        const daysOverdue = differenceInDays(new Date(), parseISO(bookToReturn.dueDate));
        finalFine = daysOverdue * FINE_PER_DAY;
      }

      // Update issued_books record
      const { error: updateError } = await supabase
        .from('issued_books')
        .update({
          return_date: today,
          fine_amount: finalFine,
        })
        .eq('id', returnBookId);

      if (updateError) throw updateError;

      // Increase book quantity - get current quantity first
      {
        const { data: bookData } = await supabase
          .from('books')
          .select('quantity')
          .eq('id', bookToReturn.bookId)
          .single();

        if (bookData) {
          await supabase
            .from('books')
            .update({ quantity: bookData.quantity + 1 })
            .eq('id', bookToReturn.bookId);
        }
      }

      toast.success(
        finalFine > 0
          ? `Book returned. Fine collected: ₹${finalFine.toFixed(2)}`
          : 'Book returned successfully'
      );

      // Refresh the list
      fetchIssuedBooks();
    } catch (error) {
      console.error('Error returning book:', error);
      toast.error('Failed to process return');
    } finally {
      setIsReturning(false);
      setReturnBookId(null);
    }
  };

  /**
   * Get status badge classes
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return 'badge-issued border';
      case 'returned':
        return 'badge-returned border';
      case 'overdue':
        return 'badge-overdue border';
      default:
        return '';
    }
  };

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
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Issued Books</h1>
            <p className="page-description">Manage book issues and returns</p>
          </div>
          <Link to="/admin/issued/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Book
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by book title or student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="issued">Currently Issued</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issued Books Table */}
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fine</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No records found matching your filters.'
                      : 'No books have been issued yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.bookTitle}</TableCell>
                    <TableCell>
                      <div>
                        <p>{book.studentName}</p>
                        <p className="text-xs text-muted-foreground">{book.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(parseISO(book.issueDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          book.status === 'overdue' && 'text-destructive font-medium'
                        )}
                      >
                        {format(parseISO(book.dueDate), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {book.returnDate
                        ? format(parseISO(book.returnDate), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('px-2 py-1 rounded-full text-xs', getStatusBadge(book.status))}>
                        {book.status === 'issued' && 'Issued'}
                        {book.status === 'returned' && 'Returned'}
                        {book.status === 'overdue' && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {book.fineAmount > 0 ? (
                        <span className="fine-amount">₹{book.fineAmount.toFixed(2)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!book.returnDate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnBookId(book.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {paginatedBooks.length} of {filteredBooks.length} records
            {filteredBooks.length !== issuedBooks.length && ` (filtered from ${issuedBooks.length})`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Return Confirmation Dialog */}
        <AlertDialog open={!!returnBookId} onOpenChange={() => setReturnBookId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Process Book Return?</AlertDialogTitle>
              <AlertDialogDescription>
                {returnBookId && (() => {
                  const book = issuedBooks.find((b) => b.id === returnBookId);
                  if (!book) return 'Book not found';
                  
                  const today = new Date().toISOString().split('T')[0];
                  if (book.dueDate < today) {
                    const daysOverdue = differenceInDays(new Date(), parseISO(book.dueDate));
                    const fine = daysOverdue * FINE_PER_DAY;
                    return (
                      <>
                        This book is <strong>{daysOverdue} days overdue</strong>.
                        <br />
                        Fine to collect: <strong className="text-destructive">₹{fine.toFixed(2)}</strong>
                        <br />
                        (Rate: ₹{FINE_PER_DAY.toFixed(2)} per day)
                      </>
                    );
                  }
                  return 'This will mark the book as returned and increase its available quantity.';
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReturnBook} disabled={isReturning}>
                {isReturning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Return'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
