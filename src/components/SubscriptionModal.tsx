import React, { useState } from 'react';
import { X, Crown, Check, Zap, Target, BarChart3, FileText, Star, ArrowRight, Clock, ArrowLeft } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

interface SubscriptionModalProps {
  onClose: () => void;
  feature?: string;
  title?: string;
  description?: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  onClose, 
  feature,
  title = "Unlock Premium Features",
  description = "Get 20 daily analyses and access to all resume optimization tools"
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'plans' | 'free-highlights'>('plans');
  const { subscription } = useSubscription();

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    // Redirect to Stripe setup page
    window.open('https://bolt.new/setup/stripe', '_blank');
    
    // Close modal after a delay
    setTimeout(() => {
      setIsLoading(false);
      onClose();
    }, 2000);
  };

  const handleFreeTierClick = () => {
    setCurrentView('free-highlights');
  };

  const handleBackToPlans = () => {
    setCurrentView('plans');
  };

  const freeFeatures = [
    "1 resume analysis per month",
    "1 job-specific match per month", 
    "1 keyword analysis per month",
    "1 restructure guide per month",
    "Basic scoring and feedback",
    "Standard formatting suggestions"
  ];

  const premiumFeatures = [
    "20 resume analyses per day",
    "20 job-specific matches per day", 
    "20 keyword analyses per day",
    "20 restructure guides per day",
    "Advanced AI-powered insights",
    "Resume history and tracking",
    "Priority customer support",
    "Export analysis reports"
  ];

  const freeHighlights = [
    {
      icon: <FileText className="w-8 h-8 text-green-600" />,
      title: "Smart Resume Analysis",
      description: "Get AI-powered feedback on your resume's content, structure, and overall effectiveness.",
      features: ["Overall quality score", "Section-by-section analysis", "Basic improvement suggestions"]
    },
    {
      icon: <Target className="w-8 h-8 text-green-600" />,
      title: "Job-Specific Matching",
      description: "Compare your resume against job descriptions to see how well you match specific roles.",
      features: ["Job match scoring", "Skills gap analysis", "Keyword optimization tips"]
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      title: "Keyword Analysis",
      description: "Understand which keywords are working in your resume and which ones you're missing.",
      features: ["Keyword frequency analysis", "ATS optimization insights", "Industry-specific recommendations"]
    },
    {
      icon: <Star className="w-8 h-8 text-green-600" />,
      title: "Restructure Guide",
      description: "Get specific examples and templates to improve your resume structure and content.",
      features: ["Professional templates", "Section-by-section guidance", "Before/after examples"]
    }
  ];

  const featureDescriptions = {
    job_matching: {
      icon: <Target className="w-6 h-6" />,
      title: "Job-Specific Analysis",
      description: "Compare your resume against specific job descriptions to get personalized insights and keyword optimization.",
      value: "Increase interview callbacks by 3x with targeted resume optimization"
    },
    keyword_analysis: {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Keyword Analysis",
      description: "Deep dive into keyword frequency, ATS optimization, and industry-specific terminology analysis.",
      value: "Beat ATS systems and get past the initial screening"
    },
    restructure_guide: {
      icon: <FileText className="w-6 h-6" />,
      title: "Resume Restructure Guide",
      description: "Get specific, copyable examples and templates to transform your resume structure and content.",
      value: "Professional-grade resume improvements with proven templates"
    },
    resume_history: {
      icon: <Star className="w-6 h-6" />,
      title: "Resume History & Tracking",
      description: "Save, track, and compare multiple resume versions to see your improvement over time.",
      value: "Never lose your progress and track what works best"
    }
  };

  const currentFeature = feature ? featureDescriptions[feature as keyof typeof featureDescriptions] : null;

  const formatResetTime = (resetDate: string | null) => {
    if (!resetDate) return '';
    const date = new Date(resetDate);
    const now = new Date();
    const diffHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours <= 24) {
      return `Resets in ${diffHours} hours`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `Resets in ${diffDays} days`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center">
            {currentView === 'free-highlights' && (
              <button
                onClick={handleBackToPlans}
                className="mr-3 p-1 hover:bg-green-500 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Crown className="w-8 h-8 mr-3 text-yellow-300" />
            <div>
              <h2 className="text-2xl font-bold">
                {currentView === 'free-highlights' ? 'Free Tier Features' : title}
              </h2>
              <p className="text-green-100">
                {currentView === 'free-highlights' 
                  ? 'Everything you get with your free account - 1 analysis per month for each feature'
                  : description
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-green-500 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentView === 'free-highlights' ? (
            /* Free Tier Highlights View */
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Free Account Includes</h3>
                <p className="text-gray-600">Professional resume analysis tools - 1 analysis per month for each feature</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <p className="text-green-800 font-medium">
                    🎉 You get access to ALL features! Each feature can be used once per month.
                  </p>
                </div>
              </div>

              <div className="grid gap-6">
                {freeHighlights.map((highlight, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start">
                      <div className="mr-4 mt-1">
                        {highlight.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xl font-bold text-gray-900">{highlight.title}</h4>
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                            1/month
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">{highlight.description}</p>
                        <ul className="space-y-2">
                          {highlight.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600">
                              <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready for More?</h4>
                <p className="text-gray-600 mb-4">
                  Upgrade to Premium for 20 analyses per day for each feature, plus advanced AI insights and priority support.
                </p>
                <button
                  onClick={handleBackToPlans}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  View Premium Plans
                </button>
              </div>
            </div>
          ) : (
            /* Plans Comparison View */
            <div className="space-y-6">
              {/* Feature Highlight */}
              {currentFeature && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start">
                    <div className="text-green-600 mr-4 mt-1">
                      {currentFeature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{currentFeature.title}</h3>
                      <p className="text-gray-700 mb-3">{currentFeature.description}</p>
                      <div className="bg-white p-3 rounded-lg border border-green-100">
                        <p className="text-sm font-medium text-green-800">💡 Value: {currentFeature.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Usage Status */}
              {subscription && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    Your Current Plan: {subscription.planType.toUpperCase()}
                    {subscription.isPremium && !subscription.isAdmin && (
                      <span className="ml-2 flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        Daily limits reset at midnight
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(subscription.limitsData).map(([feature, data]) => (
                      <div key={feature} className="text-center">
                        <div className={`text-2xl font-bold ${
                          data.isUnlimited ? 'text-green-600' : 
                          data.used >= data.limit ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {data.isUnlimited ? '∞' : `${data.used}/${data.limit}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {feature.replace('_', ' ')}
                        </div>
                        {!data.isUnlimited && data.resetDate && (
                          <div className="text-xs text-gray-400 mt-1">
                            {formatResetTime(data.resetDate)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Comparison */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Free Plan */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Free Plan</h3>
                    <div className="text-3xl font-bold text-gray-600">$0</div>
                    <div className="text-sm text-gray-500">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {freeFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-4 h-4 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-center">
                    <button
                      onClick={handleFreeTierClick}
                      className="w-full text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded border border-green-200 transition-colors font-medium"
                    >
                      See What's Included
                    </button>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="border-2 border-green-500 rounded-xl p-6 relative bg-green-50">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Plan</h3>
                    <div className="text-3xl font-bold text-green-600">$19</div>
                    <div className="text-sm text-gray-500">per month</div>
                    <div className="text-xs text-green-600 font-medium mt-1">20 analyses per day for each feature</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {premiumFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleUpgrade}
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Value Proposition */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Upgrade to Premium?</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🎯 Get More Interviews</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Job-specific optimization increases interview callbacks by up to 300%. 
                      With 20 daily analyses per feature, tailor your resume for multiple applications.
                    </p>
                    
                    <h4 className="font-medium text-gray-900 mb-2">🤖 Beat ATS Systems</h4>
                    <p className="text-sm text-gray-600">
                      Advanced keyword analysis ensures your resume passes through 
                      Applicant Tracking Systems that filter 75% of applications.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">⚡ Apply to More Jobs</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      20 daily analyses for each feature means you can optimize your resume for 20 different 
                      job applications every day, maximizing your opportunities.
                    </p>
                    
                    <h4 className="font-medium text-gray-900 mb-2">📈 Track Progress</h4>
                    <p className="text-sm text-gray-600">
                      Monitor your resume improvements over time and see which 
                      versions perform best for different types of roles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            💡 {currentView === 'free-highlights' ? 'Your free account gives you 1 analysis per month for each feature!' : 'Cancel anytime. No long-term commitments.'}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              {currentView === 'free-highlights' ? 'Close' : 'Maybe Later'}
            </button>
            {currentView === 'plans' && (
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
              >
                Get Premium
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;