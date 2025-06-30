import React from 'react';
import { FileText, Crown, Eye, Calendar, BarChart3, TrendingUp, Star } from 'lucide-react';

interface LastAnalysisModalProps {
  onClose: () => void;
  onViewAnalysis: () => void;
  onUpgrade: () => void;
  resumeData: any;
}

const LastAnalysisModal: React.FC<LastAnalysisModalProps> = ({
  onClose,
  onViewAnalysis,
  onUpgrade,
  resumeData
}) => {
  const analysisResults = resumeData?.analysisResults;
  const hasAnalysis = !!analysisResults;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Welcome Back!</h2>
              <p className="text-green-100 mt-1">
                You've reached your free analysis limit. Here's your last resume analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Resume Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">{resumeData.filename}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Analyzed on {formatDate(resumeData.created_at)}</span>
                  </div>
                </div>
              </div>
              {hasAnalysis && (
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(analysisResults.overall_score)}`}>
                    {analysisResults.overall_score}
                  </div>
                  <div className="text-sm text-gray-500">Overall Score</div>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Preview */}
          {hasAnalysis ? (
            <div className="space-y-4 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                Analysis Summary
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${getScoreBg(analysisResults.overall_score)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Quality</span>
                    <div className={`text-xl font-bold ${getScoreColor(analysisResults.overall_score)}`}>
                      {analysisResults.overall_score}
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg border ${getScoreBg(analysisResults.ats_score || 75)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">ATS Score</span>
                    <div className={`text-xl font-bold ${getScoreColor(analysisResults.ats_score || 75)}`}>
                      {analysisResults.ats_score || 75}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Strengths</span>
                    <div className="text-xl font-bold text-green-600">
                      {analysisResults.strengths?.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Key Insights from Your Analysis
                </h5>
                <div className="space-y-2">
                  {analysisResults.strengths?.slice(0, 2).map((strength: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <Star className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{strength}</span>
                    </div>
                  ))}
                  {analysisResults.quick_wins?.slice(0, 1).map((win: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <TrendingUp className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{win}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Resume Uploaded</h4>
              <p className="text-gray-600">
                Your resume was uploaded but not yet analyzed. Upgrade to Premium to get detailed insights.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {hasAnalysis && (
              <button
                onClick={onViewAnalysis}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Full Analysis
              </button>
            )}
            
            <button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all flex items-center justify-center shadow-lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Premium - Upload New Resume
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Premium Benefits */}
          <div className="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h5 className="font-semibold text-yellow-900 mb-2">🚀 With Premium You Get:</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 20 resume analyses per day</li>
              <li>• Job-specific matching and optimization</li>
              <li>• Advanced keyword analysis</li>
              <li>• Resume restructure guide with examples</li>
              <li>• Resume history and tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LastAnalysisModal;