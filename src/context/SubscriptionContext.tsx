import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface SubscriptionStatus {
  isPremium: boolean;
  isAdmin: boolean;
  planType: string;
  status: string;
  usageData: Record<string, number>;
  limitsData: Record<string, { limit: number; used: number; resetDate: string; isUnlimited: boolean }>;
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  trackFeatureUsage: (feature: string) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  getUsageLimit: (feature: string) => number;
  getRemainingUsage: (feature: string) => number;
  getResetDate: (feature: string) => string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(false);

  useEffect(() => {
    if (user && !fetchingStatus) {
      fetchSubscriptionStatus();
    } else if (!user) {
      setSubscription(null);
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    if (!user || fetchingStatus) return;

    setFetchingStatus(true);
    setLoading(true);
    
    try {
      // Get subscription status with error handling
      let statusData = null;
      try {
        const { data, error } = await supabase
          .rpc('get_user_subscription_status', { user_uuid: user.id });

        if (error) {
          console.error('Error fetching subscription status:', error);
          // Continue with default values
        } else {
          statusData = data;
        }
      } catch (error) {
        console.error('RPC call failed:', error);
        // Continue with default values
      }

      // Get feature limits with error handling
      let limitsData = null;
      try {
        const { data, error } = await supabase
          .rpc('get_feature_limits', { user_uuid: user.id });

        if (error) {
          console.error('Error fetching limits data:', error);
          // Continue with default values
        } else {
          limitsData = data;
        }
      } catch (error) {
        console.error('RPC call for limits failed:', error);
        // Continue with default values
      }

      // Transform limits data with fallbacks
      const limitsMap = (limitsData || []).reduce((acc, item) => {
        acc[item.feature_type] = {
          limit: item.usage_limit,
          used: item.current_usage,
          resetDate: item.reset_date,
          isUnlimited: item.is_unlimited
        };
        return acc;
      }, {} as Record<string, { limit: number; used: number; resetDate: string; isUnlimited: boolean }>);

      // Add default limits for free users if no data returned
      if (Object.keys(limitsMap).length === 0) {
        const defaultResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        ['resume_analysis', 'job_matching', 'keyword_analysis', 'restructure_guide'].forEach(feature => {
          limitsMap[feature] = {
            limit: 1,
            used: 0,
            resetDate: defaultResetDate,
            isUnlimited: false
          };
        });
      }

      // Legacy usage data for backward compatibility
      const usageMap = (limitsData || []).reduce((acc, item) => {
        acc[item.feature_type] = item.current_usage;
        return acc;
      }, {} as Record<string, number>);

      const status = statusData?.[0];
      const newSubscription = {
        isPremium: status?.is_premium || false,
        isAdmin: status?.is_admin || false,
        planType: status?.plan_type || 'free',
        status: status?.status || 'inactive',
        usageData: usageMap,
        limitsData: limitsMap
      };

      setSubscription(newSubscription);
    } catch (error) {
      console.error('Error in fetchSubscriptionStatus:', error);
      // Set default free tier subscription
      const defaultResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const defaultLimits = {} as Record<string, { limit: number; used: number; resetDate: string; isUnlimited: boolean }>;
      
      ['resume_analysis', 'job_matching', 'keyword_analysis', 'restructure_guide'].forEach(feature => {
        defaultLimits[feature] = {
          limit: 1,
          used: 0,
          resetDate: defaultResetDate,
          isUnlimited: false
        };
      });

      setSubscription({
        isPremium: false,
        isAdmin: false,
        planType: 'free',
        status: 'inactive',
        usageData: {},
        limitsData: defaultLimits
      });
    } finally {
      setLoading(false);
      setFetchingStatus(false);
    }
  };

  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    if (!user || !subscription) return false;

    // Admin users have unlimited access
    if (subscription.isAdmin) return true;

    // Check current limits
    const featureData = subscription.limitsData[feature];
    if (!featureData) return false;

    // Unlimited access
    if (featureData.isUnlimited) return true;

    // Check if under limit
    return featureData.used < featureData.limit;
  };

  const trackFeatureUsage = async (feature: string): Promise<boolean> => {
    if (!user) return false;

    // Admin users always have access
    if (subscription?.isAdmin) return true;

    try {
      const { data, error } = await supabase
        .rpc('track_feature_usage', {
          user_uuid: user.id,
          feature_name: feature
        });

      if (error) {
        console.error('Error tracking feature usage:', error);
        // For admin users or if tracking fails, allow access
        if (subscription?.isAdmin) {
          return true;
        }
        // For free tier resume analysis, allow it to proceed even if tracking fails
        if (feature === 'resume_analysis' && subscription?.planType === 'free') {
          return true;
        }
        return false;
      }

      // Refresh subscription status to update usage counts
      if (data) {
        await fetchSubscriptionStatus();
      }

      return data;
    } catch (error) {
      console.error('Error in trackFeatureUsage:', error);
      // For admin users, always allow access
      if (subscription?.isAdmin) {
        return true;
      }
      // For free tier resume analysis, allow it to proceed even if tracking fails
      if (feature === 'resume_analysis' && subscription?.planType === 'free') {
        return true;
      }
      return false;
    }
  };

  const refreshSubscription = async () => {
    if (!fetchingStatus) {
      await fetchSubscriptionStatus();
    }
  };

  const getUsageLimit = (feature: string): number => {
    if (!subscription) return 0;
    
    const featureData = subscription.limitsData[feature];
    if (!featureData) return 0;

    return featureData.isUnlimited ? -1 : featureData.limit;
  };

  const getRemainingUsage = (feature: string): number => {
    if (!subscription) return 0;

    const featureData = subscription.limitsData[feature];
    if (!featureData) return 0;

    if (featureData.isUnlimited) return -1;

    return Math.max(0, featureData.limit - featureData.used);
  };

  const getResetDate = (feature: string): string | null => {
    if (!subscription) return null;

    const featureData = subscription.limitsData[feature];
    return featureData?.resetDate || null;
  };

  const value = {
    subscription,
    loading,
    checkFeatureAccess,
    trackFeatureUsage,
    refreshSubscription,
    getUsageLimit,
    getRemainingUsage,
    getResetDate
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};