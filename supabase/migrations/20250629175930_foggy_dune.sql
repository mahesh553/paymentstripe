/*
  # Fix table names and functions for xxpj_ prefixed tables

  1. Update all functions to use correct table names
  2. Ensure admin access works with xxpj_users table
  3. Fix subscription context to work with existing schema
*/

-- Drop existing functions that reference wrong table names
DROP FUNCTION IF EXISTS get_user_subscription_status(uuid);
DROP FUNCTION IF EXISTS track_feature_usage(uuid, text);
DROP FUNCTION IF EXISTS get_feature_limits(uuid);
DROP FUNCTION IF EXISTS debug_user_status(uuid);

-- Create get_user_subscription_status function with correct table names
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
      WHEN s.status = 'active' AND s.subscription_type = 'premium' THEN true
      ELSE false
    END as is_premium,
    COALESCE(u.is_admin, false) as is_admin,
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'admin'
      ELSE COALESCE(s.subscription_type, 'free')
    END as plan_type,
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN 'active'
      ELSE COALESCE(s.status, 'inactive')
    END as status
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
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

-- Create track_feature_usage function with correct table names
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
  SELECT EXISTS(SELECT 1 FROM xxpj_users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN false;
  END IF;

  -- Get user subscription status with proper admin check
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND s.subscription_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
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
  SELECT COALESCE(daily_usage_count, 0)
  INTO current_usage
  FROM xxpj_usage
  WHERE user_id = user_uuid 
    AND daily_reset_date > now();

  -- If no record found, default to 0
  IF current_usage IS NULL THEN
    current_usage := 0;
  END IF;

  -- Check if user has exceeded limit
  IF current_usage >= usage_limit THEN
    RETURN false;
  END IF;

  -- Increment usage counter
  INSERT INTO xxpj_usage (user_id, daily_usage_count, monthly_usage_count, daily_reset_date, last_used_at)
  VALUES (user_uuid, 1, 1, reset_period, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    daily_usage_count = CASE 
      WHEN xxpj_usage.daily_reset_date <= now() THEN 1
      ELSE xxpj_usage.daily_usage_count + 1
    END,
    monthly_usage_count = xxpj_usage.monthly_usage_count + 1,
    daily_reset_date = CASE
      WHEN xxpj_usage.daily_reset_date <= now() THEN reset_period
      ELSE xxpj_usage.daily_reset_date
    END,
    last_used_at = now(),
    updated_at = now();

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error in track_feature_usage: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_feature_limits function with correct table names
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
  current_daily_usage integer;
  current_reset_date timestamptz;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM xxpj_users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Return empty result for non-existent users
    RETURN;
  END IF;

  -- Get user subscription status with proper admin check
  SELECT 
    CASE 
      WHEN COALESCE(u.is_admin, false) = true THEN true
      WHEN s.status = 'active' AND s.subscription_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- If no user found, default to free tier
  IF is_premium IS NULL THEN
    is_premium := false;
    is_admin := false;
  END IF;

  -- Get current usage data
  SELECT 
    COALESCE(daily_usage_count, 0),
    COALESCE(daily_reset_date, date_trunc('day', now()) + interval '1 day')
  INTO current_daily_usage, current_reset_date
  FROM xxpj_usage
  WHERE user_id = user_uuid;

  -- If no usage record, set defaults
  IF current_daily_usage IS NULL THEN
    current_daily_usage := 0;
    current_reset_date := CASE 
      WHEN is_premium THEN date_trunc('day', now()) + interval '1 day'
      ELSE date_trunc('month', now()) + interval '1 month'
    END;
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
      current_daily_usage::integer as current_usage,
      current_reset_date::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis'),
      ('job_matching'),
      ('keyword_analysis'),
      ('restructure_guide')
    ) AS f(feature);
  ELSE
    -- Free: 1 per month for all features
    RETURN QUERY
    SELECT 
      f.feature::text,
      1::integer as usage_limit,
      CASE WHEN current_daily_usage > 0 THEN 1 ELSE 0 END::integer as current_usage,
      current_reset_date::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis'),
      ('job_matching'),
      ('keyword_analysis'),
      ('restructure_guide')
    ) AS f(feature);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE LOG 'Error in get_feature_limits: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create debug function to check admin status
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
    COALESCE(s.subscription_type, 'free'),
    COALESCE(s.status, 'inactive')
  FROM xxpj_users u
  LEFT JOIN xxpj_subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_subscription_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION track_feature_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_limits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_status(uuid) TO authenticated;