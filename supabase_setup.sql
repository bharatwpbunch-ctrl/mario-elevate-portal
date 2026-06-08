-- 1. Create the Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  occupation TEXT NOT NULL,
  experience_years INTEGER,
  location TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  skills TEXT[],
  current_company TEXT,
  current_designation TEXT,
  preferred_location TEXT,
  resume_url TEXT,
  resume_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS) on the table
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows only authenticated users to access and modify data
CREATE POLICY "Allow full access to authenticated users" ON candidates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Create the Storage Bucket for Resumes (if you prefer SQL over the UI)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('candidate-resumes', 'candidate-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS on the storage.objects table
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'candidate-resumes');

-- Allow anyone to read the resumes (or restrict to authenticated)
CREATE POLICY "Allow public reads on resumes" ON storage.objects
  FOR SELECT TO public 
  USING (bucket_id = 'candidate-resumes');
