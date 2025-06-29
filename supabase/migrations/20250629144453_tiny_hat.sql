/*
  # Auto-create subscription on user creation

  1. New Function
    - `handle_new_user()` - Creates default subscription when user is created

  2. New Trigger
    - Automatically creates subscription record for new users
    - Sets default plan to 'free' with 'inactive' status
    - Ensures every user has a subscription record

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only creates subscription, doesn't modify existing ones
*/

-- Create function to handle new user creation
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
    current_period_end
  ) VALUES (
    NEW.id,
    NULL,
    NULL,
    'inactive',
    'free',
    NULL,
    NULL
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create subscription on user insert
DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Backfill existing users who don't have subscriptions
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  plan_type,
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  NULL,
  NULL,
  'inactive',
  'free',
  NULL,
  NULL
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE s.user_id IS NULL;