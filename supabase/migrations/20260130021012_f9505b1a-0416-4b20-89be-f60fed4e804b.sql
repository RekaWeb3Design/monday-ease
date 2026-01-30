-- Add RLS policy for self-registration
-- Allows authenticated users to insert their own pending membership request
CREATE POLICY "Users can request to join orgs"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'member' 
  AND status = 'pending'
);