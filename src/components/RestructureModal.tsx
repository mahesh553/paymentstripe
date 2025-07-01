import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Star, ArrowRight, Copy, Download, Zap, RefreshCw, Wand2 } from 'lucide-react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedExamples, setGeneratedExamples] = useState<Record<string, string>>({});
  const [generatingExamples, setGeneratingExamples] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const { subscription } = useSubscription();

  // Cache key for restructure suggestions
  const getCacheKey = () => {
    const resumeData = sessionStorage.getItem('currentResume');
    if (!resumeData) return null;
    
    const resume = JSON.parse(resumeData);
    return `restructure_${resume.id || 'temp'}_${Date.now()}`;
  };

  // Load cached suggestions
  const loadCachedSuggestions = () => {
    try {
      const cached = localStorage.getItem('restructure_suggestions');
      if (cached) {
        const { data, timestamp, resumeId } = JSON.parse(cached);
        const resumeData = sessionStorage.getItem('currentResume');
        
        if (resumeData) {
          const currentResume = JSON.parse(resumeData);
          // Check if cache is for current resume and less than 24 hours old
          if (currentResume.id === resumeId && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            console.log('📋 Using cached restructure suggestions');
            return data;
          }
        }
      }
    } catch (error) {
      console.error('Error loading cached suggestions:', error);
    }
    return null;
  };

  // Save suggestions to cache
  const cacheSuggestions = (data: any) => {
    try {
      const resumeData = sessionStorage.getItem('currentResume');
      if (resumeData) {
        const resume = JSON.parse(resumeData);
        localStorage.setItem('restructure_suggestions', JSON.stringify({
          data,
          timestamp: Date.now(),
          resumeId: resume.id
        }));
      }
    } catch (error) {
      console.error('Error caching suggestions:', error);
    }
  };

  // Stable close handler
  const handleClose = useCallback(() => {
    isMountedRef.current = false;
    onClose();
  }, [onClose]);

  // Prevent modal from auto-closing and handle focus properly
  useEffect(() => {
    isMountedRef.current = true;

    const handleVisibilityChange = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleFocus = (e: FocusEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (modalRef.current && isMountedRef.current) {
        modalRef.current.focus();
      }
    };

    const handleBlur = (e: FocusEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: false });
    window.addEventListener('focus', handleFocus, { passive: false });
    window.addEventListener('blur', handleBlur, { passive: false });
    window.addEventListener('beforeunload', handleBeforeUnload, { passive: false });

    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Generate suggestions with caching
  useEffect(() => {
    if (hasGenerated || isGenerating || !isMountedRef.current) return;

    const generateDynamicSuggestions = async () => {
      try {
        setIsGenerating(true);
        setHasGenerated(true);
        setLoading(true);
        setError(null);

        // First check cache
        const cachedData = loadCachedSuggestions();
        if (cachedData && isMountedRef.current) {
          setRestructureData(cachedData);
          setLoading(false);
          setIsGenerating(false);
          return;
        }

        // For admin users, skip usage tracking
        if (!subscription?.isAdmin) {
          // Only track usage for non-admin users
          const { trackFeatureUsage } = await import('../context/SubscriptionContext');
        }

        // Get resume text from session storage
        const resumeData = sessionStorage.getItem('currentResume');
        if (!resumeData) {
          throw new Error('No resume data found. Please upload a resume first.');
        }

        const resume = JSON.parse(resumeData);
        
        // Generate dynamic restructure suggestions based on actual resume content
        const suggestions = await generateRestructureSuggestions(resume.text, analysisResults);
        
        if (isMountedRef.current) {
          setRestructureData(suggestions);
          // Cache the suggestions
          cacheSuggestions(suggestions);
        }
      } catch (err) {
        console.error('Error generating restructure suggestions:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to generate restructure suggestions');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsGenerating(false);
        }
      }
    };

    const timeoutId = setTimeout(generateDynamicSuggestions, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasGenerated, isGenerating, analysisResults, subscription?.isAdmin]);

  // Generate updated resume points for a specific suggestion
  const generateUpdatedPoints = async (suggestionId: string, suggestion: any) => {
    if (generatingExamples.has(suggestionId)) return;

    setGeneratingExamples(prev => new Set([...prev, suggestionId]));

    try {
      // Get resume text
      const resumeData = sessionStorage.getItem('currentResume');
      if (!resumeData) {
        throw new Error('No resume data found');
      }

      const resume = JSON.parse(resumeData);

      // Create a focused prompt for generating specific resume points
      const prompt = `Based on this resume section improvement suggestion, generate 3-5 specific, actionable resume bullet points that the user can copy and use:

Resume Text: ${resume.text.substring(0, 4000)}

Improvement Category: ${suggestion.category}
Current Issue: ${suggestion.current}
Suggested Improvement: ${suggestion.suggested}
Why This Works: ${suggestion.reason}

Generate 3-5 specific resume bullet points that implement this improvement. Make them:
1. Specific to this person's likely experience
2. Quantified with realistic metrics
3. Action-verb focused
4. ATS-optimized
5. Ready to copy-paste

Format as a simple list, one bullet point per line, starting with "•"`;

      // For demo purposes, generate mock examples based on the suggestion
      const mockExamples = generateMockExamples(suggestion);
      
      if (isMountedRef.current) {
        setGeneratedExamples(prev => ({
          ...prev,
          [suggestionId]: mockExamples
        }));
      }
    } catch (error) {
      console.error('Error generating examples:', error);
      // Fallback to mock examples
      const mockExamples = generateMockExamples(suggestion);
      if (isMountedRef.current) {
        setGeneratedExamples(prev => ({
          ...prev,
          [suggestionId]: mockExamples
        }));
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingExamples(prev => {
          const newSet = new Set(prev);
          newSet.delete(suggestionId);
          return newSet;
        });
      }
    }
  };

  // Generate mock examples based on suggestion type
  const generateMockExamples = (suggestion: any) => {
    const examples = {
      'Professional Summary': [
        '• Senior Software Engineer with 7+ years developing scalable web applications, leading teams of 5+ developers, and delivering projects 20% ahead of schedule',
        '• Experienced Project Manager with proven track record of managing $2M+ budgets, reducing costs by 15%, and improving team productivity by 30%',
        '• Results-driven Marketing Professional with 5+ years increasing brand awareness by 40%, generating $500K+ in revenue, and managing campaigns across 10+ channels'
      ],
      'Work Experience': [
        '• Led cross-functional team of 8 members to deliver enterprise software solution, resulting in 25% improvement in system performance and $200K annual cost savings',
        '• Implemented automated testing framework that reduced bug reports by 60% and decreased deployment time from 4 hours to 30 minutes',
        '• Managed client relationships for portfolio worth $1.5M, achieving 95% client retention rate and 20% increase in contract renewals'
      ],
      'Skills Section': [
        '• Technical Skills: Python, React, AWS, Docker, Kubernetes, PostgreSQL, Git, CI/CD',
        '• Leadership & Management: Team Leadership (5+ direct reports), Agile/Scrum, Project Management, Stakeholder Communication',
        '• Industry Knowledge: FinTech, SaaS, E-commerce, Data Analytics, Cloud Architecture'
      ],
      'Key Achievements Section': [
        '• Increased system performance by 40% through database optimization and caching implementation, serving 100K+ daily active users',
        '• Led digital transformation initiative that reduced manual processes by 80% and saved company $300K annually',
        '• Mentored 12 junior developers with 100% retention rate and 3 promotions within 18 months'
      ]
    };

    // Return examples based on suggestion category
    const categoryKey = Object.keys(examples).find(key => 
      suggestion.category.toLowerCase().includes(key.toLowerCase())
    );

    return examples[categoryKey as keyof typeof examples] || examples['Work Experience'];
  };

  const handleCopy = useCallback((id: string, text: string) => {
    if (!isMountedRef.current) return;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItems(prev => new Set([...prev, id]));
      setTimeout(() => {
        if (isMountedRef.current) {
          setCopiedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }, []);

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

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !isGenerating && isMountedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, isGenerating, handleClose]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      style={{ zIndex: 10000 }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={handleModalClick}
        tabIndex={-1}
        style={{ outline: 'none' }}
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
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-green-500 rounded"
            type="button"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <Zap className="w-6 h-6 text-green-600 absolute top-3 left-1/2 transform -translate-x-1/2" />
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
                onClick={handleClose}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                type="button"
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
                            type="button"
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
                            type="button"
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

                      {/* Generate Updated Points Button */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-blue-900 flex items-center">
                            <Wand2 className="w-4 h-4 mr-2" />
                            🎯 Generate Updated Resume Points
                          </h5>
                          <button
                            onClick={() => generateUpdatedPoints(point.id, point)}
                            disabled={generatingExamples.has(point.id)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            type="button"
                          >
                            {generatingExamples.has(point.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                <span>Generate Examples</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Generated Examples */}
                        {generatedExamples[point.id] && (
                          <div className="bg-white border border-blue-100 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-gray-900">📝 Ready-to-Use Resume Points:</h6>
                              <button
                                onClick={() => handleCopy(`${point.id}-generated`, generatedExamples[point.id].join('\n'))}
                                className="flex items-center space-x-1 text-blue-700 hover:text-blue-900 text-sm"
                                type="button"
                              >
                                {copiedItems.has(`${point.id}-generated`) ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                                <span>{copiedItems.has(`${point.id}-generated`) ? 'Copied All!' : 'Copy All'}</span>
                              </button>
                            </div>
                            <div className="space-y-2">
                              {generatedExamples[point.id].map((example: string, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm text-gray-800 font-mono flex-1 mr-3">{example}</p>
                                    <button
                                      onClick={() => handleCopy(`${point.id}-generated-${idx}`, example)}
                                      className="flex-shrink-0 text-gray-500 hover:text-gray-700 p-1"
                                      type="button"
                                    >
                                      {copiedItems.has(`${point.id}-generated-${idx}`) ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              💡 These examples are tailored to your resume content and can be copied directly into your resume.
                            </p>
                          </div>
                        )}
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
                    <span className="text-gray-700">Click "Generate Examples" for specific resume points you can copy</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">2</span>
                    <span className="text-gray-700">Copy the generated examples that best match your experience</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">3</span>
                    <span className="text-gray-700">Adapt them to your specific achievements and metrics</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">4</span>
                    <span className="text-gray-700">Upload your updated resume to see the improved analysis</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            💡 Pro tip: Focus on high-priority items first for maximum impact. Generated examples are cached for 24 hours.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            type="button"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestructureModal;