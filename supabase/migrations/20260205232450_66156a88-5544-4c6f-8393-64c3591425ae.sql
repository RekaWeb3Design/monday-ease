-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org owners can upload logo" ON storage.objects;
DROP POLICY IF EXISTS "Org owners can update logo" ON storage.objects;
DROP POLICY IF EXISTS "Org owners can delete logo" ON storage.objects;

-- Create corrected INSERT policy with explicit type casting
CREATE POLICY "Org owners can upload logo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);

-- Create corrected UPDATE policy
CREATE POLICY "Org owners can update logo" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);

-- Add DELETE policy so owners can replace logos
CREATE POLICY "Org owners can delete logo" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'org-logos' AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id::text = (storage.foldername(name))[1]::text
    AND owner_id = auth.uid()
  )
);