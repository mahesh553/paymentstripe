import { supabase } from './supabase';

export interface SubscriptionStatus {
  isPremium: boolean;
  isAdmin: boolean;
  planType: string;
  status: string;
}

export const checkUserSubscription = async (userId: string): Promise<SubscriptionStatus> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: userId });

    if (error) {
      console.error('Error checking subscription:', error);
      return {
        isPremium: false,
        isAdmin: false,
        planType: 'free',
        status: 'inactive'
      };
    }

    const status = data?.[0];
    return {
      isPremium: status?.is_premium || false,
      isAdmin: status?.is_admin || false,
      planType: status?.plan_type || 'free',
      status: status?.status || 'inactive'
    };
  } catch (error) {
    console.error('Error in checkUserSubscription:', error);
    return {
      isPremium: false,
      isAdmin: false,
      planType: 'free',
      status: 'inactive'
    };
  }
};

export const trackFeatureUsage = async (userId: string, feature: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('track_feature_usage', {
        user_uuid: userId,
        feature_name: feature
      });

    if (error) {
      console.error('Error tracking feature usage:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('Error in trackFeatureUsage:', error);
    return false;
  }
};

export const getUserUsage = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('feature_type, usage_count, reset_date')
      .eq('user_id', userId)
      .gte('reset_date', new Date().toISOString());

    if (error) {
      console.error('Error fetching usage:', error);
      return {};
    }

    return (data || []).reduce((acc, item) => {
      acc[item.feature_type] = {
        count: item.usage_count,
        resetDate: item.reset_date
      };
      return acc;
    }, {} as Record<string, { count: number; resetDate: string }>);
  } catch (error) {
    console.error('Error in getUserUsage:', error);
    return {};
  }
};

export const createSubscription = async (userId: string, subscriptionData: any) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        ...subscriptionData
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return { data: null, error };
    }

    // Update user subscription tier
    await supabase
      .from('users')
      .update({ subscription_tier: subscriptionData.plan_type })
      .eq('id', userId);

    return { data, error: null };
  } catch (error) {
    console.error('Error in createSubscription:', error);
    return { data: null, error };
  }
};

export const updateSubscription = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return { data: null, error };
    }

    // Update user subscription tier if plan changed
    if (updates.plan_type) {
      await supabase
        .from('users')
        .update({ subscription_tier: updates.plan_type })
        .eq('id', userId);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in updateSubscription:', error);
    return { data: null, error };
  }
};