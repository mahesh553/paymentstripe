import React, { useState, useEffect } from 'react';
import { FileText, Zap, Target, Users, ArrowRight, CheckCircle, Eye, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LastAnalysisModal from './LastAnalysisModal';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewLastAnalysis?: (resumeData: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onViewLastAnalysis }) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [lastResumeData, setLastResumeData] = useState<any>(null);
  const [showLastAnalysisModal, setShowLastAnalysisModal] = useState(false);

  // Check for last resume data when component mounts
  useEffect(() => {
    if (user && !subscription?.isPremium && !subscription?.isAdmin) {
      const storedResumeData = sessionStorage.getItem('currentResume');
      if (storedResumeData) {
        try {
          const resumeData = JSON.parse(storedResumeData);
          setLastResumeData(resumeData);
          console.log('Last resume data loaded on landing page:', resumeData.filename);
        } catch (error) {
          console.error('Error parsing stored resume data:', error);
        }
      }
    }
  }, [user, subscription]);

  const handleViewLastAnalysis = () => {
    if (onViewLastAnalysis && lastResumeData) {
      onViewLastAnalysis(lastResumeData);
    } else {
      setShowLastAnalysisModal(true);
    }
  };

  const handleUpgradeFromModal = () => {
    setShowLastAnalysisModal(false);
    // This would trigger the subscription modal
  };

  const handleViewAnalysisFromModal = () => {
    setShowLastAnalysisModal(false);
    if (onViewLastAnalysis && lastResumeData) {
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
            {user && !subscription?.isPremium && !subscription?.isAdmin && lastResumeData && (
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
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Last Analysis
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Free users get 1 analysis per month
                </p>
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
    </div>
  );
};

export default LandingPage;