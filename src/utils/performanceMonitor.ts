// Performance monitoring and optimization utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static apiCalls: { endpoint: string; timestamp: number; cached: boolean }[] = [];

  // Track API call performance
  static trackApiCall(endpoint: string, duration: number, cached: boolean = false) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    this.metrics.get(endpoint)!.push(duration);
    this.apiCalls.push({
      endpoint,
      timestamp: Date.now(),
      cached
    });

    // Keep only last 100 calls
    if (this.apiCalls.length > 100) {
      this.apiCalls = this.apiCalls.slice(-100);
    }

    // Log performance info
    if (!cached) {
      console.log(`📊 API Call: ${endpoint} took ${duration}ms`);
    } else {
      console.log(`⚡ Cache Hit: ${endpoint} served from cache`);
    }
  }

  // Get performance statistics
  static getStats() {
    const stats = {
      totalCalls: this.apiCalls.length,
      cachedCalls: this.apiCalls.filter(call => call.cached).length,
      cacheHitRate: 0,
      averageResponseTime: 0,
      tokensSaved: 0
    };

    if (stats.totalCalls > 0) {
      stats.cacheHitRate = (stats.cachedCalls / stats.totalCalls) * 100;
    }

    // Calculate average response time for non-cached calls
    const nonCachedCalls = this.apiCalls.filter(call => !call.cached);
    if (nonCachedCalls.length > 0) {
      const totalTime = Array.from(this.metrics.values())
        .flat()
        .reduce((sum, time) => sum + time, 0);
      stats.averageResponseTime = totalTime / nonCachedCalls.length;
    }

    // Estimate tokens saved (rough calculation)
    stats.tokensSaved = stats.cachedCalls * 1000; // Assume ~1000 tokens per analysis

    return stats;
  }

  // Get cache efficiency report
  static getCacheReport() {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentCalls = this.apiCalls.filter(call => call.timestamp > last24Hours);
    
    const report = {
      period: '24 hours',
      totalCalls: recentCalls.length,
      cachedCalls: recentCalls.filter(call => call.cached).length,
      apiCalls: recentCalls.filter(call => !call.cached).length,
      cacheHitRate: 0,
      estimatedCostSavings: 0
    };

    if (report.totalCalls > 0) {
      report.cacheHitRate = (report.cachedCalls / report.totalCalls) * 100;
    }

    // Estimate cost savings (assuming $0.001 per 1000 tokens)
    report.estimatedCostSavings = (report.cachedCalls * 1000 * 0.001) / 1000;

    return report;
  }

  // Clear old metrics
  static cleanup() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.apiCalls = this.apiCalls.filter(call => call.timestamp > oneWeekAgo);
  }

  // Log performance summary
  static logSummary() {
    const stats = this.getStats();
    const report = this.getCacheReport();

    console.group('📊 Performance Summary');
    console.log(`Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
    console.log(`Average Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);
    console.log(`Estimated Tokens Saved: ${stats.tokensSaved.toLocaleString()}`);
    console.log(`Cost Savings (24h): $${report.estimatedCostSavings.toFixed(4)}`);
    console.groupEnd();
  }
}

// Auto-cleanup every hour
setInterval(() => {
  PerformanceMonitor.cleanup();
}, 60 * 60 * 1000);

// Log summary every 10 minutes in development
if (import.meta.env.DEV) {
  setInterval(() => {
    PerformanceMonitor.logSummary();
  }, 10 * 60 * 1000);
}