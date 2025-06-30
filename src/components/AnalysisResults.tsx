import  { useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Target, Lightbulb, Star, FileText, Briefcase, BarChart3, Eye, Crown } from 'lucide-react';
import KeywordHighlighter from './KeywordHighlighter';
import JobMatchValidator from './JobMatchValidator';
import FeatureGate from './FeatureGate';
import UsageIndicator from './UsageIndicator';
import SubscriptionModal from './SubscriptionModal';

interface AnalysisResultsProps {
  results: any;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState('job-match');
  const [jobMatchResults, setJobMatchResults] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const tabs = [
    { 
      id: 'job-match', 
      name: '🎯 Job-Specific Analysis', 
      icon: <Briefcase className="w-4 h-4" />, 
      priority: true,
      premium: true
    },
    { id: 'overview', name: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'sections', name: 'Section Analysis', icon: <Target className="w-4 h-4" /> },
    { 
      id: 'keywords', 
      name: 'Keywords', 
      icon: <Star className="w-4 h-4" />,
      premium: true
    },
    { 
      id: 'improvement', 
      name: 'AI Suggestions', 
      icon: <Lightbulb className="w-4 h-4" />,
      premium: true
    }
  ];

  // Check if job matching has been performed
  const hasJobMatchScore = jobMatchResults?.match_score !== null && jobMatchResults?.match_score !== undefined;
  const displayJobMatchScore = hasJobMatchScore ? jobMatchResults.match_score : (results.job_match_score || null);

  const handleJobMatchComplete = (matchResults: any, description: string) => {
    setJobMatchResults(matchResults);
    setJobDescription(description);
  };

  const handlePreviewClick = () => {
    setShowUpgradeModal(true);
  };

