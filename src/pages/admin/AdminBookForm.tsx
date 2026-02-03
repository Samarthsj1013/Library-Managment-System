/**
 * Admin Book Form Page
 * 
 * This page handles both adding new books and editing existing books.
 * Features:
 * - Form validation using Zod
 * - Auto-fill for editing existing books
 * - Clear error messages
 * - Quantity cannot be negative
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

// Book categories for the dropdown
const BOOK_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Biography',
  'Self-Help',
  'Education',
  'Reference',
  'Other',
];

// Form validation schema
const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  author: z.string().min(1, 'Author is required').max(100, 'Author name is too long'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative').max(9999, 'Quantity is too high'),
});

export default function AdminBookForm() {
  const navigate = useNavigate();
  const { bookId } = useParams();
  const isEditing = !!bookId;

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  /**
   * Fetch book data when editing
   */
  useEffect(() => {
    if (isEditing) {
      const fetchBook = async () => {
        try {
          const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setTitle(data.title);
            setAuthor(data.author);
            setCategory(data.category);
            setQuantity(data.quantity);
          } else {
            toast.error('Book not found');
            navigate('/admin/books');
          }
        } catch (error) {
          console.error('Error fetching book:', error);
          toast.error('Failed to load book data');
          navigate('/admin/books');
        } finally {
          setLoading(false);
        }
      };

      fetchBook();
    }
  }, [bookId, isEditing, navigate]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const result = bookSchema.safeParse({
      title: title.trim(),
      author: author.trim(),
      category,
      quantity,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);

    try {
      if (isEditing) {
        // Update existing book
        const { error } = await supabase
          .from('books')
          .update({
            title: title.trim(),
            author: author.trim(),
            category,
            quantity,
          })
          .eq('id', bookId);

        if (error) throw error;
        toast.success('Book updated successfully');
      } else {
        // Add new book
        const { error } = await supabase.from('books').insert({
          title: title.trim(),
          author: author.trim(),
          category,
          quantity,
        });

        if (error) throw error;
        toast.success('Book added successfully');
      }

      navigate('/admin/books');
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error(isEditing ? 'Failed to update book' : 'Failed to add book');
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
          onClick={() => navigate('/admin/books')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Books
        </Button>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Book' : 'Add New Book'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Field */}
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter book title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Author Field */}
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  placeholder="Enter author name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
              </div>

              {/* Category Field */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Field */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  max="9999"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Number of copies available in the library
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? 'Update Book' : 'Add Book'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/books')}
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
