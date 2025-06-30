import React, { useState, useEffect } from 'react';
import { Lock, Crown, Zap } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import SubscriptionModal from './SubscriptionModal';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
  showUpgradePrompt?: boolean;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  title,
  description,
  showUpgradePrompt = true
}) => {
  const { subscription, checkFeatureAccess, loading } = useSubscription();
  const [hasAccess, setHasAccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (subscription && !loading) {
        setChecking(true);
        const access = await checkFeatureAccess(feature);
        setHasAccess(access);
        setChecking(false);
      }
    };

    checkAccess();
  }, [subscription, feature, checkFeatureAccess, loading]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Checking access...</span>
      </div>
    );
  }

  // If user has access, show the children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback is provided and we're not showing upgrade prompt, show the fallback
  if (fallback && !showUpgradePrompt) {
    return <>{fallback}</>;
  }

  // If we have a fallback and we're showing upgrade prompt, show the fallback
  // This is the key change - we always show the fallback for free users
  // instead of proceeding to premium content when they close the modal
  if (fallback) {
    return <>{fallback}</>;
  }

  // If no fallback and we're not showing upgrade prompt, return null
  if (!showUpgradePrompt) {
    return null;
  }

  const featureNames = {
    job_matching: "Job-Specific Analysis",
    keyword_analysis: "Advanced Keyword Analysis", 
    restructure_guide: "Resume Restructure Guide",
    resume_history: "Resume History",
    unlimited_analysis: "Unlimited Analyses"
  };

  const featureName = featureNames[feature as keyof typeof featureNames] || "Premium Feature";

  return (
    <>
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-8 text-center">
        <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-yellow-300" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {title || `Unlock ${featureName}`}
        </h3>
        
        <p className="text-gray-700 mb-6 max-w-md mx-auto">
          {description || `Get unlimited access to ${featureName.toLowerCase()} and all premium features to maximize your job search success.`}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </button>
          
          <div className="text-sm text-gray-600">
            Starting at $19/month
          </div>
        </div>

        <div className="flex items-center justify-center text-sm text-gray-500">
          <Lock className="w-4 h-4 mr-1" />
          Premium feature
        </div>
      </div>

      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature={feature}
          title={title}
          description={description}
        />
      )}
    </>
  );
};

export default FeatureGate;