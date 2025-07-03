import { GoogleGenerativeAI } from '@google/generative-ai';

import { cacheService } from './cacheService';



const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;



// Enhanced mock data for when API is not available

const ENHANCED_MOCK_DATA = {

  overall_score: 75,

  ats_score: 82,

  industry_score: 68,

  potential_improvement: 25,

  quick_wins: [

    "Add 2-3 quantified achievements to your experience section (e.g., 'Increased sales by 25%')",

    "Include 5-7 industry-specific keywords in your skills section",

    "Write a compelling 2-line professional summary highlighting your top achievement",

    "Add a dedicated 'Key Achievements' section with 3-4 bullet points"

  ],

  sections: {

    contact_info: { 

      score: 85, 

      feedback: "Contact information is complete and professional. Consider adding LinkedIn profile for better networking opportunities.", 

      suggestions: ["Add LinkedIn profile URL", "Consider adding portfolio website if relevant"], 

      present: true 

    },

    professional_summary: { 

      score: 70, 

      feedback: "Summary exists but could be more compelling and specific to target roles. Focus on quantified achievements.", 

      suggestions: [

        "Start with your years of experience and key expertise",

        "Include 1-2 specific, quantified achievements",

        "End with what value you bring to employers"

      ], 

      present: true 

    },

    work_experience: { 

      score: 80, 

      feedback: "Good experience section with relevant roles. Enhance with more quantified achievements and action verbs.", 

      suggestions: [

        "Add specific metrics to each role (percentages, dollar amounts, team sizes)",

        "Use strong action verbs (Led, Implemented, Optimized, Achieved)",

        "Focus on results and impact, not just responsibilities"

      ], 

      present: true 

    },

    education: { 

      score: 75, 

      feedback: "Education section is adequate. Consider adding relevant coursework, projects, or honors if recent graduate.", 

      suggestions: [

        "Include GPA if 3.5 or higher",

        "Add relevant coursework for entry-level positions",

        "Include academic honors or achievements"

      ], 

      present: true 

    },

    skills: { 

      score: 65, 

      feedback: "Skills section needs better organization and more targeted content for your industry.", 

      suggestions: [

        "Organize skills by category (Technical, Leadership, Languages)",

        "Add proficiency levels where relevant",

        "Include industry-specific tools and technologies",

        "Remove outdated or irrelevant skills"

      ], 

      present: true 

    },

    achievements: { 

      score: 45, 

      feedback: "Missing dedicated achievements section. This is a major opportunity to stand out.", 

      suggestions: [

        "Create a 'Key Achievements' or 'Notable Accomplishments' section",

        "Include 3-4 quantified achievements with specific metrics",

        "Focus on results that demonstrate your value to employers"

      ], 

      present: false 

    }

  },

  recommendations: [

    "🎯 PRIORITY: Add quantified achievements throughout your resume - this single change can increase interview callbacks by 40%",

    "📊 Create a dedicated 'Key Achievements' section with 3-4 bullet points showing measurable impact",

    "🔍 Optimize for ATS by including industry-specific keywords naturally throughout your content",

    "💼 Tailor your professional summary to highlight the most relevant experience for your target roles",

    "📈 Use action verbs and focus on results rather than responsibilities in your experience section"

  ],

  strengths: [

    "Clear work history progression showing career growth",

    "Professional formatting that's easy to read and ATS-friendly",

    "Complete contact information with professional presentation",

    "Relevant work experience aligned with career goals",

    "Good use of white space and consistent formatting"

  ],

  improvements: [

    "Add quantified achievements with specific metrics and percentages",

    "Create a dedicated achievements section to highlight your biggest wins",

    "Enhance skills section with better organization and industry-specific keywords",

    "Strengthen professional summary with compelling, results-focused content",

    "Include more action verbs and impact-focused language throughout"

  ],

  keywords: [

    "management", "leadership", "project management", "team collaboration", 

    "strategic planning", "process improvement", "data analysis", "communication",

    "problem solving", "customer service", "sales", "marketing", "development"

  ]

};



// Optimized prompt templates to reduce token usage

const ANALYSIS_PROMPT_TEMPLATE = `Analyze this resume and return JSON with: overall_score (0-100), sections (contact_info, professional_summary, work_experience, education, skills, achievements - each with score, feedback, suggestions, present), recommendations (3-5 items), strengths (3-5 items), improvements (3-5 items), keywords (10-15 items). Be concise but actionable.



Resume: {RESUME_TEXT}`;



const JOB_MATCH_PROMPT_TEMPLATE = `Compare resume vs job description. Return JSON with: match_score (0-100), matching_skills (array), missing_skills (array), recommendations (3-5 items with category/suggestion/priority), keyword_analysis (matched_keywords, missing_keywords). Be specific and actionable.



Resume: {RESUME_TEXT}

Job: {JOB_DESCRIPTION}`;



const RESTRUCTURE_PROMPT_TEMPLATE = `Generate 4-6 specific restructure suggestions. Return JSON with: restructure_points (array with id, category, priority, current, suggested, reason, example), expected_impact (interview_callbacks, ats_pass_rate, overall_score_increase as percentages). Focus on high-impact changes.



Resume: {RESUME_TEXT}`;



// Optimized analysis function with caching

