-- Resume Analyzer Database Schema
-- Generated: $(date)

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
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
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

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS xxpj_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_type text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  reset_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_type, reset_date)
);

-- User-level usage summary
CREATE TABLE IF NOT EXISTS xxpj_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  daily_usage_count integer DEFAULT 0,
  monthly_usage_count integer DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  daily_reset_date timestamptz DEFAULT (date_trunc('day', now()) + interval '1 day'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feature flags for A/B testing and rollouts
CREATE TABLE IF NOT EXISTS xxpj_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name text UNIQUE NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_user_type text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription change history
CREATE TABLE IF NOT EXISTS xxpj_subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  old_stripe_price_id text,
  new_stripe_price_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  stripe_event_id text UNIQUE
);

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

-- Enable Row Level Security
ALTER TABLE xxpj_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xxpj_users
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON xxpj_users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON xxpj_users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON xxpj_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can delete their own profile" ON xxpj_users FOR DELETE TO authenticated USING (auth.uid() = id);

-- RLS Policies for xxpj_subscriptions
CREATE POLICY IF NOT EXISTS "Users can read own xxpj_subscriptions" ON xxpj_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own xxpj_subscriptions" ON xxpj_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for xxpj_usage
CREATE POLICY IF NOT EXISTS "Users can read own xxpj_usage" ON xxpj_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own xxpj_usage" ON xxpj_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own xxpj_usage" ON xxpj_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for resumes
CREATE POLICY IF NOT EXISTS "Users can read own resumes" ON resumes FOR SELECT TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can insert own resumes" ON resumes FOR INSERT TO authenticated WITH CHECK (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can update own resumes" ON resumes FOR UPDATE TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users can delete own resumes" ON resumes FOR DELETE TO authenticated USING (user_id IN (SELECT id FROM xxpj_users WHERE id = auth.uid()));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_xxpj_users_email ON xxpj_users(email);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_subscription_tier ON xxpj_users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_is_admin ON xxpj_users(is_admin) WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_user_id ON xxpj_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_status ON xxpj_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_plan_type ON xxpj_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_stripe_customer ON xxpj_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_user_feature ON xxpj_usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_reset_date ON xxpj_usage_tracking(reset_date);

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_xxpj_users_updated_at BEFORE UPDATE ON xxpj_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xxpj_subscriptions_updated_at BEFORE UPDATE ON xxpj_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xxpj_usage_updated_at BEFORE UPDATE ON xxpj_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(uuid) TO authenticated, anon;