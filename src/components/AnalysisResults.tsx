import React, { useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Target, Lightbulb, Star, FileText, Briefcase, BarChart3, Eye, Crown, Lock } from 'lucide-react';
import KeywordHighlighter from './KeywordHighlighter';
import JobMatchValidator from './JobMatchValidator';
import FeatureGate from './FeatureGate'; // Make sure this is correctly used if needed elsewhere
import SubscriptionModal from './SubscriptionModal';
import { useSubscription } from '../context/SubscriptionContext';

interface AnalysisResultsProps {
  results: any; // This likely contains the general resume analysis (overall_score, sections, etc.)
  // If you are passing jobMatchResults as a prop *from the parent* (e.g., AnalysisDashboard)
  // then include it here, otherwise, it should only be managed by the component's state.
  // For this fix, we assume jobMatchResults is primarily managed within this component's state.
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState('job-match');
  // Initialize jobMatchResults to an object with a default match_score
  // This prevents 'null' errors when accessing properties
  const [jobMatchResults, setJobMatchResults] = useState<any>({ match_score: null });
  const [jobDescription, setJobDescription] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { subscription, getRemainingUsage } = useSubscription();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Check if user can access premium features
  const canUseJobMatching = subscription?.isPremium || subscription?.isAdmin || getRemainingUsage('job_matching') > 0;
  const canUseKeywordAnalysis = subscription?.isPremium || subscription?.isAdmin || getRemainingUsage('keyword_analysis') > 0;
  const canUseAISuggestions = subscription?.isPremium || subscription?.isAdmin || getRemainingUsage('keyword_analysis') > 0;

  // Check if user is free tier with exceeded quota
  const isFreeUserQuotaExceeded = !subscription?.isPremium && !subscription?.isAdmin &&
    getRemainingUsage('job_matching') === 0 && getRemainingUsage('keyword_analysis') === 0;

  const tabs = [
    {
      id: 'job-match',
      name: '🎯 Job-Specific Analysis',
      icon: <Briefcase className="w-4 h-4" />,
      priority: true,
      premium: true,
      disabled: !canUseJobMatching
    },
    { id: 'overview', name: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'sections', name: 'Section Analysis', icon: <Target className="w-4 h-4" /> },
    {
      id: 'keywords',
      name: 'Keywords',
      icon: <Star className="w-4 h-4" />,
      premium: true,
      disabled: !canUseKeywordAnalysis
    },
    {
      id: 'improvement',
      name: 'AI Suggestions',
      icon: <Lightbulb className="w-4 h-4" />,
      premium: true,
      disabled: !canUseAISuggestions
    }
  ];

  // Fix: Directly use jobMatchResults.match_score and check for its existence
  const displayJobMatchScore = jobMatchResults?.match_score !== null && jobMatchResults?.match_score !== undefined
    ? jobMatchResults.match_score
    : null; // Set to null if not available yet

  const handleJobMatchComplete = (matchResults: any, description: string) => {
    // Ensure matchResults always has a match_score, even if 0 or default
    setJobMatchResults({ ...matchResults, match_score: matchResults.match_score || 0 });
    setJobDescription(description);
  };

  const handlePreviewClick = () => {
    setShowUpgradeModal(true);
  };

  const handleTabClick = (tabId: string, isDisabled: boolean) => {
    if (isDisabled) {
      setShowUpgradeModal(true);
    } else {
      setActiveTab(tabId);
    }
  };

  // Mock preview data for job matching (used for locked states)
  // This data is separate from actual analysis results.
  const previewJobMatchData = {
    match_score: 72,
    matching_skills: ["Project Management", "Leadership", "Communication"],
    missing_skills: ["Python", "Data Analysis", "Machine Learning"],
    preview_insights: [
      "Your resume matches 60% of the required keywords",
      "Strong alignment with leadership requirements",
      "Missing 3 critical technical skills",
      "Experience section could be better optimized"
    ]
  };

