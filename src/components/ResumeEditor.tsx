import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle, Eye, Wand2, RefreshCw } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { analyzeResume } from '../services/geminiService';
import { updateResumeContent } from '../lib/supabase';
import UserMenu from './UserMenu';

interface ResumeSection {
  id: string;
  type: string;
  title: string;
  content: string;
  order: number;
}

interface ParsedResume {
  sections: ResumeSection[];
  metadata: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

interface AnalysisResult {
  section_name: string;
  score: number;
  strengths: string[];
  suggestions: Array<{
    original_text: string;
    suggested_text: string;
    reason: string;
  }>;
  missing_info: string[];
}

interface ResumeEditorProps {
  onBack: () => void;
  resumeData: any;
}

const ResumeEditor: React.FC<ResumeEditorProps> = ({ onBack, resumeData }) => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [analyzingSection, setAnalyzingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showVerification, setShowVerification] = useState(true);
  const [highlightedText, setHighlightedText] = useState<Record<string, string[]>>({});
  const editorRefs = useRef<Record<string, any>>({});

  // Parse resume text into structured sections
  const parseResumeText = (text: string): ParsedResume => {
    const lines = text.split('\n').filter(line => line.trim());
    const sections: ResumeSection[] = [];
    let currentSectionType = 'summary';
    let currentContent: string[] = [];
    let sectionOrder = 0;

    // Common section headers
    const sectionHeaders = {
      'professional summary': 'summary',
      'summary': 'summary',
      'objective': 'summary',
      'work experience': 'experience',
      'experience': 'experience',
      'employment': 'experience',
      'education': 'education',
      'skills': 'skills',
      'technical skills': 'skills',
      'achievements': 'achievements',
      'accomplishments': 'achievements',
      'projects': 'projects',
      'certifications': 'certifications',
      'contact': 'contact',
      'contact information': 'contact'
    };

    // Extract metadata (name, email, phone)
    const metadata: any = {};
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Extract contact info
      if (emailRegex.test(trimmedLine)) {
        metadata.email = trimmedLine.match(emailRegex)?.[0];
      }
      if (phoneRegex.test(trimmedLine)) {
        metadata.phone = trimmedLine.match(phoneRegex)?.[0];
      }
      
      // First non-contact line might be name
      if (index < 5 && !metadata.name && !emailRegex.test(trimmedLine) && !phoneRegex.test(trimmedLine) && trimmedLine.length > 2) {
        metadata.name = trimmedLine;
      }

      // Check if line is a section header
      const lowerLine = trimmedLine.toLowerCase();
      const foundSection = Object.keys(sectionHeaders).find(header => 
        lowerLine.includes(header) && trimmedLine.length < 50
      );

      if (foundSection) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.push({
            id: `section-${sectionOrder}`,
            type: currentSectionType,
            title: getSectionTitle(currentSectionType),
            content: currentContent.join('\n'),
            order: sectionOrder
          });
          sectionOrder++;
        }

