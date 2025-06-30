# Complete User Flow Analysis

## Table Mapping Overview

Based on the database schema analysis, here's the complete table mapping structure:

### Core Tables Structure

```
auth.users (Supabase Auth)
    ↓ (trigger: handle_new_user)
xxpj_users (User Profiles)
    ↓ (foreign key)
xxpj_subscriptions (Subscription Data)
    ↓ (foreign key)
xxpj_usage_tracking (Feature Usage)
```

### User Types and Flow

#### 1. New Users
**Flow:** `auth.users` → `xxpj_users` → `xxpj_subscriptions`

- **Registration:** User signs up via Supabase Auth
- **Profile Creation:** Trigger automatically creates `xxpj_users` record
- **Subscription Setup:** Trigger creates default `xxpj_subscriptions` record
- **Default State:** 
  - Plan: `free`
  - Status: `inactive`
  - Limits: 1 analysis per month for each feature

#### 2. Existing Users
**Maintenance:** Ensure data consistency across tables

- **Profile Sync:** `xxpj_users` record must exist for all `auth.users`
- **Subscription Sync:** `xxpj_subscriptions` record must exist for all `xxpj_users`
- **Usage Tracking:** `xxpj_usage_tracking` records created on feature usage

#### 3. Free Users
**Limits:** 1 analysis per month for each feature

- **Plan Type:** `free`
- **Status:** `inactive`
- **Features Available:**
  - Resume Analysis: 1/month
  - Job Matching: 1/month
  - Keyword Analysis: 1/month
  - Restructure Guide: 1/month
- **Reset Period:** Monthly (first day of each month)

#### 4. Premium Users
**Limits:** 20 analyses per day for each feature

- **Plan Type:** `premium`
- **Status:** `active`
- **Features Available:**
  - Resume Analysis: 20/day
  - Job Matching: 20/day
  - Keyword Analysis: 20/day
  - Restructure Guide: 20/day
- **Reset Period:** Daily (midnight each day)

#### 5. Admin Users
**Limits:** Unlimited access to all features

- **Plan Type:** `admin`
- **Status:** `active`
- **Is Admin:** `true`
- **Features Available:** Unlimited everything
- **Reset Period:** N/A

#### 6. Expired Membership Users
**Scenarios:** Various expiration states

- **Canceled but Active:** `status = 'canceled'` but `current_period_end > now()`
  - Still has access until period ends
  - Shows expiration warning
  
- **Expired:** `status = 'canceled'` and `current_period_end <= now()`
  - Reverted to free tier limits
  - Plan type remains `premium` but status is `canceled`
  
- **Trial Expired:** `trial_end <= now()`
  - Reverted to free tier limits
  - Shows upgrade prompts

### Database Functions

#### Core Functions
1. **`get_user_subscription_status(user_uuid)`**
   - Returns: `is_premium`, `is_admin`, `plan_type`, `status`
   - Used by: Subscription context to determine user capabilities

2. **`track_feature_usage(user_uuid, feature_name)`**
   - Returns: `boolean` (success/failure)
   - Used by: Feature usage tracking and limit enforcement

3. **`get_feature_limits(user_uuid)`**
   - Returns: Usage limits and current usage for all features
   - Used by: UI to display usage indicators

4. **`check_user_subscription_type(user_uuid)`**
   - Returns: Detailed subscription info with expiration
   - Used by: Subscription management and expiration handling

### Foreign Key Relationships

```sql
-- Core user relationships
xxpj_users.id → auth.users.id
xxpj_subscriptions.user_id → auth.users.id
xxpj_usage_tracking.user_id → auth.users.id
xxpj_resume_history.user_id → auth.users.id

-- Resume relationships
resumes.user_id → xxpj_users.id
analyses.resume_id → resumes.id
job_matches.resume_id → resumes.id
```

### Data Consistency Rules

1. **Every `auth.users` record MUST have:**
   - Corresponding `xxpj_users` record
   - Corresponding `xxpj_subscriptions` record

2. **User Profile Creation:**
   - Triggered automatically on `auth.users` INSERT
   - Fallback creation in application code if missing

3. **Subscription Management:**
   - Default: `free` plan with `inactive` status
   - Premium: `premium` plan with `active` status
   - Admin: Any plan with `is_admin = true`

4. **Usage Tracking:**
   - Created on-demand when features are used
   - Reset periods based on subscription type
   - Unlimited for admin users

### Migration Strategy

The migration handles:
1. **Backfill missing records** for existing users
2. **Update foreign key constraints** to use correct tables
3. **Create proper indexes** for performance
4. **Update RLS policies** for security
5. **Fix function definitions** for consistency

This ensures all user types (new, existing, free, premium, admin, expired) work correctly with the unified table structure.