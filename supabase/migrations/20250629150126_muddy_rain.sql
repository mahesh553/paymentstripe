-- Update the track_feature_usage function to give free users 1 analysis per month for all features
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

  -- If no user found, default to free tier
  IF is_premium IS NULL THEN
    is_premium := false;
    is_admin := false;
  END IF;

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

-- Update the get_feature_limits function to show 1/1 for all features for free users
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

  -- If no user found, default to free tier
  IF is_premium IS NULL THEN
    is_premium := false;
    is_admin := false;
  END IF;

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