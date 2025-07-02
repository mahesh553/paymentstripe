import  { useState, useEffect } from 'react';
import {  Target, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Zap, Star, Lightbulb, ArrowRight, Search } from 'lucide-react';
import { compareWithJobDescription } from '../services/geminiService';
import { Sparkles, Clipboard, Loader2 } from 'lucide-react';
import { marked } from 'marked';
interface JobMatchValidatorProps {
  onAnalysisComplete: (results: any, jobDescription: string) => void;
  existingResults?: any;
  existingJobDescription?: string;
}

const JobMatchValidator: React.FC<JobMatchValidatorProps> = ({ 
  onAnalysisComplete, 
  existingResults, 
  existingJobDescription 
}) => {
  const [jobDescription, setJobDescription] = useState(existingJobDescription || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResults, setMatchResults] = useState<any>(existingResults || null);
  const [error, setError] = useState<string | null>(null);
const [tailoredBullets, setTailoredBullets] = useState<string[]>([]);
const [isGenerating, setIsGenerating] = useState(false);
  // Update local state when props change
  useEffect(() => {
    if (existingResults) {
      setMatchResults(existingResults);
    }
    if (existingJobDescription) {
      setJobDescription(existingJobDescription);
    }
  }, [existingResults, existingJobDescription]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get resume text from session storage
      const resumeData = sessionStorage.getItem('currentResume');
      if (!resumeData) {
        throw new Error('No resume data found. Please upload a resume first.');
      }

      const resume = JSON.parse(resumeData);
      const results = await compareWithJobDescription(resume.text, jobDescription);
      setMatchResults(results);
      
      // Notify parent component
      onAnalysisComplete(results, jobDescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job match');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateTailoredBullets = async () => {
  if (!matchResults || !jobDescription) return;
  
  setIsGenerating(true);
  try {
    const resumeData = sessionStorage.getItem('currentResume');
    if (!resumeData) throw new Error('No resume found');
    
    const resume = JSON.parse(resumeData);
    const prompt = `Generate 5 tailored bullet points for a resume based on:
    - Job requirements: ${jobDescription}
    - Candidate's existing skills: ${matchResults.matching_skills.join(', ')}
    - Missing keywords to include: ${matchResults.missing_skills.join(', ')}
    
    Rules:
    1. Use STAR method (Situation-Task-Action-Result)
    2. Quantify achievements
    3. Include 2-3 of these keywords per bullet: ${matchResults.keyword_analysis.missing_keywords.join(', ')}
    4. Keep under 2 lines each
    
    Return ONLY a markdown bullet list. Example:
    - Improved case resolution time by 30% by implementing Salesforce Service Cloud workflows`;

    const response = await compareWithJobDescription(prompt, ""); // Reuse your existing Gemini service
    const bullets = response.split('\n').filter(b => b.trim().startsWith('-'));
    setTailoredBullets(bullets);
  } catch (error) {
    setError('Failed to generate bullet points');
  } finally {
    setIsGenerating(false);
  }
};
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getScoreBar = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-50 text-green-800 border-green-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Critical Keywords': return <Star className="w-4 h-4" />;
      case 'Experience Rephrasing': return <ArrowRight className="w-4 h-4" />;
      case 'Skills Gap': return <TrendingUp className="w-4 h-4" />;
      case 'Industry Alignment': return <Target className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Description Input */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="w-5 h-5 text-green-600 mr-2" />
          🎯 Job-Specific Analysis (Most Valuable Feature)
        </h3>
        
        <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
          <p className="text-gray-700 mb-2">
            <strong>This is where generic resume advice becomes personalized strategy.</strong>
          </p>
          <p className="text-sm text-gray-600">
            Paste any job description below to get specific insights on keyword gaps, 
            rephrasing suggestions, and exact improvements needed for that role.
          </p>
        </div>
        
        <div className="space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the complete job description here...

Example: 'We are looking for a Senior Software Engineer with 5+ years of experience in Python, React, and AWS. The ideal candidate will lead a team of 3-5 developers, implement CI/CD pipelines, and drive technical decisions for our SaaS platform...'"
            rows={10}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
          />
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jobDescription.trim()}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Job Match...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Get Job-Specific Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Match Results */}
      {matchResults && (
        <div className="space-y-6">
          {/* Overall Match Score */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-2xl font-bold text-gray-900">Job Match Analysis</h4>
              <div className={`text-4xl font-bold ${getScoreColor(matchResults.match_score)}`}>
                {matchResults.match_score}%
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${getScoreBar(matchResults.match_score)}`}
                style={{ width: `${matchResults.match_score}%` }}
              ></div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{matchResults.matching_skills?.length || 0}</div>
                <div className="text-sm text-gray-600">Matching Skills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{matchResults.missing_skills?.length || 0}</div>
                <div className="text-sm text-gray-600">Missing Skills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{matchResults.recommendations?.length || 0}</div>
                <div className="text-sm text-gray-600">Action Items</div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-medium">
                {matchResults.match_score >= 80 ? '🎉 Excellent match! Your resume aligns very well with this job. Focus on the high-priority recommendations below to maximize your chances.' :
                 matchResults.match_score >= 60 ? '👍 Good foundation! You have relevant experience. The recommendations below will significantly improve your job match.' :
                 '🔧 Opportunity for improvement! Don\'t worry - the specific suggestions below will help you tailor your resume for much better results.'}
              </p>
            </div>
          </div>

          {/* Priority Recommendations */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
            <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              Priority Action Items
            </h4>
            <div className="space-y-4">
              {matchResults.recommendations?.map((rec: any, index: number) => (
                <div key={index} className={`border-l-4 pl-4 p-4 rounded-r-lg ${
                  rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                  rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getCategoryIcon(rec.category)}
                      <h5 className="font-semibold text-gray-900 ml-2">{rec.category}</h5>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(rec.priority)}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-700">{rec.suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Matching Skills */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                ✅ Skills You Have ({matchResults.matching_skills?.length || 0})
              </h4>
              <div className="space-y-2">
                {matchResults.matching_skills?.map((skill: string, index: number) => (
                  <div key={index} className="flex items-center bg-white p-2 rounded-lg border border-green-100">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                🎯 Skills to Add ({matchResults.missing_skills?.length || 0})
              </h4>
              <div className="space-y-2">
                {matchResults.missing_skills?.map((skill: string, index: number) => (
                  <div key={index} className="flex items-center bg-white p-2 rounded-lg border border-red-100">
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    <span className="text-red-800 font-medium">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tailoring Suggestions */}
          {matchResults.tailoring_suggestions && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <ArrowRight className="w-5 h-5 text-gray-600 mr-2" />
                Specific Rephrasing Suggestions
              </h4>
              <div className="space-y-4">
                {matchResults.tailoring_suggestions.map((suggestion: any, index: number) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-2">{suggestion.section}</h5>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-red-700">Current:</span>
                        <p className="text-sm text-gray-700 bg-red-50 p-2 rounded mt-1 border border-red-100">"{suggestion.current}"</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Suggested:</span>
                        <p className="text-sm text-gray-700 bg-green-50 p-2 rounded mt-1 border border-green-100">"{suggestion.suggested}"</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Why this works:</span>
                        <p className="text-sm text-gray-700 italic">{suggestion.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ATS Optimization */}
          {matchResults.ats_optimization && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h4 className="text-xl font-bold text-gray-900 mb-4">🤖 ATS Optimization</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Keyword Coverage</h5>
                  <p className="text-gray-700 mb-3">{matchResults.ats_optimization.keyword_density}</p>
                  
                  <h5 className="font-semibold text-gray-900 mb-2">Missing Critical Terms</h5>
                  <div className="flex flex-wrap gap-2">
                    {matchResults.ats_optimization.missing_critical_terms?.map((term: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-red-50 text-red-800 rounded-full text-sm border border-red-200">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Suggested Additions</h5>
                  <ul className="space-y-2">
                    {matchResults.ats_optimization.suggested_additions?.map((addition: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-sm text-gray-700">{addition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Keyword Analysis */}
          {matchResults.keyword_analysis && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h4 className="text-xl font-bold text-gray-900 mb-4">🔍 Keyword Analysis</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-green-800 mb-3 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Found in Your Resume
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {matchResults.keyword_analysis.matched_keywords?.map((keyword: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-red-800 mb-3 flex items-center">
                    <XCircle className="w-4 h-4 mr-2" />
                    Missing from Job Description
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {matchResults.keyword_analysis.missing_keywords?.map((keyword: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-red-50 text-red-800 rounded-full text-sm font-medium border border-red-200">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
{/* Tailored Bullet Points Generator */}
<div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mt-8">
  <h4 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
    <Sparkles className="w-5 h-5 mr-2" />
    AI-Powered Bullet Point Generator
  </h4>
  
  <p className="text-purple-800 mb-4">
    Get custom bullet points that bridge your experience with the job requirements:
  </p>
  
  <button
    onClick={generateTailoredBullets}
    disabled={isGenerating || !matchResults}
    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center"
  >
    {isGenerating ? (
      <>
        <Loader2 className="animate-spin mr-2" />
        Generating...
      </>
    ) : (
      <>
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Tailored Bullet Points
      </>
    )}
  </button>
  
  {tailoredBullets.length > 0 && (
    <div className="mt-6 bg-white p-4 rounded-lg border border-purple-100">
      <h5 className="font-bold text-purple-800 mb-3">Suggested Bullet Points:</h5>
      <ul className="space-y-2">
        {tailoredBullets.map((bullet, index) => (
          <li key={index} className="flex items-start">
            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2.5 mr-3 flex-shrink-0"></span>
            <span dangerouslySetInnerHTML={{__html: marked(bullet)}} />
          </li>
        ))}
      </ul>
      
      <div className="mt-4 text-sm text-purple-700">
        <Clipboard className="inline mr-2" size={14} />
        <em>Click to copy any bullet point</em>
      </div>
    </div>
  )}
</div>
      {/* Tips */}
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <h4 className="text-lg font-semibold text-green-900 mb-3">💡 Pro Tips for Job Matching</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Copy exact phrases</strong> from job descriptions when they match your experience</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Use the same keywords</strong> the company uses, not synonyms</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Quantify everything</strong> - numbers catch both ATS and human attention</span>
            </li>
          </ul>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Address skill gaps honestly</strong> - mention learning or basic experience</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Reorder sections</strong> to highlight most relevant experience first</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Create job-specific versions</strong> of your resume for different roles</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JobMatchValidator;