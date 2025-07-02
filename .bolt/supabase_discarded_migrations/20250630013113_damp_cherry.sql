/*
  # Fix Column and Datatype Inconsistencies

  1. Column Issues Found:
    - xxpj_feature_flags has both flag_name and feature_name (redundant)
    - xxpj_usage_tracking.reset_date should be timestamptz not date
    - Missing xxpj_subscriptions table columns
    - Missing xxpj_usage table (referenced in functions)

  2. Fixes:
    - Standardize column names and types
    - Add missing tables and columns
    - Update functions to use correct table structure
    - Ensure data consistency
*/

-- Fix xxpj_feature_flags table inconsistencies
DO $$
BEGIN
  -- Remove duplicate feature_name column if it exists (keep flag_name as primary)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xxpj_feature_flags' AND column_name = 'feature_name'
  ) THEN
    -- Copy data from feature_name to flag_name if flag_name is null
    UPDATE xxpj_feature_flags 
    SET flag_name = feature_name 
    WHERE flag_name IS NULL AND feature_name IS NOT NULL;
    
    -- Drop the redundant feature_name column
    ALTER TABLE xxpj_feature_flags DROP COLUMN IF EXISTS feature_name;
  END IF;
END $$;

-- Fix xxpj_usage_tracking table - change reset_date from date to timestamptz
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xxpj_usage_tracking' 
    AND column_name = 'reset_date' 
    AND data_type = 'date'
  ) THEN
    -- Convert date to timestamptz
    ALTER TABLE xxpj_usage_tracking 
    ALTER COLUMN reset_date TYPE timestamptz 
    USING reset_date::timestamptz;
  END IF;
END $$;

-- Create missing xxpj_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS xxpj_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan_type text NOT NULL DEFAULT 'free',
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

-- Add missing columns to xxpj_subscriptions if they don't exist
DO $$
BEGIN
  -- Add subscription_type column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xxpj_subscriptions' AND column_name = 'subscription_type'
  ) THEN
    ALTER TABLE xxpj_subscriptions ADD COLUMN subscription_type text;
    -- Sync with plan_type
    UPDATE xxpj_subscriptions SET subscription_type = plan_type;
  END IF;
END $$;

-- Create missing xxpj_usage table (referenced in functions but doesn't exist)
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

-- Enable RLS on new tables
ALTER TABLE xxpj_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxpj_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for xxpj_subscriptions
CREATE POLICY "Users can read own xxpj_subscriptions"
  ON xxpj_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own xxpj_subscriptions"
  ON xxpj_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for xxpj_usage
CREATE POLICY "Users can read own xxpj_usage"
  ON xxpj_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xxpj_usage"
  ON xxpj_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own xxpj_usage"
  ON xxpj_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_xxpj_subscriptions_updated_at
  BEFORE UPDATE ON xxpj_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xxpj_usage_updated_at
  BEFORE UPDATE ON xxpj_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_user_id ON xxpj_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_status ON xxpj_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_plan_type ON xxpj_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_stripe_customer ON xxpj_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_xxpj_usage_user_id ON xxpj_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_usage_daily_reset ON xxpj_usage(daily_reset_date);

-- Backfill missing subscription records
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
WHERE s.user_id IS NULL;

-- Update the corrected get_user_subscription_status function
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
  -- Use provided user_uuid or current authenticated user
  target_user_id := COALESCE(user_uuid, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN QUERY
    SELECT 
      false as is_premium,
      false as is_admin,
      'free'::text as plan_type,
      'inactive'::text as status;
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
  
  -- If no rows returned, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as is_premium,
      false as is_admin,
      'free'::text as plan_type,
      'inactive'::text as status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update track_feature_usage function to use correct table structure
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

-- Update get_feature_limits function to use correct table structure
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_feature_usage(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_feature_limits(uuid) TO authenticated, anon;

-- Add unique constraints where needed
DO $$
BEGIN
  -- Add unique constraint on xxpj_subscriptions.user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'xxpj_subscriptions' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%'
  ) THEN
    ALTER TABLE xxpj_subscriptions ADD CONSTRAINT xxpj_subscriptions_user_id_key UNIQUE (user_id);
  END IF;

  -- Add unique constraint on xxpj_usage_tracking for user_id, feature_type, reset_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'xxpj_usage_tracking' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id_feature_type_reset_date%'
  ) THEN
    ALTER TABLE xxpj_usage_tracking 
    ADD CONSTRAINT xxpj_usage_tracking_user_id_feature_type_reset_date_key 
    UNIQUE (user_id, feature_type, reset_date);
  END IF;
END $$;