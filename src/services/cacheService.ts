// Cache service for storing analysis results and reducing API calls

class CacheService {

  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours



  // Generate cache key from resume content

  private generateKey(content: string, type: string = 'analysis'): string {

    // Create a simple hash of the content

    let hash = 0;

    for (let i = 0; i < content.length; i++) {

      const char = content.charCodeAt(i);

      hash = ((hash << 5) - hash) + char;

      hash = hash & hash; // Convert to 32-bit integer

    }

    return `${type}_${Math.abs(hash)}`;

  }



  // Store data in cache

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {

    this.cache.set(key, {

      data,

      timestamp: Date.now(),

      ttl

    });

  }



  // Get data from cache

  get(key: string): any | null {

    const item = this.cache.get(key);

    if (!item) return null;



    // Check if expired

    if (Date.now() - item.timestamp > item.ttl) {

      this.cache.delete(key);

      return null;

    }



    return item.data;

  }



  // Cache analysis result

  cacheAnalysis(resumeText: string, result: any): void {

    const key = this.generateKey(resumeText, 'analysis');

    this.set(key, result);

    

    // Also store in localStorage for persistence

    try {

      localStorage.setItem(`cache_${key}`, JSON.stringify({

        data: result,

        timestamp: Date.now(),

        ttl: this.DEFAULT_TTL

      }));

    } catch (error) {

      console.warn('Failed to store in localStorage:', error);

    }

  }



  // Get cached analysis

  getCachedAnalysis(resumeText: string): any | null {

    const key = this.generateKey(resumeText, 'analysis');

    

    // First check memory cache

    let result = this.get(key);

    if (result) return result;



    // Then check localStorage

    try {

      const stored = localStorage.getItem(`cache_${key}`);

      if (stored) {

        const item = JSON.parse(stored);

        if (Date.now() - item.timestamp < item.ttl) {

          // Restore to memory cache

          this.set(key, item.data, item.ttl - (Date.now() - item.timestamp));

          return item.data;

        } else {

          localStorage.removeItem(`cache_${key}`);

        }

      }

    } catch (error) {

      console.warn('Failed to read from localStorage:', error);

    }



    return null;

  }



  // Cache job matching result

  cacheJobMatch(resumeText: string, jobDescription: string, result: any): void {

    const combinedText = resumeText + '|||' + jobDescription;

    const key = this.generateKey(combinedText, 'jobmatch');

    this.set(key, result, 2 * 60 * 60 * 1000); // 2 hours TTL for job matches

  }



  // Get cached job match

  getCachedJobMatch(resumeText: string, jobDescription: string): any | null {

    const combinedText = resumeText + '|||' + jobDescription;

    const key = this.generateKey(combinedText, 'jobmatch');

    return this.get(key);

  }



  // Clear expired entries

  cleanup(): void {

    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {

      if (now - item.timestamp > item.ttl) {

        this.cache.delete(key);

      }

    }



    // Cleanup localStorage

    try {

      const keys = Object.keys(localStorage);

      keys.forEach(key => {

        if (key.startsWith('cache_')) {

          try {

            const item = JSON.parse(localStorage.getItem(key) || '{}');

            if (now - item.timestamp > item.ttl) {

              localStorage.removeItem(key);

            }

          } catch (error) {

            localStorage.removeItem(key);

          }

        }

      });

    } catch (error) {

      console.warn('Failed to cleanup localStorage:', error);

    }

  }



  // Clear all cache

  clear(): void {

    this.cache.clear();

    try {

      const keys = Object.keys(localStorage);

      keys.forEach(key => {

        if (key.startsWith('cache_')) {

          localStorage.removeItem(key);

        }

      });

    } catch (error) {

      console.warn('Failed to clear localStorage:', error);

    }

  }

}



export const cacheService = new CacheService();



// Cleanup expired entries every 30 minutes

setInterval(() => {

  cacheService.cleanup();

}, 30 * 60 * 1000);