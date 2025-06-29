/*
  # Fix Admin Access Issue

  1. Updates
    - Update get_user_subscription_status function to properly check admin status
    - Update track_feature_usage function to properly handle admin users
    - Update get_feature_limits function to show unlimited access for admins
    - Ensure admin users bypass all payment restrictions

  2. Security
    - Maintains existing RLS policies
    - Ensures admin access is properly validated
*/

-- Update the get_user_subscription_status function to properly check admin status
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid uuid)
RETURNS TABLE (
  is_premium boolean,
  is_admin boolean,
  plan_type text,
  status text
) AS $$
BEGIN
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
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;
  
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

-- Update the track_feature_usage function to properly handle admin users
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
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN false;
  END IF;

  -- Get user subscription status with proper admin check
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- If no user found, default to free tier
  IF is_premium IS NULL THEN
    is_premium := false;
    is_admin := false;
  END IF;

  -- Admin users have unlimited access - return true immediately
  IF is_admin = true THEN
    RETURN true;
  END IF;

  -- Set usage limits and reset periods
  IF is_premium THEN
    -- Premium users: daily limits
    usage_limit := CASE 
      WHEN feature_name = 'resume_analysis' THEN 20
      WHEN feature_name = 'job_matching' THEN 20
      WHEN feature_name = 'keyword_analysis' THEN 20
      WHEN feature_name = 'restructure_guide' THEN 20
      ELSE 20
    END;
    reset_period := date_trunc('day', now()) + interval '1 day';
  ELSE
    -- Free users: monthly limits - 1 for all features
    usage_limit := CASE 
      WHEN feature_name = 'resume_analysis' THEN 1
      WHEN feature_name = 'job_matching' THEN 1
      WHEN feature_name = 'keyword_analysis' THEN 1
      WHEN feature_name = 'restructure_guide' THEN 1
      ELSE 1
    END;
    reset_period := date_trunc('month', now()) + interval '1 month';
  END IF;

  -- Get current usage within the reset period
  SELECT COALESCE(usage_count, 0)
  INTO current_usage
  FROM usage_tracking
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
  INSERT INTO usage_tracking (user_id, feature_type, usage_count, reset_date)
  VALUES (user_uuid, feature_name, 1, reset_period)
  ON CONFLICT (user_id, feature_type)
  DO UPDATE SET 
    usage_count = CASE 
      WHEN usage_tracking.reset_date <= now() THEN 1
      ELSE usage_tracking.usage_count + 1
    END,
    reset_date = CASE
      WHEN usage_tracking.reset_date <= now() THEN reset_period
      ELSE usage_tracking.reset_date
    END,
    updated_at = now();

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error in track_feature_usage: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_feature_limits function to show unlimited access for admins
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
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Return empty result for non-existent users
    RETURN;
  END IF;

  -- Get user subscription status with proper admin check
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- If no user found, default to free tier
  IF is_premium IS NULL THEN
    is_premium := false;
    is_admin := false;
  END IF;

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
    LEFT JOIN usage_tracking ut ON ut.user_id = user_uuid 
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
    LEFT JOIN usage_tracking ut ON ut.user_id = user_uuid 
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

-- Update the check_feature_flag function to properly handle admin users
CREATE OR REPLACE FUNCTION check_feature_flag(
  feature_name_param text,
  user_uuid uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  flag_record feature_flags%ROWTYPE;
  user_type text;
  random_value integer;
BEGIN
  -- Get feature flag
  SELECT * INTO flag_record
  FROM feature_flags
  WHERE feature_name = feature_name_param;

  -- If flag doesn't exist, default to false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If flag is disabled, return false
  IF NOT flag_record.is_enabled THEN
    RETURN false;
  END IF;

  -- If no user provided, just check if enabled
  IF user_uuid IS NULL THEN
    RETURN flag_record.is_enabled;
  END IF;

  -- Get user type with proper admin check
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'admin'
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN 'premium'
      ELSE 'free'
    END
  INTO user_type
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- If user type not in target types, return false
  IF user_type IS NULL OR NOT (user_type = ANY(flag_record.target_user_types)) THEN
    RETURN false;
  END IF;

  -- Check rollout percentage
  IF flag_record.rollout_percentage = 100 THEN
    RETURN true;
  ELSIF flag_record.rollout_percentage = 0 THEN
    RETURN false;
  ELSE
    -- Use user ID hash for consistent rollout
    random_value := (hashtext(user_uuid::text) % 100);
    RETURN random_value < flag_record.rollout_percentage;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a debug function to check admin status (can be removed later)
CREATE OR REPLACE FUNCTION debug_user_status(user_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  is_admin boolean,
  subscription_plan text,
  subscription_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(u.is_admin, false),
    COALESCE(s.plan_type, 'free'),
    COALESCE(s.status, 'inactive')
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;