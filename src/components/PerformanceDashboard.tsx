import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Clock, DollarSign, TrendingUp, Database } from 'lucide-react';
import { PerformanceMonitor } from '../utils/performanceMonitor';
import { cacheService } from '../services/cacheService';

const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [cacheReport, setCacheReport] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(PerformanceMonitor.getStats());
      setCacheReport(PerformanceMonitor.getCacheReport());
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Only show in development or for admin users
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    setShowDashboard(isDev || isAdmin);
  }, []);

  if (!showDashboard || !stats || !cacheReport) {
    return null;
  }

  const handleClearCache = () => {
    cacheService.clear();
    alert('Cache cleared successfully!');
  };

/*  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance Monitor
          </h3>
          <button
            onClick={handleClearCache}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear Cache
          </button>
        </div>

        <div className="space-y-3">*/
          {/* Cache Hit Rate */}
          /*<div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-gray-700">Cache Hit Rate</span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              {stats.cacheHitRate.toFixed(1)}%
            </span>
          </div>

          {/* Average Response Time }
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-gray-700">Avg Response</span>
            </div>
            <span className="text-sm font-semibold text-blue-600">
              {stats.averageResponseTime.toFixed(0)}ms
            </span>
          </div>

          {/* Tokens Saved }
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-purple-600 mr-2" />
              <span className="text-sm text-gray-700">Tokens Saved</span>
            </div>
            <span className="text-sm font-semibold text-purple-600">
              {stats.tokensSaved.toLocaleString()}
            </span>
          </div>

          {/* Cost Savings }
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-gray-700">Cost Saved (24h)</span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              ${cacheReport.estimatedCostSavings.toFixed(4)}
            </span>
          </div>

          {/* Cache Stats }
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>API Calls: {cacheReport.apiCalls}</span>
              <span>Cached: {cacheReport.cachedCalls}</span>
            </div>
          </div>
        </div>

        {/* Performance Indicator }
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              stats.cacheHitRate > 70 ? 'bg-green-500' :
              stats.cacheHitRate > 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs text-gray-600">
              {stats.cacheHitRate > 70 ? 'Excellent' :
               stats.cacheHitRate > 40 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );*/
};

export default PerformanceDashboard;