-- Ticket images are stored in the private ticket-attachments bucket.
-- The legacy URL column is unused and would allow a second, less-controlled image path.
alter table public.tickets drop column if exists photo_url;
