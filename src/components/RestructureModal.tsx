import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Star, ArrowRight, Copy, Download } from 'lucide-react';

interface RestructureModalProps {
  onClose: () => void;
  analysisResults: any;
}

const RestructureModal: React.FC<RestructureModalProps> = ({ onClose, analysisResults }) => {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // Generate restructure suggestions based on analysis results
  const restructurePoints = [
    {
      id: 'summary',
      category: 'Professional Summary',
      priority: 'high',
      current: 'Generic summary or objective statement',
      suggested: `[Your Years] [Your Role] with proven track record of [specific achievement with numbers]. Expert in [key skills from job description] with history of [quantified result]. Seeking to leverage [expertise] to drive [relevant outcome] at [target company type].`,
      reason: 'Recruiters spend 6 seconds on initial scan - summary must immediately show value',
      example: 'Senior Software Engineer with 7+ years delivering scalable web applications. Expert in React, Python, and AWS with history of reducing load times by 40% and leading teams of 5+ developers. Seeking to leverage full-stack expertise to drive digital transformation at innovative tech companies.'
    },
    {
      id: 'experience',
      category: 'Work Experience',
      priority: 'high',
      current: 'Job descriptions focus on duties rather than achievements',
      suggested: 'Transform each bullet point: [Action Verb] + [What You Did] + [Quantified Result]',
      reason: 'Quantified achievements are 3x more likely to catch recruiter attention',
      example: 'Led team of 8 developers, delivering 15 projects on time and 20% under budget, resulting in $2M cost savings'
    },
    {
      id: 'skills',
      category: 'Skills Section',
      priority: 'medium',
      current: 'Unorganized list that\'s hard to scan',
      suggested: 'Organize into categories: Technical Skills, Leadership & Management, Industry Knowledge',
      reason: 'Organized skills are easier for ATS systems and recruiters to process',
      example: 'Technical: Python, React, AWS, Docker | Leadership: Team Management, Agile Coaching | Industry: FinTech, SaaS'
    },
    {
      id: 'achievements',
      category: 'Key Achievements Section',
      priority: 'high',
      current: 'Missing dedicated achievements section',
      suggested: 'Add 3-4 bullet points with specific metrics showing your biggest wins',
      reason: 'Dedicated achievements section immediately shows your value and impact',
      example: '• Increased system performance by 60% through database optimization\n• Led digital transformation project resulting in $1.5M annual savings\n• Mentored 12 junior developers, with 100% retention rate'
    },
    {
      id: 'keywords',
      category: 'Keyword Optimization',
      priority: 'high',
      current: 'Generic language that may not pass ATS filters',
      suggested: 'Include industry-specific keywords naturally throughout content',
      reason: '75% of resumes are filtered by ATS before human review',
      example: 'Integrate keywords like "machine learning," "data pipeline," "microservices" naturally in experience descriptions'
    },
    {
      id: 'formatting',
      category: 'ATS-Friendly Formatting',
      priority: 'medium',
      current: 'Complex formatting that ATS systems can\'t read',
      suggested: 'Use simple, clean formatting with standard section headers',
      reason: 'ATS systems need to parse your content correctly to rank you',
      example: 'Use headers like "Professional Experience," "Education," "Skills" - avoid graphics, tables, or unusual fonts'
    }
  ];

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">🚀 Resume Restructure Guide</h2>
            <p className="text-green-100 mt-1">Copy these improvements to transform your resume</p>
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
          {/* Impact Summary */}
          <div className="bg-green-50 p-6 rounded-lg mb-6 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📈 Expected Impact</h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">+40%</div>
                <div className="text-sm text-gray-600">Interview Callbacks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">+60%</div>
                <div className="text-sm text-gray-600">ATS Pass Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">+25%</div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
            </div>
          </div>

          {/* Restructure Points */}
          <div className="space-y-6">
            {restructurePoints.map((point, index) => (
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