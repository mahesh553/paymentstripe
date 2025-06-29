import React from 'react';
import { BarChart3, Crown, AlertTriangle, Clock } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface UsageIndicatorProps {
  feature: string;
  className?: string;
  showResetTime?: boolean;
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ 
  feature, 
  className = "",
  showResetTime = true 
}) => {
  const { subscription, getUsageLimit, getRemainingUsage, getResetDate } = useSubscription();

  if (!subscription) return null;

  const limit = getUsageLimit(feature);
  const remaining = getRemainingUsage(feature);
  const resetDate = getResetDate(feature);
  const used = limit === -1 ? 0 : limit - remaining;

  // Don't show for admin users (unlimited)
  if (subscription.isAdmin) {
    return (
      <div className={`flex items-center text-green-600 text-sm ${className}`}>
        <Crown className="w-4 h-4 mr-1" />
        <span>Unlimited Access</span>
      </div>
    );
  }

  // Don't show if no limit set
  if (limit === 0) return null;

  // Premium users with daily limits
  if (subscription.isPremium && limit > 0) {
    const percentage = (used / limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = remaining === 0;

    const formatResetTime = () => {
      if (!resetDate) return '';
      const date = new Date(resetDate);
      const now = new Date();
      const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (diffHours <= 1) return 'Resets in <1 hour';
      if (diffHours <= 24) return `Resets in ${diffHours}h`;
      return 'Resets tomorrow';
    };

    return (
      <div className={`flex items-center text-sm ${className}`}>
        <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-700'}`}>
              {used}/{limit}
            </span>
            <span className="text-gray-500 ml-1">today</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isAtLimit ? 'bg-red-500' : 
                isNearLimit ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>

          {showResetTime && resetDate && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <span>{formatResetTime()}</span>
            </div>
          )}

          {isAtLimit && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>
    );
  }

  // Free users with monthly limits
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = remaining === 0;

  return (
    <div className={`flex items-center text-sm ${className}`}>
      <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-700'}`}>
            {used}/{limit}
          </span>
          <span className="text-gray-500 ml-1">this month</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : 
              isNearLimit ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        {isAtLimit && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>
    </div>
  );
};

export default UsageIndicator;