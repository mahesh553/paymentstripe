import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Star, ArrowRight, Copy, Download, Zap, RefreshCw } from 'lucide-react';
import { generateRestructureSuggestions } from '../services/geminiService';
import { useSubscription } from '../context/SubscriptionContext';

interface RestructureModalProps {
  onClose: () => void;
  analysisResults: any;
}

const RestructureModal: React.FC<RestructureModalProps> = ({ onClose, analysisResults }) => {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [restructureData, setRestructureData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { trackFeatureUsage } = useSubscription();

  // Prevent modal from closing when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't close modal on visibility change
      return;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn user before closing tab/window
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Focus management to keep modal active
  useEffect(() => {
    const handleFocus = () => {
      if (modalRef.current) {
        modalRef.current.focus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const generateDynamicSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Track feature usage
        const canUse = await trackFeatureUsage('restructure_guide');
        if (!canUse) {
          setError('You have reached your usage limit for restructure guides. Please upgrade to continue.');
          setLoading(false);
          return;
        }

        // Get resume text from session storage
        const resumeData = sessionStorage.getItem('currentResume');
        if (!resumeData) {
          throw new Error('No resume data found. Please upload a resume first.');
        }

        const resume = JSON.parse(resumeData);
        
        // Generate dynamic restructure suggestions based on actual resume content
        const suggestions = await generateRestructureSuggestions(resume.text, analysisResults);
        setRestructureData(suggestions);
      } catch (err) {
        console.error('Error generating restructure suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate restructure suggestions');
      } finally {
        setLoading(false);
      }
    };

    generateDynamicSuggestions();
  }, [analysisResults, trackFeatureUsage]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => new Set([...prev, id]));
    setTimeout(() => {
      setCopiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-800 border-green-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Star className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Prevent modal from closing when clicking inside
    e.stopPropagation();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close when clicking the overlay, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={handleModalClick}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">🚀 AI-Powered Resume Restructure Guide</h2>
            <p className="text-green-100 mt-1">
              {loading ? 'Generating personalized suggestions...' : 'Copy these improvements to transform your resume'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4">
                  <Zap className="w-6 h-6 text-green-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyzing Your Resume
                </h3>
                <p className="text-gray-600">
                  Our AI is generating personalized restructure suggestions based on your specific resume content...
                </p>
                <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-800 text-sm">
                    💡 This analysis is tailored specifically to your resume content and current job market trends
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Generate Suggestions</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {restructureData && !loading && !error && (
            <div className="space-y-6">
              {/* Expected Impact Summary */}
              <div className="bg-green-50 p-6 rounded-lg mb-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <Star className="w-6 h-6 text-green-600 mr-2" />
                  📈 Expected Impact of These Changes
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      +{restructureData.expected_impact?.interview_callbacks || 40}%
                    </div>
                    <div className="text-sm text-gray-600">Interview Callbacks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600">
                      +{restructureData.expected_impact?.ats_pass_rate || 60}%
                    </div>
                    <div className="text-sm text-gray-600">ATS Pass Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      +{restructureData.expected_impact?.overall_score_increase || 25}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Restructure Points */}
              <div className="space-y-6">
                {restructureData.restructure_points?.map((point: any, index: number) => (
                  <div key={point.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900">{point.category}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center ${getPriorityColor(point.priority)}`}>
                          {getPriorityIcon(point.priority)}
                          <span className="ml-1">{point.priority} priority</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Current State */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h5 className="font-medium text-red-900 mb-2">❌ Current Issue:</h5>
                        <p className="text-red-800 text-sm">{point.current}</p>
                      </div>

                      {/* Suggested Improvement */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-green-900">✅ Suggested Improvement:</h5>
                          <button
                            onClick={() => handleCopy(`${point.id}-suggestion`, point.suggested)}
                            className="flex items-center space-x-1 text-green-700 hover:text-green-900 text-sm"
                          >
                            {copiedItems.has(`${point.id}-suggestion`) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            <span>{copiedItems.has(`${point.id}-suggestion`) ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-green-800 text-sm">{point.suggested}</p>
                      </div>

                      {/* Example */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">💡 Example:</h5>
                          <button
                            onClick={() => handleCopy(`${point.id}-example`, point.example)}
                            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 text-sm"
                          >
                            {copiedItems.has(`${point.id}-example`) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            <span>{copiedItems.has(`${point.id}-example`) ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-gray-800 text-sm font-mono bg-white p-2 rounded border">
                          {point.example}
                        </p>
                      </div>

                      {/* Why This Works */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">🎯 Why This Works:</h5>
                        <p className="text-gray-800 text-sm">{point.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Steps */}
              <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Next Steps</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">1</span>
                    <span className="text-gray-700">Copy the examples above that apply to your resume</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">2</span>
                    <span className="text-gray-700">Adapt them to your specific experience and achievements</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">3</span>
                    <span className="text-gray-700">Upload your updated resume to see the improved analysis</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">4</span>
                    <span className="text-gray-700">Use the Job Matching feature to tailor for specific roles</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            💡 Pro tip: Focus on high-priority items first for maximum impact
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestructureModal;