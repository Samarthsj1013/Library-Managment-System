import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Inbox } from 'lucide-react';
import { format } from 'date-fns';

interface BookRequest {
  id: string;
  bookTitle: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

export default function StudentMyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('book_requests')
          .select('id, status, admin_note, created_at, book_id, books (title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRequests(
          (data || []).map((r: any) => ({
            id: r.id,
            bookTitle: r.books?.title || 'Unknown Book',
            status: r.status,
            adminNote: r.admin_note,
            createdAt: r.created_at,
          }))
        );
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'default';
    if (s === 'rejected') return 'destructive';
    return 'secondary';
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
        <div className="page-header">
          <h1 className="page-title">My Requests</h1>
          <p className="page-description">Track the status of your book requests</p>
        </div>

        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Admin Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    No requests yet. Browse books to submit a request.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.bookTitle}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)} className="capitalize">
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(req.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-muted-foreground">{req.adminNote || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
