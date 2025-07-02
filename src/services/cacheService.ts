// cacheService.ts

// Cache service for storing analysis results and reducing API calls
class CacheService {
  // Using a Map for in-memory cache for efficient key-value storage
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  // Default Time-To-Live for cache entries: 24 hours in milliseconds
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; 

  /**
   * Generates a unique cache key using SHA-256 hashing.
   * This is an asynchronous operation due to the Web Crypto API.
   * Includes a type prefix to prevent collisions between different data types.
   * @param content The string content to hash (e.g., resume text, combined resume + job description).
   * @param type A discriminator for the type of data being cached (e.g., 'analysis', 'jobmatch', 'restructure').
   * @returns A Promise that resolves to a string representing the unique cache key.
   */
  private async generateKey(content: string, type: string): Promise<string> {
    // Ensure crypto.subtle is available (it should be in modern browsers/environments)
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      console.warn("[CacheService] Web Crypto API not available. Falling back to simple hash. Consider environment or polyfills.");
      // Fallback to a simpler, less collision-resistant hash if crypto API isn't available
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `${type}_fallback_${Math.abs(hash)}`;
    }

    const textEncoder = new TextEncoder(); // Encodes string to Uint8Array
    const data = textEncoder.encode(content);

    // Hash the data using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data); 
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
    
    // Convert bytes to a hexadecimal string representation
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
    
