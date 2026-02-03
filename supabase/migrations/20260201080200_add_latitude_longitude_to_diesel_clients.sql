ALTER TABLE public.diesel_clients
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

CREATE INDEX idx_diesel_clients_lat_lng ON public.diesel_clients(latitude, longitude);
