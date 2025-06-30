/*
  # Fix foreign key constraint for resumes table

  1. Problem
    - The resumes table references users(id) 
    - But the application uses xxpj_users table
    - This causes foreign key constraint violations

  2. Solution
    - Update the foreign key constraint to reference xxpj_users(id)
    - Ensure RLS policies are updated accordingly
    - Maintain data integrity

  3. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint to xxpj_users
    - Update RLS policies to use xxpj_users
*/

-- Drop the existing foreign key constraint
ALTER TABLE resumes DROP CONSTRAINT IF EXISTS resumes_user_id_fkey;

-- Add new foreign key constraint to xxpj_users
ALTER TABLE resumes 
ADD CONSTRAINT resumes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES xxpj_users(id) ON DELETE CASCADE;

-- Update RLS policies to work with xxpj_users
DROP POLICY IF EXISTS "Users can read own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can insert own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can update own resumes" ON resumes;
DROP POLICY IF EXISTS "Users can delete own resumes" ON resumes;

-- Create new RLS policies that work with xxpj_users
CREATE POLICY "Users can read own resumes"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM xxpj_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own resumes"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM xxpj_users WHERE id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update own resumes"
  ON resumes
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM xxpj_users WHERE id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete own resumes"
  ON resumes
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM xxpj_users WHERE id = auth.uid()
    )
  );

-- Also fix the analyses table foreign key if it exists
DO $$
BEGIN
  -- Check if analyses table exists and has the wrong foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'analyses'
  ) THEN
    -- Update analyses table RLS policies
    DROP POLICY IF EXISTS "Users can read own analyses" ON analyses;
    DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;

    CREATE POLICY "Users can read own analyses"
      ON analyses
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM resumes r
          JOIN xxpj_users u ON r.user_id = u.id
          WHERE r.id = analyses.resume_id
          AND u.id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert own analyses"
      ON analyses
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM resumes r
          JOIN xxpj_users u ON r.user_id = u.id
          WHERE r.id = analyses.resume_id
          AND u.id = auth.uid()
        )
      );
  END IF;
END $$;

-- Also fix the job_matches table foreign key if it exists
DO $$
BEGIN
  -- Check if job_matches table exists and has the wrong foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'job_matches'
  ) THEN
    -- Update job_matches table RLS policies
    DROP POLICY IF EXISTS "Users can read own job matches" ON job_matches;
    DROP POLICY IF EXISTS "Users can insert own job matches" ON job_matches;

    CREATE POLICY "Users can read own job matches"
      ON job_matches
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM resumes r
          JOIN xxpj_users u ON r.user_id = u.id
          WHERE r.id = job_matches.resume_id
          AND u.id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert own job matches"
      ON job_matches
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM resumes r
          JOIN xxpj_users u ON r.user_id = u.id
          WHERE r.id = job_matches.resume_id
          AND u.id = auth.uid()
        )
      );
  END IF;
END $$;