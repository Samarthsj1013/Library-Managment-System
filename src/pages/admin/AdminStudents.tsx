/**
 * Admin Students Page
 * 
 * This page displays all registered students in the library system.
 * Features:
 * - View all students with their details
 * - See number of books currently issued to each student
 * - Search students by name or email
 */

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
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
import { Search, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 10;

// Student type definition
interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  usn: string;
  department: string;
  createdAt: string;
  booksIssued: number;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Fetch all students from the database
   */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Fetch student role records
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('id, user_id')
          .eq('role', 'student');

        if (rolesError) throw rolesError;

        // Fetch profiles for these users
        const userIds = (rolesData || []).map((r: any) => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email, usn, department, created_at')
          .in('user_id', userIds.length > 0 ? userIds : ['none']);

        const profileMap: Record<string, any> = {};
        (profilesData || []).forEach((p: any) => {
          profileMap[p.user_id] = p;
        });

        // Fetch issued books count for each student
        const { data: issuedData, error: issuedError } = await supabase
          .from('issued_books')
          .select('user_id')
          .is('return_date', null);

        if (issuedError) throw issuedError;

        // Count issued books per user
        const issuedCounts: Record<string, number> = {};
        issuedData?.forEach((item) => {
          issuedCounts[item.user_id] = (issuedCounts[item.user_id] || 0) + 1;
        });

        // Map data to Student type
        const studentsList: Student[] = (rolesData || []).map((role: any) => ({
          id: role.id,
          userId: role.user_id,
          name: profileMap[role.user_id]?.name || 'Unknown',
          email: profileMap[role.user_id]?.email || 'Unknown',
          usn: profileMap[role.user_id]?.usn || '-',
          department: profileMap[role.user_id]?.department || '-',
          createdAt: profileMap[role.user_id]?.created_at || new Date().toISOString(),
          booksIssued: issuedCounts[role.user_id] || 0,
        }));

        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  /**
   * Filter students based on search query
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, students]);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
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
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Registered Students</h1>
          <p className="page-description">View all students registered in the library system</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students Table */}
        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registered On</TableHead>
                <TableHead className="text-center">Books Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    {searchQuery
                      ? 'No students found matching your search.'
                      : 'No students registered yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.usn}</TableCell>
                    <TableCell>{student.department}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {format(new Date(student.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          student.booksIssued > 0
                            ? 'bg-accent/20 text-accent-foreground font-medium'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {student.booksIssued}
                      </span>
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
            Showing {paginatedStudents.length} of {filteredStudents.length} students
            {filteredStudents.length !== students.length && ` (filtered from ${students.length})`}
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
