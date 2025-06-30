import React, { useState, useEffect } from 'react';
import { FileText, Zap, Target, Users, ArrowRight, CheckCircle, Eye, Calendar, Crown, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getUserResumes } from '../lib/supabase';
import LastAnalysisModal from './LastAnalysisModal';
import SubscriptionModal from './SubscriptionModal';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewLastAnalysis?: (resumeData: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onViewLastAnalysis }) => {
  const { user } = useAuth();
  const { subscription, getRemainingUsage } = useSubscription();
  const [lastResumeData, setLastResumeData] = useState<any>(null);
  const [showLastAnalysisModal, setShowLastAnalysisModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingLastResume, setLoadingLastResume] = useState(false);

  // Fetch last resume data from database when component mounts
  useEffect(() => {
    const fetchLastResumeFromDatabase = async () => {
      if (!user) return;

      setLoadingLastResume(true);
      try {
        console.log('Fetching last resume from database for user:', user.email);
        
        // Get user's resumes from database, ordered by most recent
        const { data: resumes, error } = await getUserResumes(user.id);
        
        if (error) {
          console.error('Error fetching user resumes:', error);
          return;
        }

        if (resumes && resumes.length > 0) {
          // Get the most recent resume
          const mostRecentResume = resumes[0];
          console.log('Found most recent resume:', mostRecentResume.filename);
          
          // Check if there's stored analysis results in session storage for this resume
          const storedAnalysisKey = `analysis_${mostRecentResume.id}`;
          const storedAnalysis = sessionStorage.getItem(storedAnalysisKey);
          
          let analysisResults = null;
          if (storedAnalysis) {
            try {
              analysisResults = JSON.parse(storedAnalysis);
              console.log('Found stored analysis results for resume');
            } catch (error) {
              console.error('Error parsing stored analysis:', error);
            }
          }

          // Set the resume data with analysis if available
          const resumeData = {
            ...mostRecentResume,
            text: mostRecentResume.original_text,
            analysisResults: analysisResults
          };
          
          setLastResumeData(resumeData);
          console.log('Last resume data loaded from database:', resumeData.filename);
        } else {
          console.log('No resumes found in database');
          setLastResumeData(null);
        }
      } catch (error) {
        console.error('Error fetching last resume from database:', error);
      } finally {
        setLoadingLastResume(false);
      }
    };

    // Only fetch when user first lands on the app
    if (user && !loadingLastResume) {
      fetchLastResumeFromDatabase();
    }
  }, [user]);

  // Check for quota exhaustion and show modal logic
  useEffect(() => {
    const checkUserResumeStatus = async () => {
      if (!user || !subscription || loadingLastResume) return;

      console.log('Checking user resume status...', { 
        user: user.email, 
        subscription: subscription.planType,
        isPremium: subscription.isPremium,
        isAdmin: subscription.isAdmin,
        hasLastResumeData: !!lastResumeData
      });

      // Check if user has exhausted their quota
      const remainingAnalyses = getRemainingUsage('resume_analysis');
      const totalLimit = subscription.isPremium || subscription.isAdmin ? -1 : 1;
      
      console.log('Usage check:', { 
        remainingAnalyses, 
        totalLimit,
        isPremium: subscription.isPremium,
        isAdmin: subscription.isAdmin
      });

      // If user is free tier, has no remaining analyses, and has previous resume data
      if (!subscription.isPremium && !subscription.isAdmin && remainingAnalyses === 0 && lastResumeData) {
        console.log('Showing last analysis modal for free user with exhausted quota');
        // Show modal asking if they want to see their last analysis
        setShowLastAnalysisModal(true);
      } else {
        console.log('Not showing modal:', {
          isPremium: subscription.isPremium,
          isAdmin: subscription.isAdmin,
          remainingAnalyses,
          hasLastResumeData: !!lastResumeData
        });
      }
    };

    // Only check when all data is loaded
    if (user && subscription && !loadingLastResume) {
      // Add a small delay to ensure all context is loaded
      setTimeout(checkUserResumeStatus, 500);
    }
  }, [user, subscription, getRemainingUsage, lastResumeData, loadingLastResume]);

  const handleViewLastAnalysis = () => {
    if (onViewLastAnalysis && lastResumeData) {
      // Store the resume data in session storage for the analysis flow
      sessionStorage.setItem('currentResume', JSON.stringify({
        ...lastResumeData,
        text: lastResumeData.original_text || lastResumeData.text
      }));
      
      onViewLastAnalysis(lastResumeData);
    } else {
      setShowLastAnalysisModal(true);
    }
  };

  const handleUpgradeFromModal = () => {
    setShowLastAnalysisModal(false);
    setShowUpgradeModal(true);
  };

  const handleViewAnalysisFromModal = () => {
    setShowLastAnalysisModal(false);
    if (onViewLastAnalysis && lastResumeData) {
      // Store the resume data in session storage for the analysis flow
      sessionStorage.setItem('currentResume', JSON.stringify({
        ...lastResumeData,
        text: lastResumeData.original_text || lastResumeData.text
      }));
      
      onViewLastAnalysis(lastResumeData);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const features = [
    {
      icon: <FileText className="w-8 h-8 text-gray-600" />,
      title: "Smart Resume Analysis",
      description: "AI-powered analysis that provides detailed feedback on your resume's content, structure, and effectiveness."
    },
    {
      icon: <Target className="w-8 h-8 text-green-600" />,
      title: "Job Matching",
      description: "Compare your resume against specific job descriptions to see how well you match and what to improve."
    },
    {
      icon: <Zap className="w-8 h-8 text-gray-600" />,
      title: "Instant Feedback",
      description: "Get comprehensive analysis results in seconds, not hours. Improve your resume efficiently."
    },
    {
      icon: <Users className="w-8 h-8 text-gray-600" />,
      title: "Professional Insights",
      description: "Benefit from analysis based on hiring manager preferences and industry best practices."
    }
  ];

  const benefits = [
    "Increase interview chances by up to 3x",
    "Get past ATS (Applicant Tracking Systems)",
    "Optimize for specific job requirements",
    "Professional formatting recommendations",
    "Skills gap analysis and suggestions"
  ];

  // Check if user has exhausted their quota
  const remainingAnalyses = getRemainingUsage('resume_analysis');
  const isQuotaExhausted = user && !subscription?.isPremium && !subscription?.isAdmin && remainingAnalyses === 0;
  const hasLastResumeData = !!lastResumeData;

  console.log('Landing page state:', {
    user: !!user,
    isPremium: subscription?.isPremium,
    isAdmin: subscription?.isAdmin,
    remainingAnalyses,
    isQuotaExhausted,
    hasLastResumeData,
    lastResumeFilename: lastResumeData?.filename,
    loadingLastResume
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Quota Exhausted Banner for Free Users with Last Resume */}
          {isQuotaExhausted && hasLastResumeData && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Lock className="w-6 h-6 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Free Analysis Limit Reached</h3>
                    <p className="text-red-700 mt-1">
                      You've used your free monthly analysis. Upgrade to Premium for 20 analyses per day.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleViewLastAnalysis}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Last Analysis
                  </button>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Perfect Your Resume with
              <span className="text-green-600 block">AI-Powered Analysis</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get instant, professional feedback on your resume. Our AI analyzes structure, content, 
              and keywords to help you land more interviews and your dream job.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={onGetStarted}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                {user ? 'Analyze New Resume' : 'Analyze My Resume'}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="bg-white text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors">
                See Example Analysis
              </button>
            </div>

            {/* Last Resume Analysis Card for Free Users */}
            {user && !subscription?.isPremium && !subscription?.isAdmin && hasLastResumeData && !isQuotaExhausted && (
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto border border-gray-200 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 text-green-600 mr-3" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Your Last Resume</h3>
                      <p className="text-sm text-gray-500 truncate max-w-48">
                        {lastResumeData.filename}
                      </p>
                    </div>
                  </div>
                  {lastResumeData.analysisResults && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {lastResumeData.analysisResults.overall_score}
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Analyzed on {formatDate(lastResumeData.created_at)}</span>
                </div>
                
                <button
                  onClick={handleViewLastAnalysis}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                  disabled={loadingLastResume}
                >
                  {loadingLastResume ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      View Last Analysis
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Free users get 1 analysis per month
                </p>
              </div>
            )}

            {/* Loading indicator for last resume */}
            {user && loadingLastResume && (
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto border border-gray-200 mt-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                  <span className="text-gray-600">Loading your last resume...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Resume Analyzer?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI technology meets professional expertise to give you the edge in your job search.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-shadow">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Stand Out From the Competition
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                In today's competitive job market, your resume needs to be perfect. Our AI-powered 
                analysis helps you optimize every aspect of your resume to maximize your chances of success.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">85%</div>
                <p className="text-gray-600 mb-6">of users get more interviews after optimization</p>
                
                <div className="text-3xl font-bold text-green-600 mb-2">2.5x</div>
                <p className="text-gray-600 mb-6">faster job search process on average</p>
                
                <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
                <p className="text-gray-600">customer satisfaction rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Boost Your Career?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of professionals who have improved their resumes and landed better jobs.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Your Free Analysis
          </button>
        </div>
      </div>

      {/* Last Analysis Modal */}
      {showLastAnalysisModal && lastResumeData && (
        <LastAnalysisModal
          onClose={() => setShowLastAnalysisModal(false)}
          onViewAnalysis={handleViewAnalysisFromModal}
          onUpgrade={handleUpgradeFromModal}
          resumeData={lastResumeData}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature="resume_analysis"
          title="Upgrade to Continue"
          description="You've reached your free analysis limit. Upgrade to get 20 analyses per day."
        />
      )}
    </div>
  );
};

export default LandingPage;