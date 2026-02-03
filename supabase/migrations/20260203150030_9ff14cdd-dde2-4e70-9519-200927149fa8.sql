-- Fix function search path for calculate_fine function
CREATE OR REPLACE FUNCTION public.calculate_fine(p_due_date DATE, p_return_date DATE)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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