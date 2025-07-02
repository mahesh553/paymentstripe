import { useState, useCallback } from 'react';
import { analyzeResume, compareWithJobDescription, generateRestructureSuggestions } from '../services/optimizedGeminiService';
import { DatabaseCacheService } from '../services/databaseCacheService';
import { useAuth } from '../context/AuthContext'; // Assuming this is the correct path to your AuthContext

export const useOptimizedAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Define a default/fallback analysis result structure.
  // This ensures that even if analysis fails or cache is empty,
  // the returned object always has the expected 'overall_score' property.
  const DEFAULT_ANALYSIS_RESULT = {
    overall_score: 0, // Default to 0 or a sensible starting score
    ats_score: 0,
    industry_score: 0,
    potential_improvement: 0,
    quick_wins: [],
    sections: {
      contact_info: { score: 0, feedback: "No analysis available.", suggestions: [], present: false },
      professional_summary: { score: 0, feedback: "No analysis available.", suggestions: [], present: false },
      work_experience: { score: 0, feedback: "No analysis available.", suggestions: [], present: false },
      education: { score: 0, feedback: "No analysis available.", suggestions: [], present: false },
      skills: { score: 0, feedback: "No analysis available.", suggestions: [], present: false },
      achievements: { score: 0, feedback: "No analysis available.", suggestions: [], present: false }
    },
    recommendations: ["Analysis could not be completed at this time."],
    strengths: [],
    improvements: [],
    keywords: []
  };

  // Optimized resume analysis with multi-level caching
  const analyzeResumeOptimized = useCallback(async (resumeText: string, resumeId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // First check database cache if we have resumeId
      if (resumeId) {
        console.log('[useOptimizedAnalysis] 🔍 Checking database cache for resume ID:', resumeId);
        const cachedResult = await DatabaseCacheService.getCachedAnalysis(resumeId);

        // IMPORTANT: Validate cachedResult to ensure it's not null/undefined and has overall_score
        if (cachedResult && typeof cachedResult.overall_score === 'number') {
          console.log('[useOptimizedAnalysis] 📋 Using database cached analysis for resume ID:', resumeId);
          setLoading(false);
          return cachedResult;
        } else {
          console.warn('[useOptimizedAnalysis] Cached analysis not found, too old, or invalid for resume ID:', resumeId, '. Performing new analysis.');
          // If cachedResult is null, undefined, or malformed, we proceed to perform a new analysis.
        }
      } else {
        console.log('[useOptimizedAnalysis] No resumeId provided, skipping database cache check.');
      }

      // If no valid cache found (or no resumeId), perform new analysis
      console.log('[useOptimizedAnalysis] 🤖 Performing new analysis...');
      const result = await analyzeResume(resumeText); // This function is designed to return a valid object (or mock)

      // Store in database cache if we have resumeId, user, and the result is valid
      if (resumeId && user && result && typeof result.overall_score === 'number') {
        console.log('[useOptimizedAnalysis] Storing new analysis in database cache for resume ID:', resumeId);
        DatabaseCacheService.storeAnalysis(resumeId, 'general', result, result.overall_score);
      } else if (!user) {
          console.warn('[useOptimizedAnalysis] User not authenticated, skipping database cache storage.');
      } else if (!result || typeof result.overall_score !== 'number') {
          console.warn('[useOptimizedAnalysis] Analysis result invalid, skipping database cache storage.');
      }


      setLoading(false);
      return result; // analyzeResume should ensure 'result' is never null/undefined

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setLoading(false);
      console.error('[useOptimizedAnalysis] Analysis error caught:', err);
      // Return a default error analysis structure on failure, preventing TypeError
      return {
        ...DEFAULT_ANALYSIS_RESULT,
        recommendations: [`Analysis failed: ${errorMessage}. Please try again.`],
      };
    }
  }, [user]);

  // Optimized job matching with caching
  const compareJobOptimized = useCallback(async (resumeText: string, jobDescription: string, resumeId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Check database cache for similar job descriptions
      if (resumeId) {
        console.log('[useOptimizedAnalysis] 🔍 Checking for similar job matches in DB for resume ID:', resumeId);
        const cachedResult = await DatabaseCacheService.getCachedJobMatch(resumeId, jobDescription);
        if (cachedResult) {
          console.log('[useOptimizedAnalysis] 🎯 Using cached job match for resume ID:', resumeId);
          setLoading(false);
          return cachedResult;
        }
      }

      // Perform job comparison
      console.log('[useOptimizedAnalysis] 🤖 Performing new job comparison...');
      const result = await compareWithJobDescription(resumeText, jobDescription);

      // Store in database cache
      if (resumeId && user) {
        DatabaseCacheService.storeJobMatch(resumeId, jobDescription, result);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Job comparison failed';
      setError(errorMessage);
      setLoading(false);
      console.error('[useOptimizedAnalysis] Job comparison error caught:', err);
      throw err; // Re-throw to be handled by the calling component if needed
    }
  }, [user]);

  // Optimized restructure suggestions
  const generateRestructureOptimized = useCallback(async (resumeText: string, analysisResults?: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useOptimizedAnalysis] 🔧 Generating restructure suggestions...');
      const result = await generateRestructureSuggestions(resumeText, analysisResults);
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restructure generation failed';
      setError(errorMessage);
      setLoading(false);
      console.error('[useOptimizedAnalysis] Restructure generation error caught:', err);
      throw err; // Re-throw to be handled by the calling component if needed
    }
  }, []);

  return {
    analyzeResumeOptimized,
    compareJobOptimized,
    generateRestructureOptimized,
    loading,
    error
  };
};
