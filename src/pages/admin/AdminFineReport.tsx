/**
 * Admin Fine Report Page
 * 
 * Shows a summary of all fines collected, outstanding fines,
 * and a detailed table of all fine records.
 */

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, Loader2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const FINE_PER_DAY = 1.0;
const PAGE_SIZE = 10;

interface FineRecord {
  id: string;
  studentName: string;
  studentEmail: string;
  bookTitle: string;
  dueDate: string;
  returnDate: string | null;
  fineAmount: number;
  status: 'paid' | 'outstanding';
}

export default function AdminFineReport() {
  const [records, setRecords] = useState<FineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchFines = async () => {
      try {
        // Fetch all issued books
        const { data, error } = await supabase
          .from('issued_books')
          .select(`
            id,
            user_id,
            due_date,
            return_date,
            fine_amount,
            books (title)
          `)
          .order('due_date', { ascending: false });

        if (error) throw error;

        // Fetch profiles
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

        const fineRecords: FineRecord[] = (data || [])
          .map((item: any) => {
            let fine = Number(item.fine_amount) || 0;
            let status: 'paid' | 'outstanding' = 'paid';

            if (item.return_date) {
              // Returned - fine is finalized
              if (item.return_date > item.due_date) {
                fine = fine || differenceInDays(parseISO(item.return_date), parseISO(item.due_date)) * FINE_PER_DAY;
              }
              status = 'paid';
            } else if (item.due_date < today) {
              // Overdue and not returned - fine is accumulating
              fine = differenceInDays(new Date(), parseISO(item.due_date)) * FINE_PER_DAY;
              status = 'outstanding';
            } else {
              return null; // Not overdue, no fine
            }

            if (fine <= 0) return null;

            return {
              id: item.id,
              studentName: profileMap[item.user_id]?.name || 'Unknown',
              studentEmail: profileMap[item.user_id]?.email || '',
              bookTitle: item.books?.title || 'Unknown',
              dueDate: item.due_date,
              returnDate: item.return_date,
              fineAmount: fine,
              status,
            };
          })
          .filter(Boolean) as FineRecord[];

        setRecords(fineRecords);
      } catch (error) {
        console.error('Error fetching fines:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFines();
  }, []);

  const totalFines = records.reduce((sum, r) => sum + r.fineAmount, 0);
  const collectedFines = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.fineAmount, 0);
  const outstandingFines = records.filter(r => r.status === 'outstanding').reduce((sum, r) => sum + r.fineAmount, 0);

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
          <h1 className="page-title">Fine Report</h1>
          <p className="page-description">
            Track all fines — ₹{FINE_PER_DAY.toFixed(2)} per day after due date
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Fines</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold flex items-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {totalFines.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-accent-foreground" />
                Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent-foreground">₹{collectedFines.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {records.filter(r => r.status === 'paid').length} record(s)
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">₹{outstandingFines.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {records.filter(r => r.status === 'outstanding').length} record(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fine Records Table */}
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No fines recorded yet. Fines apply when books are returned after the due date.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.studentName}</p>
                        <p className="text-xs text-muted-foreground">{record.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{record.bookTitle}</TableCell>
                    <TableCell className="text-destructive font-medium">
                      {format(parseISO(record.dueDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {record.returnDate
                        ? format(parseISO(record.returnDate), 'MMM d, yyyy')
                        : <span className="text-muted-foreground">Not returned</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border',
                        record.status === 'paid' ? 'badge-returned' : 'badge-overdue'
                      )}>
                        {record.status === 'paid' ? (
                          <><CheckCircle className="h-3 w-3" /> Collected</>
                        ) : (
                          <><AlertCircle className="h-3 w-3" /> Outstanding</>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="fine-amount font-semibold">₹{record.fineAmount.toFixed(2)}</span>
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
            {records.length} fine record(s) total
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
      </div>
    </DashboardLayout>
  );
}
