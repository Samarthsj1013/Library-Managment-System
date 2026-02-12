/**
 * Admin Book Requests Page
 * 
 * Allows admins to view, approve, and reject student book requests.
 * Approving a request automatically issues the book to the student.
 */

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';


interface BookRequest {
  id: string;
  user_id: string;
  book_id: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  book_title?: string;
  book_author?: string;
  book_quantity?: number;
  student_name?: string;
  student_email?: string;
}

export default function AdminBookRequests() {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      // Fetch requests with book info
      const { data: reqData, error: reqError } = await supabase
        .from('book_requests')
        .select(`
          *,
          books (title, author, quantity)
        `)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      // Fetch profiles for user names
      const userIds = [...new Set((reqData || []).map((r: any) => r.user_id))];
      let profilesMap: Record<string, { name: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', userIds);

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.user_id] = { name: p.name, email: p.email };
          });
        }
      }

      const mapped: BookRequest[] = (reqData || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        book_id: r.book_id,
        status: r.status,
        admin_note: r.admin_note,
        created_at: r.created_at,
        book_title: r.books?.title,
        book_author: r.books?.author,
        book_quantity: r.books?.quantity,
        student_name: profilesMap[r.user_id]?.name || 'Unknown',
        student_email: profilesMap[r.user_id]?.email || '',
      }));

      setRequests(mapped);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /**
   * Approve a request: update status, create issued_books record, decrement quantity
   */
  const handleApprove = async (request: BookRequest) => {
    if (!request.book_quantity || request.book_quantity <= 0) {
      toast.error('Book is out of stock. Cannot approve.');
      return;
    }

    setProcessingId(request.id);
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('book_requests')
        .update({ status: 'approved', admin_note: 'Approved and issued' })
        .eq('id', request.id);
      if (updateError) throw updateError;

      // 2. Create issued_books record (14-day default)
      const today = format(new Date(), 'yyyy-MM-dd');
      const due = format(addDays(new Date(), 14), 'yyyy-MM-dd');
      const { error: issueError } = await supabase.from('issued_books').insert({
        user_id: request.user_id,
        book_id: request.book_id,
        issue_date: today,
        due_date: due,
      });
      if (issueError) throw issueError;

      // 3. Decrement book quantity
      const { error: qtyError } = await supabase
        .from('books')
        .update({ quantity: (request.book_quantity || 1) - 1 })
        .eq('id', request.book_id);
      if (qtyError) throw qtyError;

      toast.success('Request approved and book issued!');

      // Send in-app notification to student
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Book Request Approved',
        message: `Your request for "${request.book_title}" has been approved and issued to you.`,
      });

      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('book_requests')
        .update({ status: 'rejected', admin_note: 'Rejected by admin' })
        .eq('id', requestId);
      if (error) throw error;

      toast.success('Request rejected');

      // Send in-app notification to student
      const req = requests.find(r => r.id === requestId);
      if (req) {
        await supabase.from('notifications').insert({
          user_id: req.user_id,
          title: 'Book Request Rejected',
          message: `Your request for "${req.book_title}" has been rejected.`,
        });
      }

      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="badge-issued"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="badge-available"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="badge-overdue"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
        <div className="page-header">
          <h1 className="page-title">Book Requests</h1>
          <p className="page-description">
            Review and manage student book requests. Approving will auto-issue the book.
          </p>
        </div>

        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No book requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.student_name}</p>
                        <p className="text-sm text-muted-foreground">{req.student_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.book_title || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{req.book_author}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          {requests.filter((r) => r.status === 'pending').length} pending request(s)
        </p>
      </div>
    </DashboardLayout>
  );
}
