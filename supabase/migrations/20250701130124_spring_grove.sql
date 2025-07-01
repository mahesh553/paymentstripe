/*
  # Add unique constraint to analyses table

  1. Changes
    - Add unique constraint on `resume_id` and `analysis_type` columns in `analyses` table
    - This enables proper upsert functionality in the database cache service

  2. Security
    - No changes to existing RLS policies
*/

-- Add unique constraint to analyses table for proper upsert functionality
ALTER TABLE public.analyses 
ADD CONSTRAINT analyses_resume_id_analysis_type_key 
UNIQUE (resume_id, analysis_type);