    return `${type}_${hexHash}`;
  }

  /**
   * Stores data in the in-memory cache and optionally in localStorage.
   * @param key The unique key for the cache entry.
   * @param data The data to be cached.
   * @param ttl The Time-To-Live for this entry in milliseconds. Defaults to DEFAULT_TTL.
   * @param persist Whether to also store this data in localStorage.
   */
  public set(key: string, data: any, ttl: number = this.DEFAULT_TTL, persist: boolean = false): void {
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, item);

    if (persist) {
      try {
        // Prepend 'cache_' to localStorage keys to easily identify and manage them
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn(`[CacheService] Failed to store item '${key}' in localStorage:`, error);
      }
    }
  }

  /**
   * Retrieves data from the in-memory cache. If expired, deletes it.
   * @param key The key of the cache entry to retrieve.
   * @returns The cached data, or null if not found or expired.
   */
  public get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // Check if the item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key); // Remove expired item from in-memory cache
      // Also attempt to remove from localStorage if it exists there (proactive cleanup)
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (error) {
        // Ignore, as it's a cleanup attempt
      }
      return null; // Item expired
    }

    return item.data; // Item is valid
  }

  /**
   * Retrieves data from localStorage and, if valid, rehydrates it into the in-memory cache.
   * @param key The key of the item in localStorage (without 'cache_' prefix).
   * @returns The data from localStorage, or null if not found, expired, or an error occurred.
   */
  private getFromLocalStorage(key: string): any | null {
    try {
      const stored = localStorage.getItem(`cache_${key}`); // Retrieve with 'cache_' prefix
      if (!stored) return null;

      const item = JSON.parse(stored);
      // Validate item structure and expiration
      if (item && item.data && typeof item.timestamp === 'number' && typeof item.ttl === 'number' && (Date.now() - item.timestamp < item.ttl)) {
        // Rehydrate to memory cache with adjusted TTL (remaining time)
        const remainingTtl = item.ttl - (Date.now() - item.timestamp);
        this.set(key, item.data, remainingTtl); 
        return item.data;
      } else {
        // Item is invalid or expired in localStorage, remove it
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
    } catch (error) {
      console.warn(`[CacheService] Failed to read or parse item '${key}' from localStorage (will remove):`, error);
      // If parsing fails, remove the corrupted entry
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
  }

  /**
   * Caches a resume analysis result. This is persistent across sessions.
   * @param resumeText The full text of the resume.
   * @param result The analysis result object.
   */
  public async cacheAnalysis(resumeText: string, result: any): Promise<void> {
    const key = await this.generateKey(resumeText, 'analysis');
    // Analysis results are typically cached for 24 hours (DEFAULT_TTL) and persisted
    this.set(key, result, this.DEFAULT_TTL, true); 
  }

  /**
   * Retrieves a cached resume analysis result. Checks in-memory first, then localStorage.
   * @param resumeText The full text of the resume.
   * @returns A Promise that resolves to the cached analysis result, or null.
   */
  public async getCachedAnalysis(resumeText: string): Promise<any | null> {
    const key = await this.generateKey(resumeText, 'analysis');
    
    // 1. Check in-memory cache first (fastest)
    let result = this.get(key);
    if (result) {
      return result;
    }

    // 2. If not in memory, check localStorage (persistent across sessions)
    result = this.getFromLocalStorage(key);
    if (result) {
      return result;
    }

    return null;
  }

  /**
   * Caches a job matching result. This is persistent across sessions.
   * @param resumeText The full text of the resume.
   * @param jobDescription The full text of the job description.
   * @param result The job matching result object.
   */
  public async cacheJobMatch(resumeText: string, jobDescription: string, result: any): Promise<void> {
    // Combine resume and job description to create a unique key for job match
    const combinedText = resumeText + '|||' + jobDescription;
    const key = await this.generateKey(combinedText, 'jobmatch');
    // Job matches are typically cached for 2 hours (specific TTL) and persisted
    this.set(key, result, 2 * 60 * 60 * 1000, true); 
  }

  /**
   * Retrieves a cached job matching result. Checks in-memory first, then localStorage.
   * @param resumeText The full text of the resume.
   * @param jobDescription The full text of the job description.
   * @returns A Promise that resolves to the cached job matching result, or null.
   */
  public async getCachedJobMatch(resumeText: string, jobDescription: string): Promise<any | null> {
    const combinedText = resumeText + '|||' + jobDescription;
    const key = await this.generateKey(combinedText, 'jobmatch');
    
    // 1. Check in-memory cache first
    let result = this.get(key);
    if (result) {
      return result;
    }

    // 2. If not in memory, check localStorage
    result = this.getFromLocalStorage(key);
    if (result) {
      return result;
    }

    return null;
  }
  
  /**
   * Caches restructure suggestions. This is persistent across sessions.
   * Note: The generateRestructureSuggestions function also passes `analysisResults`
   * in its cache key, which you would incorporate into the `content` passed to `generateKey`.
   * For this generic `set`/`get` wrapper, we only take the key.
   * @param cacheKey The unique key for the restructure entry (e.g., from generateRestructureSuggestions).
   * @param result The restructure suggestions object.
   * @param ttl The Time-To-Live for this entry in milliseconds.
   */
  public async cacheRestructureSuggestions(cacheKeyContent: string, result: any, ttl: number = 2 * 60 * 60 * 1000): Promise<void> {
    const key = await this.generateKey(cacheKeyContent, 'restructure');
    this.set(key, result, ttl, true); // Persist restructure suggestions
  }

  /**
   * Retrieves cached restructure suggestions.
   * @param cacheKeyContent The content used to generate the key for the restructure entry.
   * @returns A Promise that resolves to the cached restructure suggestions, or null.
   */
  public async getCachedRestructureSuggestions(cacheKeyContent: string): Promise<any | null> {
    const key = await this.generateKey(cacheKeyContent, 'restructure');
    let result = this.get(key);
    if (result) return result;
    return this.getFromLocalStorage(key);
  }


  /**
   * Cleans up expired entries from both in-memory cache and localStorage.
   * It's good practice to call this periodically.
   */
  public cleanup(): void {
    const now = Date.now();
    let cleanedMemoryCount = 0;
    let cleanedLocalStorageCount = 0;

    // Clean up in-memory cache
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedMemoryCount++;
      }
    }

    // Clean up localStorage entries
    try {
      const keysToRemove: string[] = [];
      // Iterate over all keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) { // Only process keys managed by this cache service
          try {
            const storedItem = localStorage.getItem(key);
            if (storedItem) {
              const item = JSON.parse(storedItem);
              // Check if item is valid and expired, or if it's malformed
              if (!item || typeof item.data === 'undefined' || typeof item.timestamp !== 'number' || typeof item.ttl !== 'number' || (now - item.timestamp > item.ttl)) {
                keysToRemove.push(key);
              }
            } else {
              // Key exists but getItem returned null (shouldn't happen for valid keys, but defensive)
              keysToRemove.push(key);
            }
          } catch (error) {
            // Malformed JSON, remove it
            keysToRemove.push(key);
            console.warn(`[CacheService] Malformed localStorage entry for key '${key}' detected during cleanup:`, error);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleanedLocalStorageCount++;
      });

    } catch (error) {
      console.warn('[CacheService] Failed to cleanup localStorage:', error);
    }
    // Uncomment the line below for verbose cleanup logging
    // console.log(`[CacheService] Cleanup complete. Removed ${cleanedMemoryCount} in-memory, ${cleanedLocalStorageCount} localStorage entries.`);
  }

  /**
   * Clears all entries from both in-memory cache and localStorage that are managed by this service.
   */
  public clear(): void {
    this.cache.clear(); // Clear in-memory cache
    console.log('[CacheService] In-memory cache cleared.');

    try {
      // Iterate and remove only keys managed by this service from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[CacheService] Cleared ${keysToRemove.length} entries from localStorage.`);
    } catch (error) {
      console.warn('[CacheService] Failed to clear localStorage:', error);
    }
  }
}

// Instantiate and export the cache service as a singleton
export const cacheService = new CacheService();

// Set up a periodic cleanup task to remove expired entries
// This runs every 30 minutes (30 * 60 * 1000 milliseconds)
setInterval(() => {
  cacheService.cleanup();
}, 30 * 60 * 1000);