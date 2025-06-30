/*
  # Fix Complete Table Mappings and User Flow

  1. Analysis of Current Issues:
    - xxpj_users table exists but some foreign keys point to auth.users
    - Inconsistent user table references across the application
    - Mixed usage of users vs xxpj_users tables
    - Foreign key constraints pointing to wrong tables

  2. Solution:
    - Standardize on xxpj_users as the main user profile table
    - Update all foreign key constraints to point to xxpj_users
    - Ensure proper user creation flow
    - Fix subscription and usage tracking references

  3. User Flow:
    - New users: auth.users -> xxpj_users (via trigger)
    - Existing users: ensure xxpj_users record exists
    - Paid users: xxpj_subscriptions with proper status
    - Free users: xxpj_subscriptions with free plan
    - Expired users: xxpj_subscriptions with expired status
*/

-- First, ensure all users from auth.users have corresponding xxpj_users records
INSERT INTO xxpj_users (
  id, 
  email, 
  full_name, 
  avatar_url, 
  is_admin, 
  subscription_tier,
  email_verified,
  onboarding_completed,
  preferences,
  timezone,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  au.raw_user_meta_data->>'avatar_url',
  false, -- default not admin
  'free', -- default subscription tier
  au.email_confirmed_at IS NOT NULL,
  false, -- default onboarding not completed
  '{}', -- default empty preferences
  'UTC', -- default timezone
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN xxpj_users xu ON au.id = xu.id
WHERE xu.id IS NULL;

-- Ensure all xxpj_users have corresponding xxpj_subscriptions
INSERT INTO xxpj_subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  plan_type,
  current_period_start,
  current_period_end,
  trial_start,
  trial_end,
  cancel_at_period_end,
  canceled_at,
  metadata,
  stripe_price_id,
  created_at,
  updated_at
)
SELECT 
  xu.id,
  NULL, -- no stripe customer initially
  NULL, -- no stripe subscription initially
  'inactive', -- default status
  'free', -- default plan
  NULL, -- no period start for free
  NULL, -- no period end for free
  NULL, -- no trial start
  NULL, -- no trial end
  false, -- not set to cancel
  NULL, -- not canceled
  jsonb_build_object(
    'signup_date', xu.created_at,
    'signup_source', 'web',
    'initial_plan', 'free'
  ),
  NULL, -- no stripe price id
  xu.created_at,
  xu.updated_at
FROM xxpj_users xu
LEFT JOIN xxpj_subscriptions xs ON xu.id = xs.user_id
WHERE xs.user_id IS NULL;

-- Update the handle_new_user function to work with xxpj_users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into xxpj_users table
  INSERT INTO xxpj_users (
    id,
    email,
    full_name,
    avatar_url,
    is_admin,
    subscription_tier,
    email_verified,
    onboarding_completed,
    preferences,
    timezone,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    false, -- default not admin
    'free', -- default subscription tier
    NEW.email_confirmed_at IS NOT NULL,
    false, -- default onboarding not completed
    jsonb_build_object(
      'email_notifications', true,
      'marketing_emails', true,
      'theme', 'light',
      'language', 'en'
    ),
    'UTC', -- default timezone
    NEW.created_at,
    NEW.updated_at
  );

  -- Insert a default subscription record
  INSERT INTO xxpj_subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    plan_type,
    current_period_start,
    current_period_end,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NULL,
    NULL,
    'inactive',
    'free',
    NULL,
    NULL,
    jsonb_build_object(
      'signup_date', NEW.created_at,
      'signup_source', 'web',
      'initial_plan', 'free'
    ),
    NEW.created_at,
    NEW.updated_at
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating xxpj_users record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update get_user_subscription_status function
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
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
      ELSE false
    END as is_premium,
    COALESCE(u.is_admin, false) as is_admin,
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'admin'
      ELSE COALESCE(s.plan_type, 'free')
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

-- Update track_feature_usage function
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
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
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

-- Update get_feature_limits function
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
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
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

-- Create function to check subscription status for different user types
CREATE OR REPLACE FUNCTION check_user_subscription_type(user_uuid uuid)
RETURNS TABLE (
  user_type text,
  is_active boolean,
  expires_at timestamptz,
  days_remaining integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN u.is_admin = true THEN 'admin'
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN 'premium'
      WHEN s.status = 'canceled' AND s.current_period_end > now() THEN 'premium_expiring'
      WHEN s.status = 'canceled' AND s.current_period_end <= now() THEN 'expired'
      WHEN s.trial_end IS NOT NULL AND s.trial_end > now() THEN 'trial'
      WHEN s.trial_end IS NOT NULL AND s.trial_end <= now() THEN 'trial_expired'
      ELSE 'free'
    END as user_type,
    CASE 
      WHEN u.is_admin = true THEN true
      WHEN s.status = 'active' THEN true
      WHEN s.status = 'canceled' AND s.current_period_end > now() THEN true
      WHEN s.trial_end IS NOT NULL AND s.trial_end > now() THEN true
      ELSE false
    END as is_active,
    CASE 
      WHEN u.is_admin = true THEN null
      WHEN s.current_period_end IS NOT NULL THEN s.current_period_end
      WHEN s.trial_end IS NOT NULL THEN s.trial_end
      ELSE null
    END as expires_at,
    CASE 
      WHEN u.is_admin = true THEN -1
      WHEN s.current_period_end IS NOT NULL THEN EXTRACT(days FROM s.current_period_end - now())::integer
      WHEN s.trial_end IS NOT NULL THEN EXTRACT(days FROM s.trial_end - now())::integer
      ELSE 0
    END as days_remaining
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_feature_usage(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_feature_limits(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_user_subscription_type(uuid) TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_xxpj_users_email ON xxpj_users(email);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_subscription_tier ON xxpj_users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_xxpj_users_is_admin ON xxpj_users(is_admin) WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_user_id ON xxpj_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_status ON xxpj_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_plan_type ON xxpj_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_subscriptions_period_end ON xxpj_subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_user_feature ON xxpj_usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_xxpj_usage_tracking_reset_date ON xxpj_usage_tracking(reset_date);