/*
  # Create resume analysis tables

  1. New Tables
    - `resumes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `filename` (text)
      - `file_path` (text)
      - `file_size` (integer)
      - `file_type` (text)
      - `original_text` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `analyses`
      - `id` (uuid, primary key)
      - `resume_id` (uuid, foreign key to resumes)
      - `analysis_type` (text)
      - `results` (jsonb)
      - `score` (integer, nullable)
      - `created_at` (timestamp)

    - `job_matches`
      - `id` (uuid, primary key)
      - `resume_id` (uuid, foreign key to resumes)
      - `job_description` (text)
      - `match_score` (integer)
      - `matching_skills` (text array)
      - `missing_skills` (text array)
      - `recommendations` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  original_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own resumes"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for resumes table
CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  analysis_type text NOT NULL DEFAULT 'general',
  results jsonb NOT NULL,
  score integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analyses"
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

CREATE POLICY "Users can insert own analyses"
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

-- Create job_matches table
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  job_description text NOT NULL,
  match_score integer NOT NULL,
  matching_skills text[] DEFAULT '{}',
  missing_skills text[] DEFAULT '{}',
  recommendations jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own job matches"
  ON job_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes
      WHERE resumes.id = job_matches.resume_id
      AND resumes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own job matches"
  ON job_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resumes
      WHERE resumes.id = job_matches.resume_id
      AND resumes.user_id = auth.uid()
    )
  );

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload own resumes"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own resumes"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resumes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);