  return (
    <div className="space-y-6">
      {/* Job Matching Priority Banner */}
      <div className={`rounded-xl shadow-lg p-6 text-white ${canUseJobMatching ? 'bg-green-600' : 'bg-gray-400'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              🎯 Job-Specific Analysis
              {!canUseJobMatching && <Lock className="w-5 h-5 ml-2" />}
            </h2>
            <p className={canUseJobMatching ? 'text-green-100' : 'text-gray-200'}>
              {canUseJobMatching
                ? "Get the most value by analyzing your resume against specific job descriptions. This is where generic advice becomes personalized strategy."
                : isFreeUserQuotaExceeded
                  ? "You've reached your free monthly limit for job-specific analysis. Upgrade to Premium for unlimited access."
                  : "Upgrade to Premium to unlock job-specific analysis and personalized optimization strategies."
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {/* Corrected: Only display jobMatchResults.match_score if available and feature is enabled */}
              {canUseJobMatching && displayJobMatchScore !== null ? `${displayJobMatchScore}%` : '—'}
            </div>
            <div className={`text-sm ${canUseJobMatching ? 'text-green-100' : 'text-gray-200'}`}>
              {canUseJobMatching && displayJobMatchScore !== null ? 'Job Match Score' : 'Premium Feature'}
            </div>
          </div>
        </div>
        {!canUseJobMatching && (
          <div className="mt-4">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-white text-gray-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              {isFreeUserQuotaExceeded ? 'Upgrade to Continue' : 'Upgrade to Unlock'}
            </button>
          </div>
        )}
      </div>

      {/* Quota Exceeded Warning for Free Users */}
      {isFreeUserQuotaExceeded && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start">
            <Crown className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-900 font-semibold mb-1">Free Monthly Limit Reached</h3>
              <p className="text-yellow-800 text-sm mb-3">
                You can still view your previous analysis results, but premium features like job-specific analysis
                and keyword optimization are now limited. Upgrade to Premium for unlimited access.
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overall Score Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Overall Score */}
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(results.overall_score)} mb-2`}>
              {results.overall_score}
            </div>
            <div className="text-sm text-gray-500 mb-4">Resume Quality</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(results.overall_score)}`}
                style={{ width: `${results.overall_score}%` }}
              ></div>
            </div>
          </div>

          {/* ATS Compatibility */}
          <div className="text-center">
            {/* Added nullish coalescing to safely default if results.ats_score is null/undefined */}
            <div className={`text-4xl font-bold ${getScoreColor(results.ats_score ?? 75)} mb-2`}>
              {results.ats_score ?? 75}
            </div>
            <div className="text-sm text-gray-500 mb-4">ATS Compatibility</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(results.ats_score ?? 75)}`}
                style={{ width: `${results.ats_score ?? 75}%` }}
              ></div>
            </div>
          </div>

          {/* Industry Alignment */}
          <div className="text-center">
            {/* Added nullish coalescing to safely default if results.industry_score is null/undefined */}
            <div className={`text-4xl font-bold ${getScoreColor(results.industry_score ?? 70)} mb-2`}>
              {results.industry_score ?? 70}
            </div>
            <div className="text-sm text-gray-500 mb-4">Industry Alignment</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(results.industry_score ?? 70)}`}
                style={{ width: `${results.industry_score ?? 70}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Impact Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Strong Points</span>
            </div>
            {/* Use optional chaining and nullish coalescing for safety */}
            <div className="text-2xl font-bold text-green-600">{results.strengths?.length ?? 0}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-semibold text-yellow-800">Quick Wins</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{results.quick_wins?.length ?? 3}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Lightbulb className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-800">AI Suggestions</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{results.recommendations?.length ?? 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Potential Impact</span>
            </div>
            <div className="text-2xl font-bold text-green-600">+{results.potential_improvement ?? 25}%</div>
          </div>
        </div>
      </div>

      {/* Unified Tabs Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.disabled || false)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm whitespace-nowrap relative ${
                  activeTab === tab.id && !tab.disabled
                    ? 'border-green-500 text-green-600'
                    : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={tab.disabled}
              >
                {tab.icon}
                <span>{tab.name}</span>
                {tab.disabled && (
                  <Lock className="w-3 h-3 ml-1" />
                )}
                {tab.priority && !tab.disabled && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    !
                  </span>
                )}
                {tab.premium && !tab.disabled && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    ★
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'job-match' && (
            canUseJobMatching ? (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
                  <p className="text-gray-700 mb-2">
                    <strong>This is where generic resume advice becomes personalized strategy.</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Paste any job description below to get specific insights on keyword gaps,
                    rephrasing suggestions, and exact improvements needed for that role.
                  </p>
                </div>
                <JobMatchValidator
                  onAnalysisComplete={handleJobMatchComplete}
                  existingResults={jobMatchResults}
                  existingJobDescription={jobDescription}
                  // Pass the general results so JobMatchValidator can use resumeText from it if needed
                  generalAnalysisResults={results}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Disabled State for Free Users with Exceeded Quota */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                      <Lock className="w-6 h-6 mr-2" />
                      🎯 Job Analysis - {isFreeUserQuotaExceeded ? 'Monthly Limit Reached' : 'Premium Feature'}
                    </h3>
                    <button
                      onClick={handlePreviewClick}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {isFreeUserQuotaExceeded ? 'Upgrade to Continue' : 'Unlock Full Analysis'}
                    </button>
                  </div>

                  <p className="text-gray-600 mb-4">
                    {isFreeUserQuotaExceeded
                      ? "You've used your free monthly job analysis. Upgrade to Premium for unlimited job-specific analysis."
                      : "Job-specific analysis is available with Premium. Here's what you're missing:"
                    }
                  </p>

                  {/* Preview Benefits */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200 opacity-75">
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                        Keyword Matching
                      </h4>
                      <p className="text-sm text-gray-600">See exactly which keywords from job descriptions match your resume</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200 opacity-75">
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                        Skills Gap Analysis
                      </h4>
                      <p className="text-sm text-gray-600">Identify missing skills and get specific recommendations</p>
                    </div>
                  </div>

                  {/* Upgrade CTA */}
                  <div className="bg-green-600 rounded-lg p-4 text-white text-center">
                    <h4 className="font-bold mb-2">🚀 Unlock Job-Specific Analysis</h4>
                    <p className="text-green-100 text-sm mb-3">
                      {isFreeUserQuotaExceeded
                        ? "Continue analyzing your resume against specific job descriptions with Premium"
                        : "Get personalized insights for every job application with Premium"
                      }
                    </p>
                    <button
                      onClick={handlePreviewClick}
                      className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Upgrade to Premium - $19/month
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Strengths */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  Your Resume Strengths
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Added optional chaining */}
                  {results.strengths?.map((strength: string, index: number) => (
                    <div key={index} className="flex items-start bg-green-50 p-3 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Wins */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 text-yellow-600 mr-2" />
                  Quick Wins (High Impact, Low Effort)
                </h3>
                <div className="space-y-3">
                  {/* Added optional chaining and a fallback array */}
                  {(results.quick_wins || [
                    "Add 2-3 quantified achievements to your experience section",
                    "Include 3-5 industry-specific keywords in your skills section",
                    "Write a 2-line professional summary highlighting your top achievement"
                  ]).map((win: string, index: number) => (
                    <div key={index} className="flex items-start bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-gray-700">{win}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas for Improvement */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
                  Strategic Improvements
                </h3>
                <div className="space-y-2">
                  {/* Added optional chaining */}
                  {results.improvements?.map((improvement: string, index: number) => (
                    <div key={index} className="flex items-start bg-red-50 p-3 rounded-lg border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-6">
              {/* Added optional chaining for results.sections */}
              {Object.entries(results.sections || {}).map(([sectionName, section]: [string, any]) => (
                <div key={sectionName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {sectionName.replace('_', ' ')}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreBgColor(section.score)} ${getScoreColor(section.score)} border ${
                        section.score >= 80 ? 'border-green-200' :
                        section.score >= 60 ? 'border-yellow-200' : 'border-red-200'
                      }`}>
                        {section.score}/100
                      </span>
                      {section.present ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{section.feedback}</p>
                  {section.suggestions && section.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Actionable Suggestions:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        {section.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'keywords' && (
            canUseKeywordAnalysis ? (
              <KeywordHighlighter keywords={results.keywords || []} />
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-8 text-center">
                <div className="bg-gray-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  Keyword Analysis - {isFreeUserQuotaExceeded ? 'Monthly Limit Reached' : 'Premium Feature'}
                </h3>

                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isFreeUserQuotaExceeded
                    ? "You've used your free monthly keyword analysis. Upgrade to Premium for unlimited access to advanced keyword optimization."
                    : "Unlock advanced keyword analysis to optimize your resume for ATS systems and improve your job search success."
                  }
                </p>

                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {isFreeUserQuotaExceeded ? 'Upgrade to Continue' : 'Upgrade to Premium'}
                </button>
              </div>
            )
          )}

          {activeTab === 'improvement' && (
            canUseAISuggestions ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    🤖 AI-Powered Improvement Suggestions
                  </h3>
                  <p className="text-gray-700 mb-4">
                    These suggestions are generated based on current hiring trends, ATS optimization,
                    and successful resume patterns in your industry.
                  </p>
                </div>

                {/* Priority Improvements */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Priority Improvements</h4>
                  <div className="space-y-4">
                    {/* Added optional chaining and a fallback array */}
                    {(results.priority_improvements || [
                      {
                        section: "Professional Summary",
                        issue: "Generic summary statement",
                        suggestion: "Replace with 2-3 lines highlighting your biggest achievement with numbers",
                        impact: "high"
                      },
                      {
                        section: "Work Experience",
                        issue: "Missing quantified results",
                        suggestion: "Add specific metrics (percentages, dollar amounts, team sizes) to each role",
                        impact: "high"
                      }
                    ]).map((improvement: any, index: number) => (
                      <div key={index} className={`border-l-4 pl-4 p-4 rounded-r-lg ${
                        improvement.impact === 'high' ? 'border-red-500 bg-red-50' :
                        improvement.impact === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{improvement.section}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            improvement.impact === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                            improvement.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            {improvement.impact} impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Issue:</strong> {improvement.issue}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Suggestion:</strong> {improvement.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-8 text-center">
                <div className="bg-gray-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  AI Suggestions - {isFreeUserQuotaExceeded ? 'Monthly Limit Reached' : 'Premium Feature'}
                </h3>

                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isFreeUserQuotaExceeded
                    ? "You've used your free monthly AI suggestions. Upgrade to Premium for unlimited personalized recommendations."
                    : "Get personalized improvement recommendations powered by AI and based on current hiring trends."
                  }
                </p>

                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {isFreeUserQuotaExceeded ? 'Upgrade to Continue' : 'Upgrade to Premium'}
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature="job_matching" // This could be dynamic based on which tab triggered the modal
          title={isFreeUserQuotaExceeded ? "Monthly Limit Reached" : "Unlock Premium Features"}
          description={isFreeUserQuotaExceeded
            ? "You've used your free monthly analysis limit. Upgrade to Premium for unlimited access to all features."
            : "Get access to job-specific analysis, keyword optimization, and AI-powered suggestions"
          }
        />
      )}
    </div>
  );
};

export default AnalysisResults;