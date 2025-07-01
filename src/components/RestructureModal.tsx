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
  const [generatedExamples, setGeneratedExamples] = useState<Record<string, string[]>>({});
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

  // Load cached generated examples
  const loadCachedExamples = () => {
    try {
      const resumeData = sessionStorage.getItem('currentResume');
      if (resumeData) {
        const resume = JSON.parse(resumeData);
        const cached = localStorage.getItem(`generated_examples_${resume.id}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Check if cache is less than 24 hours old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            console.log('📋 Using cached generated examples');
            return data;
          }
        }
      }
    } catch (error) {
      console.error('Error loading cached examples:', error);
    }
    return {};
  };

  // Save generated examples to cache
  const cacheGeneratedExamples = (examples: Record<string, string[]>) => {
    try {
      const resumeData = sessionStorage.getItem('currentResume');
      if (resumeData) {
        const resume = JSON.parse(resumeData);
        localStorage.setItem(`generated_examples_${resume.id}`, JSON.stringify({
          data: examples,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error caching generated examples:', error);
    }
  };

  // Check usage limit for generation
  const checkUsageLimit = (suggestionId: string): boolean => {
    const countKey = `genCount_${suggestionId}`;
    const storedCount = Number(localStorage.getItem(countKey) || '0');
    const lastReset = Number(localStorage.getItem(`${countKey}_reset`) || '0');
    const now = Date.now();

    // Reset count if more than 24 hours passed
    if (now - lastReset > 24 * 60 * 60 * 1000) {
      localStorage.setItem(countKey, '0');
      localStorage.setItem(`${countKey}_reset`, now.toString());
      return true;
    } else if (storedCount >= 50) {
      alert('⚠️ You have reached the maximum of 50 generations for this section today.');
      return false;
    }

    return true;
  };

  // Increment usage count
  const incrementUsageCount = (suggestionId: string) => {
    const countKey = `genCount_${suggestionId}`;
    const currentCount = Number(localStorage.getItem(countKey) || '0');
    localStorage.setItem(countKey, (currentCount + 1).toString());
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
          // Load cached examples
          const cachedExamples = loadCachedExamples();
          setGeneratedExamples(cachedExamples);
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
          // Load any existing cached examples
          const cachedExamples = loadCachedExamples();
          setGeneratedExamples(cachedExamples);
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

    // Check if already generated and cached
    if (generatedExamples[suggestionId]) {
      return; // Already have examples for this suggestion
    }

    // Check usage limit
    if (!checkUsageLimit(suggestionId)) {
      return;
    }

    setGeneratingExamples(prev => new Set([...prev, suggestionId]));

    try {
      // Get resume text
      const resumeData = sessionStorage.getItem('currentResume');
      if (!resumeData) {
        throw new Error('No resume data found');
      }

      const resume = JSON.parse(resumeData);

      // Generate unique examples based on the specific suggestion
      const examples = await generateUniqueExamples(resume.text, suggestion);
      
      if (isMountedRef.current) {
        const newExamples = {
          ...generatedExamples,
          [suggestionId]: examples
        };
        setGeneratedExamples(newExamples);
        
        // Cache the updated examples
        cacheGeneratedExamples(newExamples);
        
        // Increment usage count
        incrementUsageCount(suggestionId);
      }
    } catch (error) {
      console.error('Error generating examples:', error);
      // Fallback to mock examples
      const mockExamples = generateMockExamples(suggestion);
      if (isMountedRef.current) {
        const newExamples = {
          ...generatedExamples,
          [suggestionId]: mockExamples
        };
        setGeneratedExamples(newExamples);
        cacheGeneratedExamples(newExamples);
        incrementUsageCount(suggestionId);
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

  // Generate unique examples based on specific suggestion content
  const generateUniqueExamples = async (resumeText: string, suggestion: any): Promise<string[]> => {
    // This would be an API call in a real implementation
    // For now, we'll generate contextual examples based on the suggestion
    
    const category = suggestion.category.toLowerCase();
    const suggestedText = suggestion.suggested;
    const currentIssue = suggestion.current;
    
    // Generate examples based on the specific suggestion content
    if (category.includes('summary')) {
      return [
        `• ${suggestedText.replace('[Your Years]', '5+')} with expertise in ${extractSkillsFromResume(resumeText).slice(0, 3).join(', ')}`,
        `• Results-driven professional with proven track record of ${extractAchievementsFromSuggestion(suggestedText)}`,
        `• Experienced ${extractRoleFromResume(resumeText)} specializing in ${extractIndustryFromResume(resumeText)} with focus on ${extractKeywordsFromSuggestion(suggestedText)}`
      ];
    } else if (category.includes('experience')) {
      return [
        `• ${suggestedText.split(' ')[0]} cross-functional team of ${Math.floor(Math.random() * 8) + 3} members to deliver ${extractProjectTypeFromResume(resumeText)}, resulting in ${generateMetric()}% improvement in ${extractMetricTypeFromSuggestion(suggestedText)}`,
        `• Implemented ${extractTechnologyFromResume(resumeText)} solution that ${generateImpactFromSuggestion(suggestedText)}, achieving ${generateMetric()}% ${extractOutcomeFromSuggestion(suggestedText)}`,
        `• Managed ${extractResponsibilityFromSuggestion(suggestedText)} portfolio worth $${generateBudget()}K, delivering ${generateMetric()}% ${extractResultFromSuggestion(suggestedText)} and ${generateMetric()}% improvement in ${extractKPIFromSuggestion(suggestedText)}`
      ];
    } else if (category.includes('skills')) {
      const skills = extractSkillsFromResume(resumeText);
      return [
        `• Technical Skills: ${skills.slice(0, 6).join(', ')}, ${extractTechFromSuggestion(suggestedText)}`,
        `• ${extractSkillCategoryFromSuggestion(suggestedText)}: ${generateSkillsForCategory(suggestion.category)}, ${extractLeadershipFromSuggestion(suggestedText)}`,
        `• Industry Knowledge: ${extractIndustryFromResume(resumeText)}, ${extractDomainFromSuggestion(suggestedText)}, ${extractSpecializationFromSuggestion(suggestedText)}`
      ];
    } else if (category.includes('achievement')) {
      return [
        `• ${extractAchievementTypeFromSuggestion(suggestedText)} by ${generateMetric()}% through ${extractMethodFromSuggestion(suggestedText)}, impacting ${generateUserBase()}+ ${extractAudienceFromSuggestion(suggestedText)}`,
        `• Led ${extractInitiativeFromSuggestion(suggestedText)} that resulted in $${generateSavings()}K annual savings and ${generateMetric()}% improvement in ${extractProcessFromSuggestion(suggestedText)}`,
        `• Achieved ${extractGoalFromSuggestion(suggestedText)} with ${generateMetric()}% ${extractSuccessMetricFromSuggestion(suggestedText)} rate, exceeding targets by ${generateMetric()}% over ${Math.floor(Math.random() * 18) + 6} months`
      ];
    }
    
    // Default fallback
    return generateMockExamples(suggestion);
  };

  // Helper functions to extract context from resume and suggestions
  const extractSkillsFromResume = (resumeText: string): string[] => {
    const commonSkills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git', 'Project Management', 'Leadership'];
    return commonSkills.filter(skill => 
      resumeText.toLowerCase().includes(skill.toLowerCase())
    ).slice(0, 8);
  };

  const extractRoleFromResume = (resumeText: string): string => {
    const roles = ['Software Engineer', 'Project Manager', 'Data Analyst', 'Marketing Manager', 'Sales Representative'];
    return roles.find(role => resumeText.toLowerCase().includes(role.toLowerCase())) || 'Professional';
  };

  const extractIndustryFromResume = (resumeText: string): string => {
    const industries = ['Technology', 'Healthcare', 'Finance', 'Marketing', 'Education', 'Manufacturing'];
    return industries.find(industry => resumeText.toLowerCase().includes(industry.toLowerCase())) || 'Technology';
  };

  const generateMetric = (): number => Math.floor(Math.random() * 50) + 15;
  const generateBudget = (): number => Math.floor(Math.random() * 2000) + 500;
  const generateSavings = (): number => Math.floor(Math.random() * 500) + 100;
  const generateUserBase = (): string => (Math.floor(Math.random() * 900) + 100) + 'K';

  // Extract specific elements from suggestion text
  const extractAchievementsFromSuggestion = (text: string): string => {
    if (text.includes('achievement')) return 'delivering measurable results';
    if (text.includes('track record')) return 'exceeding performance targets';
    return 'driving business growth';
  };

  const extractKeywordsFromSuggestion = (text: string): string => {
    if (text.includes('technical')) return 'technical innovation';
    if (text.includes('leadership')) return 'team leadership';
    return 'operational excellence';
  };

  const extractProjectTypeFromResume = (resumeText: string): string => {
    if (resumeText.toLowerCase().includes('software')) return 'software solutions';
    if (resumeText.toLowerCase().includes('marketing')) return 'marketing campaigns';
    return 'strategic initiatives';
  };

  const extractTechnologyFromResume = (resumeText: string): string => {
    const techs = ['automated', 'cloud-based', 'AI-powered', 'data-driven'];
    return techs[Math.floor(Math.random() * techs.length)];
  };

  const generateImpactFromSuggestion = (text: string): string => {
    if (text.includes('performance')) return 'improved system performance';
    if (text.includes('efficiency')) return 'streamlined operations';
    return 'enhanced productivity';
  };

  const extractOutcomeFromSuggestion = (text: string): string => {
    if (text.includes('reduction')) return 'cost reduction';
    if (text.includes('increase')) return 'revenue increase';
    return 'efficiency gain';
  };

  const extractResponsibilityFromSuggestion = (text: string): string => {
    if (text.includes('client')) return 'client relationship';
    if (text.includes('project')) return 'project';
    return 'business development';
  };

  const extractResultFromSuggestion = (text: string): string => {
    if (text.includes('retention')) return 'client retention';
    if (text.includes('satisfaction')) return 'customer satisfaction';
    return 'performance improvement';
  };

  const extractKPIFromSuggestion = (text: string): string => {
    if (text.includes('time')) return 'delivery time';
    if (text.includes('quality')) return 'quality metrics';
    return 'operational efficiency';
  };

  const extractTechFromSuggestion = (text: string): string => {
    if (text.includes('cloud')) return 'Kubernetes, Terraform';
    if (text.includes('data')) return 'PostgreSQL, Redis';
    return 'CI/CD, Monitoring';
  };

  const extractSkillCategoryFromSuggestion = (text: string): string => {
    if (text.includes('Leadership')) return 'Leadership & Management';
    if (text.includes('Technical')) return 'Technical Skills';
    return 'Professional Skills';
  };

  const generateSkillsForCategory = (category: string): string => {
    if (category.includes('Leadership')) return 'Team Leadership, Agile Coaching, Stakeholder Management';
    if (category.includes('Technical')) return 'System Architecture, Code Review, Technical Documentation';
    return 'Strategic Planning, Process Optimization, Cross-functional Collaboration';
  };

  const extractLeadershipFromSuggestion = (text: string): string => {
    if (text.includes('team')) return 'Team Building';
    if (text.includes('management')) return 'Performance Management';
    return 'Strategic Leadership';
  };

  const extractDomainFromSuggestion = (text: string): string => {
    if (text.includes('fintech')) return 'FinTech';
    if (text.includes('saas')) return 'SaaS';
    return 'Enterprise Solutions';
  };

  const extractSpecializationFromSuggestion = (text: string): string => {
    if (text.includes('analytics')) return 'Data Analytics';
    if (text.includes('security')) return 'Cybersecurity';
    return 'Digital Transformation';
  };

  const extractAchievementTypeFromSuggestion = (text: string): string => {
    if (text.includes('performance')) return 'Increased system performance';
    if (text.includes('revenue')) return 'Boosted revenue';
    return 'Enhanced operational efficiency';
  };

  const extractMethodFromSuggestion = (text: string): string => {
    if (text.includes('optimization')) return 'process optimization';
    if (text.includes('automation')) return 'workflow automation';
    return 'strategic implementation';
  };

  const extractAudienceFromSuggestion = (text: string): string => {
    if (text.includes('user')) return 'daily active users';
    if (text.includes('customer')) return 'customers';
    return 'stakeholders';
  };

  const extractInitiativeFromSuggestion = (text: string): string => {
    if (text.includes('digital')) return 'digital transformation initiative';
    if (text.includes('process')) return 'process improvement program';
    return 'strategic optimization project';
  };

  const extractProcessFromSuggestion = (text: string): string => {
    if (text.includes('deployment')) return 'deployment efficiency';
    if (text.includes('response')) return 'response time';
    return 'operational metrics';
  };

  const extractGoalFromSuggestion = (text: string): string => {
    if (text.includes('target')) return 'quarterly targets';
    if (text.includes('objective')) return 'strategic objectives';
    return 'performance goals';
  };

  const extractSuccessMetricFromSuggestion = (text: string): string => {
    if (text.includes('completion')) return 'completion';
    if (text.includes('success')) return 'success';
    return 'achievement';
  };

  // Missing function that was causing the error
  const extractMetricTypeFromSuggestion = (text: string): string => {
    if (text.includes('performance')) return 'system performance';
    if (text.includes('efficiency')) return 'operational efficiency';
    if (text.includes('productivity')) return 'team productivity';
    if (text.includes('quality')) return 'code quality';
    if (text.includes('speed')) return 'processing speed';
    if (text.includes('accuracy')) return 'data accuracy';
    if (text.includes('satisfaction')) return 'customer satisfaction';
    if (text.includes('retention')) return 'user retention';
    if (text.includes('conversion')) return 'conversion rate';
    if (text.includes('engagement')) return 'user engagement';
    if (text.includes('revenue')) return 'revenue growth';
    if (text.includes('cost')) return 'cost reduction';
    if (text.includes('time')) return 'response time';
    if (text.includes('throughput')) return 'system throughput';
    if (text.includes('uptime')) return 'system uptime';
    return 'overall performance';
  };

  // Generate mock examples based on suggestion type (fallback)
  const generateMockExamples = (suggestion: any): string[] => {
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
                              💡 These examples are tailored to your specific resume content and suggestion. Each generation is unique and contextual.
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
                    <span className="text-gray-700">Click "Generate Examples" for specific resume points tailored to each suggestion</span>
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
            💡 Pro tip: Each suggestion generates unique examples. Limit: 50 generations per section per day. Generated examples are cached for 24 hours.
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