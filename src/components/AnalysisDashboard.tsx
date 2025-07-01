import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Upload, Crown } from 'lucide-react';
import AnalysisResults from './AnalysisResults';
import UserMenu from './UserMenu';
import RestructureModal from './RestructureModal';
import FeatureGate from './FeatureGate';
import UsageIndicator from './UsageIndicator';
import SubscriptionModal from './SubscriptionModal';
import { useSubscription } from '../context/SubscriptionContext';

interface AnalysisDashboardProps {
  results: any;
  onBack: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, onBack }) => {
  const [showRestructureModal, setShowRestructureModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { subscription, getRemainingUsage } = useSubscription();

  const handleRestructure = () => {
    setShowRestructureModal(true);
  };

  const handleNewUpload = () => {
    const remainingAnalyses = getRemainingUsage('resume_analysis');
    
    if (!subscription?.isPremium && !subscription?.isAdmin && remainingAnalyses === 0) {
      // Show upgrade modal for free users who have exhausted quota
      setShowUpgradeModal(true);
    } else {
      // Allow upload for premium users or free users with remaining quota
      onBack();
    }
  };

  const canUploadNew = subscription?.isPremium || subscription?.isAdmin || getRemainingUsage('resume_analysis') > 0;
  const canUseRestructure = subscription?.isPremium || subscription?.isAdmin || getRemainingUsage('restructure_guide') > 0;
  
  // Check if user is free tier with exceeded quota
  const isFreeUserQuotaExceeded = !subscription?.isPremium && !subscription?.isAdmin && 
    getRemainingUsage('restructure_guide') === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Resume Analysis Results</h1>
                <UsageIndicator feature="resume_analysis" className="mt-1" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* New Upload Button */}
              {canUploadNew ? (
                <button
                  onClick={handleNewUpload}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload New Resume</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-pointer hover:bg-gray-400 hover:text-gray-600 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Upload New Resume</span>
                </button>
              )}

              {/* Restructure Button */}
              {canUseRestructure ? (
                <button
                  onClick={handleRestructure}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restructure Resume</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-pointer hover:bg-gray-400 hover:text-gray-600 transition-all"
                  title={isFreeUserQuotaExceeded ? "Monthly limit reached - Upgrade to continue" : "Premium feature - Upgrade to unlock"}
                >
                  <Crown className="w-4 h-4" />
                  <span>
                    {isFreeUserQuotaExceeded ? 'Restructure (Limit Reached)' : 'Restructure Guide (Premium)'}
                  </span>
                </button>
              )}
              
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Quota Exhausted Banner for Free Users */}
      {!subscription?.isPremium && !subscription?.isAdmin && getRemainingUsage('resume_analysis') === 0 && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  Free analysis limit reached. Some features are now restricted. Upgrade to Premium for unlimited access.
                </span>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalysisResults results={results} />
      </div>

      {/* Restructure Modal */}
      {showRestructureModal && canUseRestructure && (
        <RestructureModal
          onClose={() => setShowRestructureModal(false)}
          analysisResults={results}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature={isFreeUserQuotaExceeded ? "restructure_guide" : "resume_analysis"}
          title={isFreeUserQuotaExceeded ? "Monthly Limit Reached" : "Upgrade to Continue"}
          description={isFreeUserQuotaExceeded 
            ? "You've reached your free monthly limit for premium features. Upgrade to Premium for unlimited access to restructure guides and all features."
            : "You've reached your free analysis limit. Upgrade to Premium for unlimited resume uploads and access to all features."
          }
        />
      )}
    </div>
  );
};

export default AnalysisDashboard;