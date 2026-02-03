-- =============================================
-- Library Management System Database Schema
-- =============================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- =============================================
-- PROFILES TABLE - Stores user profile information
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER_ROLES TABLE - Stores user roles (admin/student)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION - Check user roles safely
-- This function bypasses RLS to prevent recursive policy checks
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Policy: Users can view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all roles (using security definer function)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- BOOKS TABLE - Stores book information
-- =============================================
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view books
CREATE POLICY "Authenticated users can view books"
ON public.books FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert books
CREATE POLICY "Admins can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update books
CREATE POLICY "Admins can update books"
ON public.books FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete books
CREATE POLICY "Admins can delete books"
ON public.books FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ISSUED_BOOKS TABLE - Tracks book issues and returns
-- =============================================
CREATE TABLE public.issued_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on issued_books
ALTER TABLE public.issued_books ENABLE ROW LEVEL SECURITY;

-- Students can view their own issued books
CREATE POLICY "Students can view own issued books"
ON public.issued_books FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all issued books
CREATE POLICY "Admins can view all issued books"
ON public.issued_books FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can issue books (insert)
CREATE POLICY "Admins can issue books"
ON public.issued_books FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update issued books (for returns)
CREATE POLICY "Admins can update issued books"
ON public.issued_books FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FUNCTION: Update timestamp on record change
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_issued_books_updated_at
    BEFORE UPDATE ON public.issued_books
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Calculate fine for overdue books
-- Fine is $1 per day after due date
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_fine(p_due_date DATE, p_return_date DATE)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    days_overdue INTEGER;
    fine_per_day DECIMAL(10, 2) := 1.00; -- $1 per day
BEGIN
    -- If return date is null or before/on due date, no fine
    IF p_return_date IS NULL OR p_return_date <= p_due_date THEN
        RETURN 0;
    END IF;
    
    -- Calculate days overdue
    days_overdue := p_return_date - p_due_date;
    
    RETURN days_overdue * fine_per_day;
END;
$$;

-- =============================================
-- FUNCTION: Handle new user signup - create profile
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    
    -- Assign default student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();