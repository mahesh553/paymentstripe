-- Resume Analyzer Database Schema - Fixed Migration
-- Generated: 2025-01-29

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core user management table
CREATE TABLE IF NOT EXISTS xxpj_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  subscription_tier text NOT NULL DEFAULT 'free',
  email_verified boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  preferences jsonb DEFAULT '{}',
  timezone text DEFAULT 'UTC',
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscription management
CREATE TABLE IF NOT EXISTS xxpj_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan_type text NOT NULL DEFAULT 'free',
  subscription_type text, -- Compatibility column
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb DEFAULT '{}',
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraints if they don't exist
DO $$
BEGIN
  -- Check and add unique constraint on user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_subscriptions_user_id_key' 
    AND conrelid = 'xxpj_subscriptions'::regclass
  ) THEN
    ALTER TABLE xxpj_subscriptions ADD CONSTRAINT xxpj_subscriptions_user_id_key UNIQUE (user_id);
  END IF;

  -- Check and add unique constraint on stripe_customer_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_subscriptions_stripe_customer_id_key' 
    AND conrelid = 'xxpj_subscriptions'::regclass
  ) THEN
    ALTER TABLE xxpj_subscriptions ADD CONSTRAINT xxpj_subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;

  -- Check and add unique constraint on stripe_subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_subscriptions_stripe_subscription_id_key' 
    AND conrelid = 'xxpj_subscriptions'::regclass
  ) THEN
    ALTER TABLE xxpj_subscriptions ADD CONSTRAINT xxpj_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
  END IF;
END $$;

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS xxpj_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_type text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  reset_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for usage tracking if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_usage_tracking_user_id_feature_type_reset_date_key' 
    AND conrelid = 'xxpj_usage_tracking'::regclass
  ) THEN
    ALTER TABLE xxpj_usage_tracking 
    ADD CONSTRAINT xxpj_usage_tracking_user_id_feature_type_reset_date_key 
    UNIQUE (user_id, feature_type, reset_date);
  END IF;
END $$;

-- User-level usage summary
CREATE TABLE IF NOT EXISTS xxpj_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_usage_count integer DEFAULT 0,
  monthly_usage_count integer DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  daily_reset_date timestamptz DEFAULT (date_trunc('day', now()) + interval '1 day'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for xxpj_usage if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_usage' 
    AND conrelid = 'xxpj_usage'::regclass
  ) THEN
    ALTER TABLE xxpj_usage ADD CONSTRAINT unique_user_usage UNIQUE (user_id);
  END IF;
END $$;

-- Feature flags for A/B testing and rollouts
CREATE TABLE IF NOT EXISTS xxpj_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_user_type text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint for feature flags if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_feature_flags_flag_name_key' 
    AND conrelid = 'xxpj_feature_flags'::regclass
  ) THEN
    ALTER TABLE xxpj_feature_flags ADD CONSTRAINT xxpj_feature_flags_flag_name_key UNIQUE (flag_name);
  END IF;
END $$;

-- Subscription change history
CREATE TABLE IF NOT EXISTS xxpj_subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  old_stripe_price_id text,
  new_stripe_price_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  stripe_event_id text
);

-- Add unique constraint for subscription history if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xxpj_subscription_history_stripe_event_id_key' 
    AND conrelid = 'xxpj_subscription_history'::regclass
  ) THEN
    ALTER TABLE xxpj_subscription_history 
    ADD CONSTRAINT xxpj_subscription_history_stripe_event_id_key UNIQUE (stripe_event_id);
  END IF;
END $$;

-- Resume file storage
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES xxpj_users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  original_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Resume analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  analysis_type text NOT NULL DEFAULT 'general',
  results jsonb NOT NULL,
  score integer,
  created_at timestamptz DEFAULT now()
);

-- Job matching results
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

-- Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  -- Enable RLS on tables if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_users' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_users ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_subscriptions' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_usage_tracking' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_usage_tracking ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_usage' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_usage ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_feature_flags' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_feature_flags ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xxpj_subscription_history' AND relrowsecurity = true) THEN
    ALTER TABLE xxpj_subscription_history ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'resumes' AND relrowsecurity = true) THEN
    ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analyses' AND relrowsecurity = true) THEN
    ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'job_matches' AND relrowsecurity = true) THEN
    ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- xxpj_users policies
  DROP POLICY IF EXISTS "Users can view their own profile" ON xxpj_users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON xxpj_users;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON xxpj_users;
  DROP POLICY IF EXISTS "Users can delete their own profile" ON xxpj_users;
  DROP POLICY IF EXISTS "Users can view their own profile (RLS)." ON xxpj_users;
  DROP POLICY IF EXISTS "Users can update their own profile (RLS)." ON xxpj_users;
  DROP POLICY IF EXISTS "Users can create their own profile." ON xxpj_users;
  DROP POLICY IF EXISTS "Users can delete their own profile (RLS)." ON xxpj_users;
  DROP POLICY IF EXISTS "Admins can manage all xxpj_users (RLS)." ON xxpj_users;
  
  -- xxpj_subscriptions policies
  DROP POLICY IF EXISTS "Users can read own xxpj_subscriptions" ON xxpj_subscriptions;
  DROP POLICY IF EXISTS "Users can update own xxpj_subscriptions" ON xxpj_subscriptions;
  DROP POLICY IF EXISTS "Users can read their own xxpj_subscription." ON xxpj_subscriptions;
  DROP POLICY IF EXISTS "Users can update their own xxpj_subscription." ON xxpj_subscriptions;
  DROP POLICY IF EXISTS "Admins can manage all xxpj_subscriptions." ON xxpj_subscriptions;
  
  -- xxpj_usage policies
  DROP POLICY IF EXISTS "Users can read own xxpj_usage" ON xxpj_usage;
  DROP POLICY IF EXISTS "Users can insert own xxpj_usage" ON xxpj_usage;
  DROP POLICY IF EXISTS "Users can update own xxpj_usage" ON xxpj_usage;
  DROP POLICY IF EXISTS "Users can create their own usage entry." ON xxpj_usage;
  DROP POLICY IF EXISTS "Users can read their own usage." ON xxpj_usage;
  DROP POLICY IF EXISTS "Users can update their own usage." ON xxpj_usage;
  
  -- xxpj_usage_tracking policies
  DROP POLICY IF EXISTS "Admins can manage all xxpj_usage_tracking records." ON xxpj_usage_tracking;
  DROP POLICY IF EXISTS "Users can insert their own xxpj_usage entry." ON xxpj_usage_tracking;
  DROP POLICY IF EXISTS "Users can read their own xxpj_usage." ON xxpj_usage_tracking;
  DROP POLICY IF EXISTS "Users can update their own xxpj_usage." ON xxpj_usage_tracking;
  
  -- resumes policies
  DROP POLICY IF EXISTS "Users can read own resumes" ON resumes;
  DROP POLICY IF EXISTS "Users can insert own resumes" ON resumes;
  DROP POLICY IF EXISTS "Users can update own resumes" ON resumes;
  DROP POLICY IF EXISTS "Users can delete own resumes" ON resumes;
  
  -- analyses policies
  DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;
  DROP POLICY IF EXISTS "Users can read own analyses" ON analyses;
  
  -- job_matches policies
  DROP POLICY IF EXISTS "Users can insert own job matches" ON job_matches;
  DROP POLICY IF EXISTS "Users can read own job matches" ON job_matches;
END $$;

-- Create RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON xxpj_users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON xxpj_users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON xxpj_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON xxpj_users FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can read own subscriptions" ON xxpj_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own subscriptions" ON xxpj_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read own usage" ON xxpj_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON xxpj_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON xxpj_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read own usage tracking" ON xxpj_usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own usage tracking" ON xxpj_usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own usage tracking" ON xxpj_usage_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can read own resumes" ON resumes FOR SELECT TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can insert own resumes" ON resumes FOR INSERT TO authenticated WITH CHECK (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can update own resumes" ON resumes FOR UPDATE TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY "Users can delete own resumes" ON resumes FOR DELETE TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));

CREATE POLICY "Users can read own analyses" ON analyses FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM resumes r
    JOIN xxpj_users u ON r.user_id = u.id
    WHERE r.id = analyses.resume_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can insert own analyses" ON analyses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM resumes r
    JOIN xxpj_users u ON r.user_id = u.id
    WHERE r.id = analyses.resume_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can read own job matches" ON job_matches FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM resumes r
    JOIN xxpj_users u ON r.user_id = u.id
    WHERE r.id = job_matches.resume_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can insert own job matches" ON job_matches FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM resumes r
    JOIN xxpj_users u ON r.user_id = u.id
    WHERE r.id = job_matches.resume_id AND u.id = auth.uid()
  )
);

