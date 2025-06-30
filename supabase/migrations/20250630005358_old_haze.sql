/*
  # Fix reserved keyword issue in get_feature_limits function

  1. Updates
    - Replace "limit" column alias with "usage_limit" to avoid reserved keyword conflict
    - Ensure the function works correctly with proper column naming

  2. Changes
    - Fix the VALUES clause to use non-reserved column names
    - Maintain all existing functionality
*/

-- Update the get_feature_limits function to fix the reserved keyword issue
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
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
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
      f.feature_limit::integer as usage_limit,
      CASE WHEN current_daily_usage > 0 THEN 1 ELSE 0 END::integer as current_usage,
      current_reset_date::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis', 1),
      ('job_matching', 1),
      ('keyword_analysis', 1),
      ('restructure_guide', 1)
    ) AS f(feature, feature_limit);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE LOG 'Error in get_feature_limits: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_feature_limits(uuid) TO authenticated;