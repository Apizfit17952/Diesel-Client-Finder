-- Add archived_at column for soft-delete functionality
ALTER TABLE public.diesel_clients 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster queries on active vs archived leads
CREATE INDEX idx_diesel_clients_archived ON public.diesel_clients(archived_at);

-- Create unique constraint to prevent duplicate leads (same company name + state + user)
-- Only applies to non-archived leads
CREATE UNIQUE INDEX idx_diesel_clients_unique_company 
ON public.diesel_clients(user_id, LOWER(company_name), LOWER(state)) 
WHERE archived_at IS NULL;