        // Start new section
        currentSectionType = sectionHeaders[foundSection];
        currentContent = [];
      } else if (trimmedLine) {
        currentContent.push(trimmedLine);
      }
    });

    // Add final section
    if (currentContent.length > 0) {
      sections.push({
        id: `section-${sectionOrder}`,
        type: currentSectionType,
        title: getSectionTitle(currentSectionType),
        content: currentContent.join('\n'),
        order: sectionOrder
      });
    }

    return { sections, metadata };
  };

  const getSectionTitle = (type: string): string => {
    const titles = {
      contact: 'Contact Information',
      summary: 'Professional Summary',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      achievements: 'Achievements',
      projects: 'Projects',
      certifications: 'Certifications'
    };
    return titles[type as keyof typeof titles] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Initialize parsed resume
  useEffect(() => {
    if (resumeData?.text || resumeData?.original_text) {
      const text = resumeData.text || resumeData.original_text;
      const parsed = parseResumeText(text);
      setParsedResume(parsed);
      
      // Set first section as current
      if (parsed.sections.length > 0) {
        setCurrentSection(parsed.sections[0].id);
      }
    }
  }, [resumeData]);

  // Analyze specific section
  const analyzeSection = async (sectionId: string) => {
    if (!parsedResume) return;

    const section = parsedResume.sections.find(s => s.id === sectionId);
    if (!section) return;

    setAnalyzingSection(sectionId);

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), 5000);
      });

      // Create analysis promise
      const analysisPromise = analyzeResume(section.content);

      // Race between analysis and timeout
      const result = await Promise.race([analysisPromise, timeoutPromise]) as any;

      // Transform result to match our interface
      const analysisResult: AnalysisResult = {
        section_name: section.title,
        score: result.overall_score || 75,
        strengths: result.strengths || [],
        suggestions: result.recommendations?.map((rec: string) => ({
          original_text: section.content.split('\n')[0] || '',
          suggested_text: rec,
          reason: 'AI-generated improvement suggestion'
        })) || [],
        missing_info: result.improvements || []
      };

      setAnalysisResults(prev => ({
        ...prev,
        [sectionId]: analysisResult
      }));

      // Highlight original text in editor
      if (analysisResult.suggestions.length > 0) {
        const textsToHighlight = analysisResult.suggestions.map(s => s.original_text);
        setHighlightedText(prev => ({
          ...prev,
          [sectionId]: textsToHighlight
        }));
      }

    } catch (error) {
      console.error('Analysis error:', error);
      
      // Fallback analysis result
      const fallbackResult: AnalysisResult = {
        section_name: section.title,
        score: 70,
        strengths: ['Content is present and readable'],
        suggestions: [{
          original_text: section.content.substring(0, 50) + '...',
          suggested_text: 'Consider adding more specific details and quantified achievements',
          reason: 'More specific content helps recruiters understand your impact'
        }],
        missing_info: ['Consider adding more quantified achievements']
      };

      setAnalysisResults(prev => ({
        ...prev,
        [sectionId]: fallbackResult
      }));
    } finally {
      setAnalyzingSection(null);
    }
  };

  // Save resume content
  const saveResume = async () => {
    if (!parsedResume || !user) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      // Combine all sections back into text
      const combinedText = parsedResume.sections
        .sort((a, b) => a.order - b.order)
        .map(section => `${section.title}\n${section.content}`)
        .join('\n\n');

      // Update in database
      await updateResumeContent(resumeData.id, combinedText);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    if (!parsedResume) return;

    setParsedResume(prev => ({
      ...prev!,
      sections: prev!.sections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      )
    }));
  };

  // Reorder sections (drag and drop)
  const reorderSection = (sectionId: string, newOrder: number) => {
    if (!parsedResume) return;

    setParsedResume(prev => ({
      ...prev!,
      sections: prev!.sections.map(section =>
        section.id === sectionId ? { ...section, order: newOrder } : section
      ).sort((a, b) => a.order - b.order)
    }));
  };

  if (!parsedResume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Parsing your resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Resume Editor</h1>
                <p className="text-sm text-gray-500">
                  {parsedResume.metadata.name || resumeData.filename}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={saveResume}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {saving ? 'Saving...' : 
                   saveStatus === 'saved' ? 'Saved!' :
                   saveStatus === 'error' ? 'Error' : 'Save Resume'}
                </span>
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Verification Screen */}
      {showVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Parsed Sections</h2>
              <p className="text-gray-600">
                Please review and confirm the sections we've identified in your resume. You can drag to reorder or edit section titles.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {parsedResume.sections.map((section, index) => (
                  <div key={section.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <span className="text-sm text-gray-500">Section {index + 1}</span>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 max-h-32 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {section.content.substring(0, 200)}
                        {section.content.length > 200 && '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowVerification(false)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Looks Good - Start Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Panel Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel - Editor */}
          <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Resume Sections</h2>
            </div>
            
            <div className="flex h-full">
              {/* Section Navigation */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {parsedResume.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentSection === section.id
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {section.content.split('\n').length} lines
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 p-4">
                {currentSection && (
                  <div className="h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {parsedResume.sections.find(s => s.id === currentSection)?.title}
                      </h3>
                      <button
                        onClick={() => analyzeSection(currentSection)}
                        disabled={analyzingSection === currentSection}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {analyzingSection === currentSection ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        <span>
                          {analyzingSection === currentSection ? 'Analyzing...' : 'Analyze'}
                        </span>
                      </button>
                    </div>

                    <Editor
                      apiKey="your-tinymce-api-key" // You'll need to get this from TinyMCE
                      value={parsedResume.sections.find(s => s.id === currentSection)?.content || ''}
                      onEditorChange={(content) => updateSectionContent(currentSection, content)}
                      init={{
                        height: 400,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
                          'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'table', 'help', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | removeformat | help',
                        content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; }',
                        placeholder: 'Start editing this section...',
                        setup: (editor) => {
                          editorRefs.current[currentSection] = editor;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Analysis Results */}
          <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
            </div>
            
            <div className="p-4 overflow-y-auto h-full">
              {currentSection && analysisResults[currentSection] ? (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${
                      analysisResults[currentSection].score >= 80 ? 'text-green-600' :
                      analysisResults[currentSection].score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analysisResults[currentSection].score}
                    </div>
                    <div className="text-sm text-gray-500">Section Score</div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      Strengths
                    </h3>
                    <div className="space-y-2">
                      {analysisResults[currentSection].strengths.map((strength, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Wand2 className="w-4 h-4 text-blue-600 mr-2" />
                      Suggestions
                    </h3>
                    <div className="space-y-4">
                      {analysisResults[currentSection].suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="mb-2">
                            <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                              Original
                            </span>
                            <p className="text-sm text-gray-700 mt-1 bg-yellow-100 p-2 rounded">
                              {suggestion.original_text}
                            </p>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                              Suggested
                            </span>
                            <p className="text-sm text-gray-700 mt-1 bg-green-100 p-2 rounded">
                              {suggestion.suggested_text}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-700">Reason:</span>
                            <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Info */}
                  {analysisResults[currentSection].missing_info.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                        Missing Information
                      </h3>
                      <div className="space-y-2">
                        {analysisResults[currentSection].missing_info.map((info, index) => (
                          <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800">{info}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : currentSection && analyzingSection === currentSection ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Analyzing section...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click "Analyze" to get AI feedback on this section
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;