/*
  # Storage Policies for item-images bucket

  1. Security
    - Authenticated users can upload images to their own folder (user_id prefix)
    - Authenticated users can update/delete their own images
    - Public read access for all images (bucket is public)
*/

CREATE POLICY "Authenticated users can upload own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read access for item images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'item-images');
