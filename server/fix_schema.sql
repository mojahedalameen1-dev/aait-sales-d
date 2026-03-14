-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
    id SERIAL PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type_label TEXT DEFAULT 'أخرى',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add client_id column to meeting_preps if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'meeting_preps' AND COLUMN_NAME = 'client_id') THEN
        ALTER TABLE public.meeting_preps ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security (RLS) - assuming it's desired based on standard Supabase setup
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_preps ENABLE ROW LEVEL SECURITY;

-- Create policies (permissive for now as per project context if not specified otherwise)
-- Note: In a real production app, these should be more restrictive
CREATE POLICY "Allow all access to files" ON public.files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to meeting_preps" ON public.meeting_preps FOR ALL USING (true) WITH CHECK (true);
