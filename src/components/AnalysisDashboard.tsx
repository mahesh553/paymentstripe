import React, { useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import AnalysisResults from './AnalysisResults';
import UserMenu from './UserMenu';
import RestructureModal from './RestructureModal';
import FeatureGate from './FeatureGate';
import UsageIndicator from './UsageIndicator';

interface AnalysisDashboardProps {
  results: any;
  onBack: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ results, onBack }) => {
  const [showRestructureModal, setShowRestructureModal] = useState(false);

  const handleRestructure = () => {
    setShowRestructureModal(true);
  };

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
              <FeatureGate 
                feature="restructure_guide"
                showUpgradePrompt={false}
                fallback={
                  <button
                    onClick={() => setShowRestructureModal(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
                    disabled
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Restructure Guide (Premium)</span>
                  </button>
                }
              >
                <button
                  onClick={handleRestructure}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restructure Resume</span>
                </button>
              </FeatureGate>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalysisResults results={results} />
      </div>

      {/* Restructure Modal */}
      {showRestructureModal && (
        <FeatureGate 
          feature="restructure_guide"
          fallback={null} // Don't show anything if user doesn't have access
        >
          <RestructureModal
            onClose={() => setShowRestructureModal(false)}
            analysisResults={results}
          />
        </FeatureGate>
      )}
    </div>
  );
};

export default AnalysisDashboard;