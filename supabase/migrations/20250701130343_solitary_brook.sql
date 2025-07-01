/*
  # Fix RLS policies for analyses table

  1. Security Updates
    - Drop existing restrictive policies on analyses table
    - Create new policies that properly allow users to manage their own analysis data
    - Ensure users can insert, update, and select analyses for their own resumes

  2. Policy Changes
    - `analyses_insert_own`: Allow users to insert analyses for their own resumes
    - `analyses_update_own`: Allow users to update analyses for their own resumes  
    - `analyses_select_own`: Allow users to view analyses for their own resumes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "analyses_insert_own" ON analyses;
DROP POLICY IF EXISTS "analyses_select_own" ON analyses;
DROP POLICY IF EXISTS "analyses_update_own" ON analyses;

-- Create new policies with proper expressions
CREATE POLICY "analyses_insert_own"
  ON analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.id = analyses.resume_id 
      AND resumes.user_id = auth.uid()
    )
  );

CREATE POLICY "analyses_update_own"
  ON analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.id = analyses.resume_id 
      AND resumes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.id = analyses.resume_id 
      AND resumes.user_id = auth.uid()
    )
  );

CREATE POLICY "analyses_select_own"
  ON analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.id = analyses.resume_id 
      AND resumes.user_id = auth.uid()
    )
  );