  // Mock preview data for job matching
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
      <div className="bg-green-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎯 Job-Specific Analysis</h2>
            <p className="text-green-100">
              Get the most value by analyzing your resume against specific job descriptions. 
              This is where generic advice becomes personalized strategy.
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {displayJobMatchScore ? `${displayJobMatchScore}%` : '—'}
            </div>
            <div className="text-sm text-green-100">
              {displayJobMatchScore ? 'Job Match Score' : 'Upload job description below'}
            </div>
          </div>
        </div>
      </div>

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
            <div className={`text-4xl font-bold ${getScoreColor(results.ats_score || 75)} mb-2`}>
              {results.ats_score || 75}
            </div>
            <div className="text-sm text-gray-500 mb-4">ATS Compatibility</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(results.ats_score || 75)}`}
                style={{ width: `${results.ats_score || 75}%` }}
              ></div>
            </div>
          </div>

          {/* Industry Alignment */}
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(results.industry_score || 70)} mb-2`}>
              {results.industry_score || 70}
            </div>
            <div className="text-sm text-gray-500 mb-4">Industry Alignment</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(results.industry_score || 70)}`}
                style={{ width: `${results.industry_score || 70}%` }}
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
            <div className="text-2xl font-bold text-green-600">{results.strengths?.length || 0}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-semibold text-yellow-800">Quick Wins</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{results.quick_wins?.length || 3}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Lightbulb className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-800">AI Suggestions</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{results.recommendations?.length || 0}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Potential Impact</span>
            </div>
            <div className="text-2xl font-bold text-green-600">+{results.potential_improvement || 25}%</div>
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
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
                {tab.priority && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    !
                  </span>
                )}
                {tab.premium && (
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
            <FeatureGate 
              feature="job_matching"
              title="Unlock Job-Specific Analysis"
              description="Get personalized insights by comparing your resume against specific job descriptions"
              fallback={
                <div className="space-y-6">
                  {/* Preview Section */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-green-900 flex items-center">
                        <Eye className="w-6 h-6 mr-2" />
                        🎯 Job Analysis Preview
                      </h3>
                      <button
                        onClick={handlePreviewClick}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Unlock Full Analysis
                      </button>
                    </div>
                    
                    <p className="text-green-800 mb-4">
                      Here's a preview of what you'll get with job-specific analysis:
                    </p>

                    {/* Preview Match Score */}
                    <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Sample Job Match Score</span>
                        <div className="text-2xl font-bold text-green-600">{previewJobMatchData.match_score}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${previewJobMatchData.match_score}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Preview Insights */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                          Matching Skills ({previewJobMatchData.matching_skills.length})
                        </h4>
                        <div className="space-y-1">
                          {previewJobMatchData.matching_skills.map((skill, index) => (
                            <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                          Skills to Add ({previewJobMatchData.missing_skills.length})
                        </h4>
                        <div className="space-y-1">
                          {previewJobMatchData.missing_skills.map((skill, index) => (
                            <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview Key Insights */}
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Key Insights Preview</h4>
                      <div className="space-y-2">
                        {previewJobMatchData.preview_insights.map((insight, index) => (
                          <div key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-gray-700 text-sm">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upgrade CTA */}
                    <div className="bg-green-600 rounded-lg p-4 text-white text-center mt-4">
                      <h4 className="font-bold mb-2">🚀 Get the Complete Analysis</h4>
                      <p className="text-green-100 text-sm mb-3">
                        Unlock detailed keyword analysis, specific rephrasing suggestions, 
                        ATS optimization tips, and much more!
                      </p>
                      <button
                        onClick={handlePreviewClick}
                        className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        Upgrade to Premium - $19/month
                      </button>
                    </div>
                  </div>

                  {/* Feature Benefits */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      What You'll Get with Premium Job Analysis:
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">Exact Keyword Matches</h4>
                            <p className="text-sm text-gray-600">See which keywords from the job description appear in your resume</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">Specific Rephrasing</h4>
                            <p className="text-sm text-gray-600">Get exact suggestions on how to rephrase your experience</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">ATS Optimization</h4>
                            <p className="text-sm text-gray-600">Ensure your resume passes Applicant Tracking Systems</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">Skills Prioritization</h4>
                            <p className="text-sm text-gray-600">Know which skills to highlight for this specific role</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">Experience Relevance</h4>
                            <p className="text-sm text-gray-600">Score how well your experience matches the job requirements</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-gray-900">20 Analyses Per Day</h4>
                            <p className="text-sm text-gray-600">Optimize for multiple job applications daily</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-900 mb-3 flex items-center">
                    <Target className="w-6 h-6 mr-2" />
                    🚀 Maximize Your Interview Chances
                  </h3>
                  <p className="text-green-800 mb-4">
                    This is the most valuable feature - analyze your resume against specific job descriptions 
                    to get personalized, actionable insights that generic resume advice can't provide.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-green-100">
                      <h4 className="font-semibold text-gray-900 mb-2">What You'll Get:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Exact keyword matches and gaps</li>
                        <li>• Specific rephrasing suggestions</li>
                        <li>• Skills prioritization for this role</li>
                        <li>• Experience relevance scoring</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-100">
                      <h4 className="font-semibold text-gray-900 mb-2">Why It Matters:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Beat ATS systems with right keywords</li>
                        <li>• Stand out from generic applications</li>
                        <li>• Show perfect role alignment</li>
                        <li>• Increase interview callbacks by 3x</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <JobMatchValidator 
                  onAnalysisComplete={handleJobMatchComplete}
                  existingResults={jobMatchResults}
                  existingJobDescription={jobDescription}
                />
              </div>
            </FeatureGate>
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
            <FeatureGate 
              feature="keyword_analysis"
              title="Unlock Advanced Keyword Analysis"
              description="Get detailed keyword frequency analysis, ATS optimization insights, and industry-specific recommendations"
              fallback={null} // Don't show anything if user doesn't have access
            >
              <KeywordHighlighter keywords={results.keywords || []} />
            </FeatureGate>
          )}

          {activeTab === 'improvement' && (
            <FeatureGate 
              feature="keyword_analysis"
              title="Unlock AI-Powered Suggestions"
              description="Get personalized improvement recommendations based on current hiring trends and successful resume patterns"
              fallback={null} // Don't show anything if user doesn't have access
            >
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

                {/* Content Enhancements */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Content Enhancements</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(results.content_enhancements || [
                      {
                        area: "Skills Section",
                        current_state: "Basic skill list",
                        recommended_change: "Organize by category with proficiency levels",
                        reason: "Easier for recruiters to scan and assess fit"
                      }
                    ]).map((enhancement: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-2">{enhancement.area}</h5>
                        <div className="text-sm space-y-2">
                          <p><strong>Current:</strong> {enhancement.current_state}</p>
                          <p><strong>Recommended:</strong> {enhancement.recommended_change}</p>
                          <p className="text-gray-700"><strong>Why:</strong> {enhancement.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FeatureGate>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature="job_matching"
          title="Unlock Job-Specific Analysis"
          description="Get personalized insights by comparing your resume against specific job descriptions"
        />
      )}
    </div>
  );
};

export default AnalysisResults;