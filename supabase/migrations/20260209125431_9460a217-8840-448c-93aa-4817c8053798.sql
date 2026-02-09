-- Add cover_image_url column to books table
ALTER TABLE public.books
ADD COLUMN cover_image_url TEXT DEFAULT NULL;