export const analyzeResume = async (resumeText: string) => {

  // Check cache first

  const cached = cacheService.getCachedAnalysis(resumeText);

  if (cached) {

    console.log('📋 Using cached analysis result');

    return cached;

  }



  if (!genAI) {

    console.log('🤖 Using enhanced mock data (no API key)');

    const result = { ...ENHANCED_MOCK_DATA };

    cacheService.cacheAnalysis(resumeText, result);

    return result;

  }



  try {

    const model = genAI.getGenerativeModel({ 

      model: 'gemini-1.5-flash',

      generationConfig: {

        maxOutputTokens: 2048, // Limit output to reduce costs

        temperature: 0.3, // Lower temperature for more consistent results

      }

    });



    const prompt = ANALYSIS_PROMPT_TEMPLATE.replace('{RESUME_TEXT}', resumeText.substring(0, 5000)); // Limit input length



    const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();



    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {

      throw new Error('Invalid response format from AI');

    }



    const analysisResult = JSON.parse(jsonMatch[0]);

    

    // Cache the result

    cacheService.cacheAnalysis(resumeText, analysisResult);

    

    return analysisResult;

  } catch (error) {

    console.error('Error analyzing resume:', error);

    console.log('🤖 Falling back to enhanced mock data due to API error');

    const fallback = { ...ENHANCED_MOCK_DATA };

    cacheService.cacheAnalysis(resumeText, fallback);

    return fallback;

  }

};



// Optimized job comparison with caching

export const compareWithJobDescription = async (resumeText: string, jobDescription: string) => {

  // Check cache first
console.log('jobDescription',jobDescription);
  console.log('resumeText',resumeText);
  const cached = cacheService.getCachedJobMatch(resumeText, jobDescription);

  if (cached) {

    console.log('🎯 Using cached job match result');

    return cached;

  }



  const mockResult = {

    match_score: 72,

    matching_skills: ["Project Management", "Leadership", "Communication", "Problem Solving", "Team Collaboration"],

    missing_skills: ["Python", "Data Analysis", "Machine Learning", "SQL", "Agile Methodology"],

    recommendations: [

      {

        category: "Critical Keywords",

        suggestion: "Add 'Python programming' and 'data analysis' to your skills section",

        priority: "high"

      },

      {

        category: "Experience Rephrasing",

        suggestion: "Rephrase 'Managed team projects' to 'Led cross-functional teams using Agile methodology'",

        priority: "high"

      }

    ],

    keyword_analysis: {

      matched_keywords: ["management", "leadership", "team", "project", "communication"],

      missing_keywords: ["python", "data analysis", "machine learning", "sql", "agile"]

    }

  };



  if (!genAI) {

    console.log('🤖 Using mock job match data (no API key)');

    cacheService.cacheJobMatch(resumeText, jobDescription, mockResult);

    return mockResult;

  }



  try {

    const model = genAI.getGenerativeModel({ 

      model: 'gemini-1.5-flash',

      generationConfig: {

        maxOutputTokens: 1536,

        temperature: 0.3,

      }

    });



    const prompt = JOB_MATCH_PROMPT_TEMPLATE

      .replace('{RESUME_TEXT}', resumeText.substring(0, 6000))

      .replace('{JOB_DESCRIPTION}', jobDescription.substring(0, 4000));



    const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();



    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {

      throw new Error('Invalid response format from AI');

    }



    const comparisonResult = JSON.parse(jsonMatch[0]);

    

    // Cache the result

    cacheService.cacheJobMatch(resumeText, jobDescription, comparisonResult);

    

    return comparisonResult;

  } catch (error) {

    console.error('Error comparing with job description:', error);

    console.log('🤖 Falling back to mock job match data due to API error');

    cacheService.cacheJobMatch(resumeText, jobDescription, mockResult);

    return mockResult;

  }

};



// Optimized restructure suggestions with caching

export const generateRestructureSuggestions = async (resumeText: string, analysisResults?: any) => {

  // Create cache key including analysis results

  const cacheKey = `restructure_${resumeText.length}_${JSON.stringify(analysisResults || {}).length}`;

  const cached = cacheService.get(cacheKey);

  if (cached) {

    console.log('🔧 Using cached restructure suggestions');

    return cached;

  }



  const mockResult = {

    restructure_points: [

      {

        id: 'summary',

        category: 'Professional Summary',

        priority: 'high',

        current: 'Generic summary or objective statement',

        suggested: '[Your Years] [Your Role] with proven track record of [specific achievement with numbers]',

        reason: 'Recruiters spend 6 seconds on initial scan - summary must immediately show value',

        example: 'Senior Software Engineer with 7+ years delivering scalable web applications'

      }

    ],

    expected_impact: {

      interview_callbacks: 40,

      ats_pass_rate: 60,

      overall_score_increase: 25

    }

  };



  if (!genAI) {

    console.log('🤖 Using mock restructure data (no API key)');

    cacheService.set(cacheKey, mockResult, 2 * 60 * 60 * 1000); // 2 hours

    return mockResult;

  }



  try {

    const model = genAI.getGenerativeModel({ 

      model: 'gemini-1.5-flash',

      generationConfig: {

        maxOutputTokens: 1536,

        temperature: 0.3,

      }

    });



    const prompt = RESTRUCTURE_PROMPT_TEMPLATE.replace('{RESUME_TEXT}', resumeText.substring(0, 6000));



    const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();



    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {

      throw new Error('Invalid response format from AI');

    }



    const restructureResult = JSON.parse(jsonMatch[0]);

    

    // Cache the result

    cacheService.set(cacheKey, restructureResult, 2 * 60 * 60 * 1000);

    

    return restructureResult;

  } catch (error) {

    console.error('Error generating restructure suggestions:', error);

    console.log('🤖 Falling back to mock restructure data due to API error');

    cacheService.set(cacheKey, mockResult, 2 * 60 * 60 * 1000);

    return mockResult;

  }

};



// Export original functions for backward compatibility

