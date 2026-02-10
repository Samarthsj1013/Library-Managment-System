/**
 * Student Books Page
 * 
 * This page allows students to browse and search the library's book collection.
 * Features:
 * - View all available books
 * - Search by title, author, or category
 * - Filter by category
 * - See availability status
 */

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Loader2, BookOpen, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';

// Book type definition
interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  cover_image_url: string | null;
}

export default function StudentBooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [requestedBookIds, setRequestedBookIds] = useState<Set<string>>(new Set());
  const [requestingBookId, setRequestingBookId] = useState<string | null>(null);

  /**
   * Fetch all books from the database
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch books
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('title', { ascending: true });

        if (error) throw error;

        setBooks(data || []);
        setFilteredBooks(data || []);

        // Extract unique categories
        const uniqueCategories = [...new Set((data || []).map((b) => b.category))];
        setCategories(uniqueCategories);

        // Fetch user's existing requests (pending/approved)
        if (user) {
          const { data: reqData } = await supabase
            .from('book_requests')
            .select('book_id')
            .eq('user_id', user.id)
            .in('status', ['pending', 'approved']);

          if (reqData) {
            setRequestedBookIds(new Set(reqData.map((r) => r.book_id)));
          }
        }
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  /**
   * Filter books based on search query and category
   */
  useEffect(() => {
    let filtered = books;

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((book) => book.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
      );
    }

    setFilteredBooks(filtered);
  }, [searchQuery, categoryFilter, books]);

  /**
   * Handle book request (max 3 pending)
   */
  const handleRequestBook = async (bookId: string) => {
    if (!user) return;

    const pendingCount = requestedBookIds.size;
    if (pendingCount >= 3) {
      toast.error('You can have a maximum of 3 active requests.');
      return;
    }

    setRequestingBookId(bookId);
    try {
      const { error } = await supabase.from('book_requests').insert({
        user_id: user.id,
        book_id: bookId,
      });

      if (error) throw error;

      setRequestedBookIds((prev) => new Set([...prev, bookId]));
      toast.success('Book request submitted! The admin will review it.');
    } catch (error: any) {
      console.error('Error requesting book:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setRequestingBookId(null);
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
        <div className="page-header">
          <h1 className="page-title">Browse Books</h1>
          <p className="page-description">
            Explore our library collection. Click "Request" to borrow a book — the admin will review and approve it.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">
              {searchQuery || categoryFilter !== 'all'
                ? 'No books found matching your search.'
                : 'No books available in the library yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="dashboard-card hover:border-primary/50 transition-colors overflow-hidden">
                {book.cover_image_url ? (
                  <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                    <img
                      src={book.cover_image_url}
                      alt={`Cover of ${book.title}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] w-full bg-muted flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">{book.category}</Badge>
                    <span
                      className={`text-sm font-medium ${
                        book.quantity === 0
                          ? 'quantity-zero'
                          : book.quantity <= 2
                          ? 'quantity-low'
                          : 'quantity-available'
                      }`}
                    >
                      {book.quantity === 0 ? 'Unavailable' : `${book.quantity} available`}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">by {book.author}</p>
                  {requestedBookIds.has(book.id) ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      Requested
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={book.quantity === 0 || requestingBookId === book.id}
                      onClick={() => handleRequestBook(book.id)}
                    >
                      {requestingBookId === book.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <SendHorizonal className="h-4 w-4 mr-1" />
                      )}
                      {book.quantity === 0 ? 'Unavailable' : 'Request Book'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Book Count */}
        <p className="text-sm text-muted-foreground mt-6">
          Showing {filteredBooks.length} of {books.length} books
        </p>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>How to borrow a book:</strong> Click the "Request Book" button on any
            available book. The admin will review your request and approve it. Once approved,
            the book will automatically appear in your "My Books" section. You can have up to
            3 pending requests at a time. Books are issued for 14 days by default.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
