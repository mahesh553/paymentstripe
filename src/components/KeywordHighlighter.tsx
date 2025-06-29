import React, { useState } from 'react';
import { Search, Tag, TrendingUp, AlertTriangle, Target, Lightbulb, Star, BarChart3 } from 'lucide-react';

interface KeywordHighlighterProps {
  keywords: string[];
}

const KeywordHighlighter: React.FC<KeywordHighlighterProps> = ({ keywords }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Enhanced keyword analysis with frequency simulation
  const keywordCategories = {
    technical: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git', 'API', 'Database'],
    soft: ['Leadership', 'Communication', 'Problem-solving', 'Team collaboration', 'Project management', 'Analytical', 'Creative'],
    industry: ['Marketing', 'Sales', 'Finance', 'Healthcare', 'Technology', 'Education', 'Consulting', 'Manufacturing'],
    action_verbs: ['Led', 'Managed', 'Developed', 'Implemented', 'Achieved', 'Optimized', 'Created', 'Delivered', 'Improved'],
    common: ['Experience', 'Management', 'Development', 'Analysis', 'Strategy', 'Process', 'Team', 'Project']
  };

  const categoryColors = {
    technical: 'bg-gray-50 text-gray-800 border-gray-200',
    soft: 'bg-green-50 text-green-800 border-green-200',
    industry: 'bg-gray-50 text-gray-800 border-gray-200',
    action_verbs: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    common: 'bg-gray-50 text-gray-800 border-gray-200'
  };

  const getKeywordCategory = (keyword: string) => {
    for (const [category, words] of Object.entries(keywordCategories)) {
      if (words.some(word => word.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word.toLowerCase()))) {
        return category as keyof typeof keywordCategories;
      }
    }
    return 'common';
  };

  // Simulate keyword frequency analysis
  const keywordFrequency = keywords.reduce((acc, keyword) => {
    const freq = Math.floor(Math.random() * 4) + 1; // Simulate 1-4 frequency
    acc[keyword] = freq;
    return acc;
  }, {} as Record<string, number>);

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || getKeywordCategory(keyword) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const topKeywords = Object.entries(keywordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  const highFrequencyCount = Object.values(keywordFrequency).filter(freq => freq >= 3).length;
  const singleUseCount = Object.values(keywordFrequency).filter(freq => freq === 1).length;
  const keywordDensity = keywords.length > 0 ? Math.round((highFrequencyCount / keywords.length) * 100) : 0;

  // Enhanced actionable insights
  const keywordInsights = [
    {
      type: 'critical',
      title: 'Keyword Frequency Issue',
      description: `${singleUseCount} keywords appear only once. Repeat important keywords 2-3 times naturally.`,
      action: 'Identify your top 5 skills and weave them into multiple sections (summary, experience, skills).',
      impact: 'High - ATS systems rank resumes higher with consistent keyword usage'
    },
    {
      type: 'opportunity',
      title: 'Missing Action Verbs',
      description: 'Strong action verbs make your achievements more impactful.',
      action: 'Start each bullet point with: Led, Implemented, Achieved, Optimized, Delivered, Created.',
      impact: 'Medium - Action verbs increase recruiter engagement by 40%'
    },
    {
      type: 'optimization',
      title: 'Keyword Density',
      description: `Current density: ${keywordDensity}%. Optimal range is 15-25% for ATS systems.`,
      action: keywordDensity < 15 ? 'Add more industry-specific keywords naturally' : 'Good keyword coverage!',
      impact: 'High - Proper density improves ATS ranking significantly'
    }
  ];

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'opportunity': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'optimization': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'opportunity': return <Target className="w-5 h-5 text-yellow-600" />;
      case 'optimization': return <BarChart3 className="w-5 h-5 text-green-600" />;
      default: return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Keyword Performance Dashboard */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-6 h-6 text-gray-600 mr-2" />
          📊 Keyword Performance Analysis
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <Tag className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-800">Total Keywords</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{keywords.length}</div>
            <div className="text-xs text-gray-600">Identified in resume</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">High Frequency</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{highFrequencyCount}</div>
            <div className="text-xs text-gray-600">Used 3+ times</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <span className="font-semibold text-red-800">Single Use</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{singleUseCount}</div>
            <div className="text-xs text-gray-600">Need repetition</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-800">Density</span>
            </div>
            <div className="text-2xl font-bold text-gray-600">{keywordDensity}%</div>
            <div className="text-xs text-gray-600">Target: 15-25%</div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">ATS Optimization Score</span>
            <span className={`font-bold ${keywordDensity >= 15 && singleUseCount < keywords.length * 0.7 ? 'text-green-600' : 'text-red-600'}`}>
              {keywordDensity >= 15 && singleUseCount < keywords.length * 0.7 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                keywordDensity >= 15 && singleUseCount < keywords.length * 0.7 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(keywordDensity * 4, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 text-gray-600 mr-2" />
          🎯 Actionable Keyword Insights
        </h3>
        <div className="space-y-4">
          {keywordInsights.map((insight, index) => (
            <div key={index} className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}>
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-sm mb-2">{insight.description}</p>
                  <div className="bg-white bg-opacity-50 p-3 rounded border border-current border-opacity-20">
                    <p className="text-sm font-medium">💡 Action: {insight.action}</p>
                    <p className="text-xs mt-1 opacity-75">Impact: {insight.impact}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          <option value="technical">Technical Skills</option>
          <option value="soft">Soft Skills</option>
          <option value="industry">Industry Terms</option>
          <option value="action_verbs">Action Verbs</option>
          <option value="common">Common Terms</option>
        </select>
      </div>

      {/* Top Keywords with Frequency */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Star className="w-5 h-5 text-yellow-500 mr-2" />
          🏆 Most Frequent Keywords
        </h3>
        <div className="space-y-3">
          {topKeywords.map(([keyword, frequency], index) => (
            <div key={keyword} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500 mr-3 bg-white px-2 py-1 rounded">#{index + 1}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium mr-3 border ${categoryColors[getKeywordCategory(keyword)]}`}>
                  {getKeywordCategory(keyword).replace('_', ' ')}
                </span>
                <span className="font-medium text-gray-900">{keyword}</span>
              </div>
              <div className="flex items-center">
                <div className="text-sm text-gray-600 mr-3">{frequency} time{frequency > 1 ? 's' : ''}</div>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(frequency / Math.max(...Object.values(keywordFrequency))) * 100}%` }}
                  ></div>
                </div>
                {frequency === 1 && (
                  <span className="ml-2 text-xs text-red-600 font-medium">Needs repetition</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Keywords */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          All Keywords ({filteredKeywords.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {filteredKeywords.map((keyword, index) => {
            const category = getKeywordCategory(keyword);
            const frequency = keywordFrequency[keyword];
            return (
              <span
                key={`${keyword}-${index}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium border relative ${categoryColors[category]}`}
                title={`Used ${frequency} time${frequency > 1 ? 's' : ''} - ${category.replace('_', ' ')}`}
              >
                {keyword}
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {frequency}
                </span>
                {frequency === 1 && (
                  <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Enhanced Optimization Tips */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          🚀 Keyword Optimization Strategy
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-800 mb-2">High-Impact Actions:</h4>
            <ul className="space-y-2 text-green-800 text-sm">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Repeat top 5 skills</strong> naturally across summary, experience, and skills sections</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Use exact job description phrases</strong> when they match your experience</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Start bullet points with action verbs</strong> like "Led," "Implemented," "Achieved"</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">ATS Optimization:</h4>
            <ul className="space-y-2 text-gray-800 text-sm">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Aim for 15-25% keyword density</strong> for optimal ATS ranking</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Include both acronyms and full terms</strong> (e.g., "AI" and "Artificial Intelligence")</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Use industry-standard terminology</strong> rather than company-specific jargon</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordHighlighter;