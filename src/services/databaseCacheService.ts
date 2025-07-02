// databaseCacheService.ts
import { supabase } from '../lib/supabase'; // Assuming this path is correct

// Define interfaces for better type safety (optional but good practice)
interface AnalysisResult {
  id?: string; // Supabase generates
  resume_id: string;
  analysis_type: string;
  results: any; // JSONB column
  score?: number;
  created_at: string;
}

interface JobMatchResult {
  id?: string; // Supabase generates
  resume_id: string;
  job_description: string;
  job_description_hash: string; // New column for robust matching
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: any; // JSONB column (full results)
  created_at: string;
}

// Database-based caching for analysis results
export class DatabaseCacheService {

  /**
   * Generates a unique, robust hash using SHA-256 for content.
   * This is an asynchronous operation.
   * @param content The string content to hash.
   * @returns A Promise that resolves to a SHA-256 hash string.
   */
  private static async generateSha256Hash(content: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback for environments without Web Crypto API (e.g., some Node.js contexts without polyfill)
      // This simple hash is less collision-resistant but prevents breaking in non-browser environments.
      console.warn("[DatabaseCacheService] Web Crypto API not available. Falling back to simple hash for key generation.");
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `fallback_${Math.abs(hash)}`;
    }

    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hexHash;
  }

  /**
   * Stores an analysis result in the database. Uses upsert to update if an entry
   * for the given resume_id and analysis_type already exists.
   * @param resumeId The ID of the resume.
   * @param analysisType The type of analysis (e.g., 'general', 'ats').
   * @param results The JSON results of the analysis.
   * @param score Optional overall score.
   * @returns The stored analysis record or null on error.
   */
  static async storeAnalysis(resumeId: string, analysisType: string, results: any, score?: number): Promise<AnalysisResult | null> {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .upsert({
          resume_id: resumeId,
          analysis_type: analysisType,
          results, // Make sure 'results' maps to a JSONB column in your DB
          score,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'resume_id,analysis_type' // Conflict on this unique pair
        })
        .select(); // Request the inserted/updated data back

      if (error) {
        console.error('Error storing analysis:', error);
        return null;
      }

      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('Error in storeAnalysis:', error);
      return null;
    }
  }

  /**
   * Retrieves a cached analysis from the database.
   * Checks for recency (within 7 days) as a TTL.
   * @param resumeId The ID of the resume.
   * @param analysisType The type of analysis (defaults to 'general').
   * @returns The cached analysis results or null if not found, too old, or an error occurred.
   */
  static async getCachedAnalysis(resumeId: string, analysisType: string = 'general'): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('resume_id', resumeId)
        .eq('analysis_type', analysisType)
        .order('created_at', { ascending: false }) // Get the most recent one
        .limit(1);

      if (error) {
        console.error('Error getting cached analysis:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null; // No analysis found
      }

      const analysisData: AnalysisResult = data[0];

      // Check if analysis is recent (within 7 days)
      const analysisDate = new Date(analysisData.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
      if (analysisDate < weekAgo) {
        console.log(`Cached analysis for ${resumeId} (${analysisType}) found but is too old.`);
        return null; // Analysis is too old
      }

      return analysisData.results;
    } catch (error) {
      console.error('Error in getCachedAnalysis:', error);
      return null;
    }
  }

  /**
   * Stores a job match result in the database.
   * Attempts to upsert based on resume_id and job_description_hash for robust updates.
   * Falls back to insert if the upsert fails (e.g., job_description_hash column not present yet).
   * @param resumeId The ID of the resume.
   * @param jobDescription The job description text.
   * @param results The job match results object.
   * @returns The stored job match record or null on error.
   */
  static async storeJobMatch(resumeId: string, jobDescription: string, results: any): Promise<JobMatchResult | null> {
    const jobDescriptionTruncated = jobDescription.substring(0, 5000); // Limit length for DB column
    const jobDescriptionHash = await this.generateSha256Hash(jobDescription); // Generate hash for robust matching

    try {
      // Attempt to UPSERT first using the hash for unique conflict resolution
      const { data, error } = await supabase
        .from('job_matches')
        .upsert({
          resume_id: resumeId,
          job_description: jobDescriptionTruncated,
          job_description_hash: jobDescriptionHash, // NEW: Using the hash
          match_score: results.match_score || 0,
          matching_skills: results.matching_skills || [],
          missing_skills: results.missing_skills || [],
          recommendations: results, // Storing full results in 'recommendations' (jsonb)
          created_at: new Date().toISOString()
        }, {
          onConflict: 'resume_id,job_description_hash' // Conflict on this unique pair
        })
        .select();

      if (error) {
        // Check for specific error related to the 'onConflict' column not existing or constraint
        // Supabase Postgrest errors might have 'details' or 'code'
        if (error.code === '42P01' || error.message.includes('job_description_hash')) { // Example error code for undefined column
          console.warn("[DatabaseCacheService] 'job_description_hash' column/constraint not found or other upsert error. Falling back to simple INSERT.");
          // Fallback to INSERT if UPSERT with hash fails (e.g., schema not updated yet)
          // This ensures existing functionality is not broken.
          const { data: insertData, error: insertError } = await supabase
            .from('job_matches')
            .insert({
              resume_id: resumeId,
              job_description: jobDescriptionTruncated,
              // job_description_hash is omitted for fallback insert
              match_score: results.match_score || 0,
              matching_skills: results.matching_skills || [],
              missing_skills: results.missing_skills || [],
              recommendations: results,
              created_at: new Date().toISOString()
            })
            .select();
          
          if (insertError) {
            console.error('Error storing job match via fallback INSERT:', insertError);
            return null;
          }
          return Array.isArray(insertData) ? insertData[0] : insertData;
        } else {
          console.error('Error storing job match:', error);
          return null;
        }
      }

      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error('Error in storeJobMatch:', error);
      return null;
    }
  }

  /**
   * Retrieves a cached job match from the database.
   * Prioritizes exact hash matches, then falls back to heuristic similarity for recent entries.
   * @param resumeId The ID of the resume.
   * @param jobDescription The job description text.
   * @returns The cached job match recommendations or null if not found, too old, or an error occurred.
   */
  static async getCachedJobMatch(resumeId: string, jobDescription: string): Promise<any | null> {
    const targetJobDescriptionHash = await this.generateSha256Hash(jobDescription);

    try {
      // 1. Attempt to find an exact match by hash first (most reliable)
      const { data: exactMatchData, error: exactMatchError } = await supabase
        .from('job_matches')
        .select('*')
        .eq('resume_id', resumeId)
        .eq('job_description_hash', targetJobDescriptionHash) // NEW: Query by hash
        .order('created_at', { ascending: false })
        .limit(1);

      if (exactMatchError) {
        console.error('Error querying for exact job match:', exactMatchError);
        // Do not return null yet, proceed to heuristic check potentially if hash query failed for non-schema reasons
      } else if (exactMatchData && exactMatchData.length > 0) {
        const exactMatch = exactMatchData[0] as JobMatchResult;
        const matchDate = new Date(exactMatch.created_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (matchDate >= dayAgo) {
          console.log(`Exact cached job match for resume ${resumeId} found by hash and is recent.`);
          return exactMatch.recommendations;
        } else {
          console.log(`Exact cached job match for resume ${resumeId} found by hash but is too old.`);
          // Exact match found but expired, might proceed to heuristic or force new analysis
          // For now, will continue to heuristic part or return null if no heuristic applies.
        }
      }

      // 2. Fallback to heuristic similarity check if no recent exact hash match found
      // This covers cases where 'job_description_hash' might not be populated or exact hash is old.
      const { data: recentMatches, error: recentMatchesError } = await supabase
        .from('job_matches')
        .select('*')
        .eq('resume_id', resumeId)
        .order('created_at', { ascending: false })
        .limit(10); // Get up to 10 recent matches for heuristic comparison

      if (recentMatchesError) {
        console.error('Error getting recent job matches for heuristic check:', recentMatchesError);
        return null;
      }

      if (!recentMatches || recentMatches.length === 0) {
        return null; // No recent matches for this resume
      }

      const jobWords = jobDescription.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      const jobLength = jobDescription.length;

      for (const match of recentMatches as JobMatchResult[]) {
        // Skip if this match was an exact hash match we already checked (and potentially discarded for being old)
        // This prevents redundant heuristic check on the same exact match if it was found but too old.
        if (match.job_description_hash === targetJobDescriptionHash) {
          continue; 
        }

        const matchWords = match.job_description.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        const matchLength = match.job_description.length;

        // Check length similarity (within 20%)
        if (Math.abs(jobLength - matchLength) / Math.max(jobLength, matchLength) > 0.2) {
          // Check keyword overlap (at least 60% common words)
          const commonWords = jobWords.filter(word => matchWords.includes(word));
          const similarity = commonWords.length / Math.max(jobWords.length, matchWords.length);

          if (similarity >= 0.6) {
            // Check if analysis is recent (within 24 hours)
            const analysisDate = new Date(match.created_at);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            if (analysisDate >= dayAgo) {
              console.log(`Heuristic cached job match for resume ${resumeId} found and is recent.`);
              return match.recommendations;
            } else {
              console.log(`Heuristic cached job match for resume ${resumeId} found but is too old.`);
            }
          }
        }
      }

      return null; // No recent, valid match found by either hash or heuristic
    } catch (error) {
      console.error('Error in getCachedJobMatch:', error);
      return null;
    }
  }

  /**
   * Cleans up old cache entries from both 'analyses' and 'job_matches' tables.
   * Entries older than 30 days will be deleted.
   */
  static async cleanupOldEntries(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log('🧹 Starting cleanup of old cache entries...');

      // Clean old analyses
      const { error: analysesError } = await supabase
        .from('analyses')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      if (analysesError) {
        console.error('Error cleaning up old analyses:', analysesError);
      } else {
        console.log('✅ Old analyses cleaned up.');
      }

      // Clean old job matches
      const { error: jobMatchesError } = await supabase
        .from('job_matches')
        .delete()
        .lt('created_at', thirtyDaysAgo);

      if (jobMatchesError) {
        console.error('Error cleaning up old job matches:', jobMatchesError);
      } else {
        console.log('✅ Old job matches cleaned up.');
      }
      
    } catch (error) {
      console.error('Error in cleanupOldEntries:', error);
    }
  }
}

// --- Global Cleanup Scheduling ---
// This client-side scheduling attempts to run cleanup once per day.
// For robust, guaranteed cleanup, a server-side cron job or Supabase Edge Function is recommended.
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let lastCleanup = parseInt(localStorage.getItem('lastCacheCleanup') || '0', 10); // Use parseInt with radix

// Check if cleanup needs to run on application load
if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
  console.log('Initiating daily cache cleanup...');
  DatabaseCacheService.cleanupOldEntries();
  localStorage.setItem('lastCacheCleanup', Date.now().toString());
}

// Optionally, you could set up a setInterval for cleanup if the app runs for very long periods
// but for most web apps, the on-load check combined with DB-side TTLs is sufficient.
// setInterval(() => {
//   DatabaseCacheService.cleanupOldEntries();
// }, CLEANUP_INTERVAL);