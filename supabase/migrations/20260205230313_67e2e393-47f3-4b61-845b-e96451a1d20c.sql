-- Add logo_url column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create org-logos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Anyone can read avatars
CREATE POLICY "Anyone can read avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- RLS: Org owners can upload org logo
CREATE POLICY "Org owners can upload logo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

-- RLS: Org owners can update org logo
CREATE POLICY "Org owners can update logo" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1] 
    AND owner_id = auth.uid()
  )
);

-- RLS: Anyone can read org logos
CREATE POLICY "Anyone can read org logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'org-logos');