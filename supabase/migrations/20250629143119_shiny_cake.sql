/*
  # Update premium limits to 20 job analyses per day

  1. Updates
    - Modify track_feature_usage function to implement daily limits for premium users
    - Add daily reset logic for premium tier
    - Keep unlimited access for admin users only

  2. Changes
    - Premium users: 20 job analyses per day
    - Free users: 1 resume analysis per month (unchanged)
    - Admin users: unlimited access (unchanged)
*/

-- Update the track_feature_usage function to implement daily limits for premium users
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
BEGIN
  -- Get user subscription status
  SELECT 
    CASE 
      WHEN u.is_admin = true THEN true
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- Admin users have unlimited access
  IF is_admin THEN
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
    -- Free users: monthly limits
    usage_limit := CASE 
      WHEN feature_name = 'resume_analysis' THEN 1
      WHEN feature_name = 'job_matching' THEN 0
      WHEN feature_name = 'keyword_analysis' THEN 0
      WHEN feature_name = 'restructure_guide' THEN 0
      ELSE 0
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get usage limits for display
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
BEGIN
  -- Get user subscription status
  SELECT 
    CASE 
      WHEN u.is_admin = true THEN true
      WHEN s.status = 'active' AND s.plan_type = 'premium' THEN true
      ELSE false
    END,
    COALESCE(u.is_admin, false)
  INTO is_premium, is_admin
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = user_uuid;

  -- Return limits based on user type
  IF is_admin THEN
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
    -- Free: limited access
    RETURN QUERY
    SELECT 
      f.feature::text,
      f.limit::integer as usage_limit,
      COALESCE(ut.usage_count, 0)::integer as current_usage,
      COALESCE(ut.reset_date, date_trunc('month', now()) + interval '1 month')::timestamptz as reset_date,
      false::boolean as is_unlimited
    FROM (VALUES 
      ('resume_analysis', 1),
      ('job_matching', 0),
      ('keyword_analysis', 0),
      ('restructure_guide', 0)
    ) AS f(feature, "limit")
    LEFT JOIN usage_tracking ut ON ut.user_id = user_uuid 
      AND ut.feature_type = f.feature 
      AND ut.reset_date > now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;