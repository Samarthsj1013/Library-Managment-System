
-- Fix: All RLS policies were RESTRICTIVE (no access). Recreate as PERMISSIVE.

-- Books table
DROP POLICY IF EXISTS "Authenticated users can view books" ON public.books;
DROP POLICY IF EXISTS "Admins can insert books" ON public.books;
DROP POLICY IF EXISTS "Admins can update books" ON public.books;
DROP POLICY IF EXISTS "Admins can delete books" ON public.books;

CREATE POLICY "Authenticated users can view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update books" ON public.books FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete books" ON public.books FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- issued_books table
DROP POLICY IF EXISTS "Students can view own issued books" ON public.issued_books;
DROP POLICY IF EXISTS "Admins can view all issued books" ON public.issued_books;
DROP POLICY IF EXISTS "Admins can issue books" ON public.issued_books;
DROP POLICY IF EXISTS "Admins can update issued books" ON public.issued_books;

CREATE POLICY "Students can view own issued books" ON public.issued_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all issued books" ON public.issued_books FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can issue books" ON public.issued_books FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update issued books" ON public.issued_books FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles table - also add admin view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles table
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
