import { useState, useCallback } from 'react';
import { analyzeResume, compareWithJobDescription, generateRestructureSuggestions } from '../services/optimizedGeminiService';
import { DatabaseCacheService } from '../services/databaseCacheService';
import { useAuth } from '../context/AuthContext';

export const useOptimizedAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Optimized resume analysis with multi-level caching
  const analyzeResumeOptimized = useCallback(async (resumeText: string, resumeId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // First check database cache if we have resumeId
      if (resumeId) {
        console.log('🔍 Checking database cache...');
        const cachedResult = await DatabaseCacheService.getCachedAnalysis(resumeId);
        if (cachedResult) {
          console.log('📋 Using database cached analysis');
          setLoading(false);
          return cachedResult;
        }
      }

      // Perform analysis (will check memory/localStorage cache internally)
      console.log('🤖 Performing new analysis...');
      const result = await analyzeResume(resumeText);

      // Store in database cache if we have resumeId
      if (resumeId && user && result) {
        DatabaseCacheService.storeAnalysis(resumeId, 'general', result, result.overall_score);
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [user]);

  // Optimized job matching with caching
  const compareJobOptimized = useCallback(async (resumeText: string, jobDescription: string, resumeId?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Check database cache for similar job descriptions
      if (resumeId) {
        console.log('🔍 Checking for similar job matches...');
        const cachedResult = await DatabaseCacheService.getCachedJobMatch(resumeId, jobDescription);
        if (cachedResult) {
          console.log('🎯 Using cached job match');
          setLoading(false);
          return cachedResult;
        }
      }

      // Perform job comparison
      console.log('🤖 Performing new job comparison...');
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
      throw err;
    }
  }, [user]);

  // Optimized restructure suggestions
  const generateRestructureOptimized = useCallback(async (resumeText: string, analysisResults?: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔧 Generating restructure suggestions...');
      const result = await generateRestructureSuggestions(resumeText, analysisResults);
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restructure generation failed';
      setError(errorMessage);
      setLoading(false);
      throw err;
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