-- Performance indexes (only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_xxpj_users_email ON xxpj_users(email);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_subscription_tier ON xxpj_users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_is_admin ON xxpj_users(is_admin) WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_user_id ON xxpj_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_status ON xxpj_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_plan_type ON xxpj_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_stripe_customer ON xxpj_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_user_feature ON xxpj_usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_reset_date ON xxpj_usage_tracking(reset_date);

CREATE INDEX IF NOT EXISTS idx_xxpj_usage_user_id ON xxpj_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_usage_daily_reset ON xxpj_usage(daily_reset_date);

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers and recreate them
DROP TRIGGER IF EXISTS update_xxpj_users_updated_at ON xxpj_users;
DROP TRIGGER IF EXISTS update_xxpj_subscriptions_updated_at ON xxpj_subscriptions;
DROP TRIGGER IF EXISTS update_xxpj_usage_updated_at ON xxpj_usage;
DROP TRIGGER IF EXISTS update_xxpj_usage_tracking_updated_at ON xxpj_usage_tracking;
DROP TRIGGER IF EXISTS update_resumes_updated_at ON resumes;

CREATE TRIGGER update_xxpj_users_updated_at BEFORE UPDATE ON xxpj_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xxpj_subscriptions_updated_at BEFORE UPDATE ON xxpj_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xxpj_usage_updated_at BEFORE UPDATE ON xxpj_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xxpj_usage_tracking_updated_at BEFORE UPDATE ON xxpj_usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Core database functions
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid uuid DEFAULT NULL)
RETURNS TABLE (
  is_premium boolean,
  is_admin boolean,
  plan_type text,
  status text
) AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT false, false, 'free'::text, 'inactive'::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND (s.plan_type = 'premium' OR s.subscription_type = 'premium') THEN true
      ELSE false
    END as is_premium,
    COALESCE(u.is_admin, false) as is_admin,
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'admin'
      ELSE COALESCE(s.plan_type, s.subscription_type, 'free')
    END as plan_type,
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'active'
      ELSE COALESCE(s.status, 'inactive')
    END as status
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 'free'::text, 'inactive'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create track_feature_usage function
CREATE OR REPLACE FUNCTION track_feature_usage(
  user_uuid uuid,
  feature_name text
) RETURNS boolean AS $$
DECLARE
  current_usage integer;
  usage_limit integer;
  is_premium boolean;
  is_admin boolean;
  reset_period timestamptz;
  user_exists boolean;
