/*
  # Enhance subscription tables with additional useful columns

  1. Users table enhancements
    - `last_login_at` (timestamptz) - Track user activity
    - `email_verified` (boolean) - Email verification status
    - `onboarding_completed` (boolean) - Track onboarding progress
    - `preferences` (jsonb) - Store user preferences

  2. Subscriptions table enhancements
    - `trial_start` (timestamptz) - Trial period start
    - `trial_end` (timestamptz) - Trial period end
    - `cancel_at_period_end` (boolean) - Scheduled cancellation
    - `canceled_at` (timestamptz) - Cancellation timestamp
    - `metadata` (jsonb) - Additional subscription metadata

  3. Usage tracking enhancements
    - `daily_usage_count` (integer) - Track daily usage separately
    - `monthly_usage_count` (integer) - Track monthly usage separately
    - `last_used_at` (timestamptz) - Last usage timestamp

  4. New tables
    - `subscription_history` - Track subscription changes
    - `feature_flags` - Control feature rollouts
*/

-- Enhance users table
DO $$
BEGIN
  -- Add last_login_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login_at timestamptz;
  END IF;

  -- Add email_verified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  -- Add onboarding_completed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- Add preferences column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN preferences jsonb DEFAULT '{}';
  END IF;

  -- Add timezone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE users ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Enhance subscriptions table
DO $$
BEGIN
  -- Add trial_start column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_start'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_start timestamptz;
  END IF;

  -- Add trial_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_end timestamptz;
  END IF;

  -- Add cancel_at_period_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
  END IF;

  -- Add canceled_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'canceled_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN canceled_at timestamptz;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;

  -- Add price_id column for Stripe price tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_price_id text;
  END IF;
END $$;

-- Enhance usage_tracking table
DO $$
BEGIN
  -- Add daily_usage_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_tracking' AND column_name = 'daily_usage_count'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN daily_usage_count integer DEFAULT 0;
  END IF;

  -- Add monthly_usage_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_tracking' AND column_name = 'monthly_usage_count'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN monthly_usage_count integer DEFAULT 0;
  END IF;

  -- Add last_used_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_tracking' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN last_used_at timestamptz DEFAULT now();
  END IF;

  -- Add daily_reset_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_tracking' AND column_name = 'daily_reset_date'
  ) THEN
    ALTER TABLE usage_tracking ADD COLUMN daily_reset_date timestamptz DEFAULT (date_trunc('day', now()) + interval '1 day');
  END IF;
END $$;

-- Create subscription_history table for audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'created', 'upgraded', 'downgraded', 'canceled', 'renewed'
  old_plan_type text,
  new_plan_type text,
  old_status text,
  new_status text,
  stripe_event_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create feature_flags table for controlling feature rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  description text,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_user_types text[] DEFAULT '{}', -- ['free', 'premium', 'admin']
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default feature flags
INSERT INTO feature_flags (feature_name, is_enabled, description, rollout_percentage, target_user_types)
VALUES 
  ('job_matching', true, 'Job-specific resume analysis', 100, '{"premium", "admin"}'),
  ('keyword_analysis', true, 'Advanced keyword analysis', 100, '{"premium", "admin"}'),
  ('restructure_guide', true, 'Resume restructure guide', 100, '{"premium", "admin"}'),
  ('resume_history', true, 'Resume history tracking', 100, '{"premium", "admin"}'),
  ('export_reports', false, 'Export analysis reports', 0, '{"premium", "admin"}'),
  ('ai_suggestions', true, 'AI-powered suggestions', 100, '{"premium", "admin"}'),
  ('bulk_analysis', false, 'Bulk resume analysis', 0, '{"admin"}')
ON CONFLICT (feature_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_feature ON usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_reset_date ON usage_tracking(reset_date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event ON subscription_history(event_type);

-- Create function to update last_login_at
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET last_login_at = now() 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log subscription changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO subscription_history (
      user_id, 
      subscription_id, 
      event_type, 
      new_plan_type, 
      new_status,
      metadata
    ) VALUES (
      NEW.user_id, 
      NEW.id, 
      'created', 
      NEW.plan_type, 
      NEW.status,
      jsonb_build_object('stripe_customer_id', NEW.stripe_customer_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if significant fields changed
    IF OLD.plan_type != NEW.plan_type OR OLD.status != NEW.status THEN
      INSERT INTO subscription_history (
        user_id, 
        subscription_id, 
        event_type, 
        old_plan_type, 
        new_plan_type, 
        old_status, 
        new_status,
        metadata
      ) VALUES (
        NEW.user_id, 
        NEW.id, 
        CASE 
          WHEN OLD.status = 'active' AND NEW.status = 'canceled' THEN 'canceled'
          WHEN OLD.plan_type = 'free' AND NEW.plan_type = 'premium' THEN 'upgraded'
          WHEN OLD.plan_type = 'premium' AND NEW.plan_type = 'free' THEN 'downgraded'
          WHEN OLD.status != 'active' AND NEW.status = 'active' THEN 'renewed'
          ELSE 'updated'
        END,
        OLD.plan_type, 
        NEW.plan_type, 
        OLD.status, 
        NEW.status,
        jsonb_build_object(
          'stripe_customer_id', NEW.stripe_customer_id,
          'stripe_subscription_id', NEW.stripe_subscription_id
        )
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER log_subscription_changes
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_change();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check feature flag
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

  -- Get user type
  SELECT 
    CASE 
      WHEN u.is_admin = true THEN 'admin'
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

-- Update the handle_new_user function to set default values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a default subscription record for the new user
  INSERT INTO subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    plan_type,
    current_period_start,
    current_period_end,
    metadata
  ) VALUES (
    NEW.id,
    NULL,
    NULL,
    'inactive',
    'free',
    NULL,
    NULL,
    jsonb_build_object(
      'signup_date', now(),
      'signup_source', 'web'
    )
  );
  
  -- Set default user preferences
  UPDATE users 
  SET 
    email_verified = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    preferences = jsonb_build_object(
      'email_notifications', true,
      'marketing_emails', true,
      'theme', 'light',
      'language', 'en'
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;