/**
 * Admin Issue Book Page
 * 
 * This page allows administrators to issue books to students.
 * Features:
 * - Select a student from the list
 * - Select an available book
 * - Set issue date and due date
 * - Validation to prevent issuing unavailable books
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, BookCopy } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

// Student type for dropdown
interface Student {
  userId: string;
  name: string;
  email: string;
}

// Book type for dropdown
interface Book {
  id: string;
  title: string;
  author: string;
  quantity: number;
}

export default function AdminIssueBook() {
  const navigate = useNavigate();

  // Form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));

  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /**
   * Fetch students and available books
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            profiles!user_roles_user_id_fkey (name, email)
          `)
          .eq('role', 'student');

        if (studentsError) throw studentsError;

        const studentsList: Student[] = (studentsData || []).map((s: any) => ({
          userId: s.user_id,
          name: s.profiles?.name || 'Unknown',
          email: s.profiles?.email || '',
        }));
        setStudents(studentsList);

        // Fetch available books (quantity > 0)
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('id, title, author, quantity')
          .gt('quantity', 0)
          .order('title');

        if (booksError) throw booksError;

        setBooks(booksData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Handle form submission to issue a book
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (!selectedBook) {
      toast.error('Please select a book');
      return;
    }
    if (new Date(dueDate) <= new Date(issueDate)) {
      toast.error('Due date must be after issue date');
      return;
    }

    // Check if book is still available
    const book = books.find((b) => b.id === selectedBook);
    if (!book || book.quantity <= 0) {
      toast.error('Selected book is no longer available');
      return;
    }

    setSaving(true);

    try {
      // Create issued_books record
      const { error: issueError } = await supabase.from('issued_books').insert({
        user_id: selectedStudent,
        book_id: selectedBook,
        issue_date: issueDate,
        due_date: dueDate,
      });

      if (issueError) throw issueError;

      // Decrease book quantity
      const { error: updateError } = await supabase
        .from('books')
        .update({ quantity: book.quantity - 1 })
        .eq('id', selectedBook);

      if (updateError) throw updateError;

      toast.success('Book issued successfully!');
      navigate('/admin/issued');
    } catch (error: any) {
      console.error('Error issuing book:', error);
      if (error.message?.includes('violates row-level security')) {
        toast.error('You do not have permission to issue books');
      } else {
        toast.error('Failed to issue book. Please try again.');
      }
    } finally {
      setSaving(false);
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
      <div className="animate-fade-in max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/issued')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Issued Books
        </Button>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookCopy className="h-5 w-5" />
              Issue Book to Student
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 && (
              <div className="bg-muted p-4 rounded-lg mb-6 text-center">
                <p className="text-muted-foreground">
                  No students registered yet. Students need to sign up first.
                </p>
              </div>
            )}

            {books.length === 0 && (
              <div className="bg-muted p-4 rounded-lg mb-6 text-center">
                <p className="text-muted-foreground">
                  No books available for issue. Add books or wait for returns.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Selection */}
              <div className="space-y-2">
                <Label htmlFor="student">Select Student *</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.userId} value={student.userId}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Book Selection */}
              <div className="space-y-2">
                <Label htmlFor="book">Select Book *</Label>
                <Select value={selectedBook} onValueChange={setSelectedBook}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a book" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} by {book.author} ({book.quantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={issueDate}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Default: 14 days from issue date. Fine rate: ₹1.00/day after due date.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={saving || students.length === 0 || books.length === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    <>
                      <BookCopy className="h-4 w-4 mr-2" />
                      Issue Book
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/issued')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