BEGIN
  -- Check if user exists in xxpj_users
  SELECT EXISTS(SELECT 1 FROM xxpj_users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Try to create xxpj_users record from auth.users if it exists
    INSERT INTO xxpj_users (
      id, email, full_name, is_admin, subscription_tier, 
      email_verified, onboarding_completed, preferences, timezone
    )
    SELECT 
      au.id, au.email, 
      COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
      false, 'free', 
      au.email_confirmed_at IS NOT NULL, false, '{}', 'UTC'
    FROM auth.users au
    WHERE au.id = user_uuid
    ON CONFLICT (id) DO NOTHING;
    
    -- Check again
    SELECT EXISTS(SELECT 1 FROM xxpj_users WHERE id = user_uuid) INTO user_exists;
    
    IF NOT user_exists THEN
      RETURN false;
    END IF;
  END IF;

  -- Get user subscription status
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND (s.plan_type = 'premium' OR s.subscription_type = 'premium') THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- Admin users have unlimited access
  IF is_admin = true THEN
    RETURN true;
  END IF;

  -- Set usage limits and reset periods
  IF is_premium THEN
    -- Premium users: daily limits of 20
    usage_limit := 20;
    reset_period := date_trunc('day', now()) + interval '1 day';
  ELSE
    -- Free users: monthly limits of 1 for all features
    usage_limit := 1;
    reset_period := date_trunc('month', now()) + interval '1 month';
  END IF;

  -- Get current usage within the reset period
  SELECT COALESCE(usage_count, 0)
  INTO current_usage
  FROM xxpj_usage_tracking
  WHERE user_id = user_uuid 
    AND feature_type = feature_name
    AND reset_date > now();

  -- If no record found, default to 0
  IF current_usage IS NULL THEN
    current_usage := 0;
  END IF;

  -- Check if user has exceeded limit
  IF current_usage >= usage_limit THEN
    RETURN false;
  END IF;

  -- Increment usage counter
  INSERT INTO xxpj_usage_tracking (user_id, feature_type, usage_count, reset_date)
  VALUES (user_uuid, feature_name, 1, reset_period)
  ON CONFLICT (user_id, feature_type, reset_date)
  DO UPDATE SET 
    usage_count = xxpj_usage_tracking.usage_count + 1,
    updated_at = now();

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error in track_feature_usage: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_feature_limits function
CREATE OR REPLACE FUNCTION get_feature_limits(user_uuid uuid)
RETURNS TABLE (
  feature_type text,
  usage_limit integer,
  current_usage integer,
  reset_date timestamptz,
  is_unlimited boolean
) AS $$
DECLARE
  is_premium boolean;
  is_admin boolean;
  user_exists boolean;
BEGIN
  -- Check if user exists in xxpj_users
  SELECT EXISTS(SELECT 1 FROM xxpj_users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Return empty result for non-existent users
    RETURN;
  END IF;

  -- Get user subscription status
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND (s.plan_type = 'premium' OR s.subscription_type = 'premium') THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- Return limits based on user type
  IF is_admin = true THEN
    -- Admin: unlimited everything
    RETURN QUERY
    SELECT 
      f.feature::text,
      -1::integer as usage_limit,
      0::integer as current_usage,
      null::timestamptz as reset_date,
      true::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis'),
      ('job_matching'),
      ('keyword_analysis'),
      ('restructure_guide')
    ) AS f(feature);
  ELSIF is_premium THEN
    -- Premium: 20 per day
    RETURN QUERY
    SELECT 
      f.feature::text,
      20::integer as usage_limit,
      COALESCE(ut.usage_count, 0)::integer as current_usage,
      COALESCE(ut.reset_date, date_trunc('day', now()) + interval '1 day')::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis'),
      ('job_matching'),
      ('keyword_analysis'),
      ('restructure_guide')
    ) AS f(feature)
    LEFT JOIN xxpj_usage_tracking ut ON ut.user_id = user_uuid 
      AND ut.feature_type = f.feature 
      AND ut.reset_date > now();
  ELSE
    -- Free: 1 per month for all features
    RETURN QUERY
    SELECT 
      f.feature::text,
      1::integer as usage_limit,
      COALESCE(ut.usage_count, 0)::integer as current_usage,
      COALESCE(ut.reset_date, date_trunc('month', now()) + interval '1 month')::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis'),
      ('job_matching'),
      ('keyword_analysis'),
      ('restructure_guide')
    ) AS f(feature)
    LEFT JOIN xxpj_usage_tracking ut ON ut.user_id = user_uuid 
      AND ut.feature_type = f.feature 
      AND ut.reset_date > now();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE LOG 'Error in get_feature_limits: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_feature_usage(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_feature_limits(uuid) TO authenticated, anon;

-- Backfill missing subscription records for existing users
INSERT INTO xxpj_subscriptions (
  user_id,
  status,
  plan_type,
  subscription_type,
  metadata,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'inactive',
  'free',
  'free',
  jsonb_build_object(
    'signup_date', u.created_at,
    'signup_source', 'web',
    'backfilled', true
  ),
  u.created_at,
  u.updated_at
FROM xxpj_users u
LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Insert default feature flags if they don't exist
INSERT INTO xxpj_feature_flags (flag_name, is_enabled, rollout_percentage, target_user_type, metadata)
VALUES 
  ('job_matching', true, 100, '{"premium", "admin"}', '{"description": "Job-specific resume analysis"}'),
  ('keyword_analysis', true, 100, '{"premium", "admin"}', '{"description": "Advanced keyword analysis"}'),
  ('restructure_guide', true, 100, '{"premium", "admin"}', '{"description": "Resume restructure guide"}'),
  ('resume_history', true, 100, '{"premium", "admin"}', '{"description": "Resume history tracking"}'),
  ('export_reports', false, 0, '{"premium", "admin"}', '{"description": "Export analysis reports"}'),
  ('ai_suggestions', true, 100, '{"premium", "admin"}', '{"description": "AI-powered suggestions"}'),
  ('bulk_analysis', false, 0, '{"admin"}', '{"description": "Bulk resume analysis"}')
ON CONFLICT (flag_name) DO NOTHING;