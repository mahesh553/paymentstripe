import { supabase } from '../lib/supabase';

// Database-based caching for analysis results
export class DatabaseCacheService {
  // Store analysis result in database
  static async storeAnalysis(resumeId: string, analysisType: string, results: any, score?: number) {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .upsert({
          resume_id: resumeId,
          analysis_type: analysisType,
          results,
          score,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'resume_id,analysis_type'
        })
        .select();

      if (error) {
        console.error('Error storing analysis:', error);
        return null;
      }

      // Return the first item if data is an array, otherwise return data
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('Error in storeAnalysis:', error);
      return null;
    }
  }

  // Get cached analysis from database
  static async getCachedAnalysis(resumeId: string, analysisType: string = 'general') {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('resume_id', resumeId)
        .eq('analysis_type', analysisType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting cached analysis:', error);
        return null;
      }

      // Check if we have any data
      if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
      }

      const analysisData = data[0];

      // Check if analysis is recent (within 7 days)
      const analysisDate = new Date(analysisData.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      if (analysisDate < weekAgo) {
        return null; // Analysis is too old
      }

      return analysisData.results;
    } catch (error) {
      console.error('Error getting cached analysis:', error);
      return null;
    }
  }

  // Store job match result
  static async storeJobMatch(resumeId: string, jobDescription: string, results: any) {
    try {
      const { data, error } = await supabase
        .from('job_matches')
        .insert({
          resume_id: resumeId,
          job_description: jobDescription.substring(0, 5000), // Limit length
          match_score: results.match_score || 0,
          matching_skills: results.matching_skills || [],
          missing_skills: results.missing_skills || [],
          recommendations: results,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error storing job match:', error);
        return null;
      }

      // Return the first item if data is an array, otherwise return data
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('Error in storeJobMatch:', error);
      return null;
    }
  }

  // Get cached job match (check for similar job descriptions)
  static async getCachedJobMatch(resumeId: string, jobDescription: string) {
    try {
      // Look for exact or similar job descriptions
      const { data, error } = await supabase
        .from('job_matches')
        .select('*')
        .eq('resume_id', resumeId)
        .order('created_at', { ascending: false })
        .limit(10); // Get recent matches

      if (error) {
        console.error('Error getting cached job match:', error);
        return null;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return null;
      }

      // Simple similarity check - look for matches with similar length and keywords
      const jobWords = jobDescription.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      const jobLength = jobDescription.length;

      for (const match of data) {
        const matchWords = match.job_description.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const matchLength = match.job_description.length;

        // Check length similarity (within 20%)
        if (Math.abs(jobLength - matchLength) / Math.max(jobLength, matchLength) > 0.2) {
          continue;
        }

        // Check keyword overlap (at least 60% common words)
        const commonWords = jobWords.filter(word => matchWords.includes(word));
        const similarity = commonWords.length / Math.max(jobWords.length, matchWords.length);

        if (similarity >= 0.6) {
          // Check if analysis is recent (within 24 hours)
          const analysisDate = new Date(match.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          if (analysisDate >= dayAgo) {
            return match.recommendations;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached job match:', error);
      return null;
    }
  }

  // Clean up old cache entries
  static async cleanupOldEntries() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Clean old analyses
      await supabase
        .from('analyses')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      // Clean old job matches
      await supabase
        .from('job_matches')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      console.log('🧹 Cleaned up old cache entries');
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
}

// Run cleanup once per day
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
let lastCleanup = parseInt(localStorage.getItem('lastCacheCleanup') || '0');

if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
  DatabaseCacheService.cleanupOldEntries();
  localStorage.setItem('lastCacheCleanup', Date.now().toString());
}