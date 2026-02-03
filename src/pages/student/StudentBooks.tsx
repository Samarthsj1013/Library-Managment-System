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
import { Search, Loader2, BookOpen } from 'lucide-react';

// Book type definition
interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
}

export default function StudentBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  /**
   * Fetch all books from the database
   */
  useEffect(() => {
    const fetchBooks = async () => {
      try {
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
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

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
            Explore our library collection. Contact the librarian to borrow a book.
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
              <Card key={book.id} className="dashboard-card hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
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
                  <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-muted-foreground">by {book.author}</p>
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
            <strong>How to borrow a book:</strong> Visit the library desk and request the book
            from the librarian. They will issue the book to your account. Books are issued for
            14 days by default.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
