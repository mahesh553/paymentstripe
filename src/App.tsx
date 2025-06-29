import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { useSubscription } from './context/SubscriptionContext';
import LandingPage from './components/LandingPage';
import UploadPage from './components/UploadPage';
import AnalysisDashboard from './components/AnalysisDashboard';
import AuthModal from './components/AuthModal';
import LoadingAnalysis from './components/LoadingAnalysis';
import SubscriptionModal from './components/SubscriptionModal';

type AppState = 'landing' | 'upload' | 'analyzing' | 'results';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const { user, loading } = useAuth();
  const { subscription, trackFeatureUsage } = useSubscription();

  // Reset to landing page when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setCurrentState('landing');
      setAnalysisResults(null);
      setShowAuthModal(false);
      setShowSubscriptionModal(false);
      setPendingAnalysis(false);
    }
  }, [user, loading]);

  // Handle pending analysis after subscription modal closes
  useEffect(() => {
    if (pendingAnalysis && !showSubscriptionModal) {
      setPendingAnalysis(false);
      // Proceed with analysis regardless of subscription status
      setCurrentState('analyzing');
    }
  }, [pendingAnalysis, showSubscriptionModal]);

  const handleGetStarted = () => {
    if (user) {
      setCurrentState('upload');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleFileUploaded = async () => {
    if (!user) return;

    // Check if user can perform resume analysis
    const canAnalyze = await trackFeatureUsage('resume_analysis');
    
    if (!canAnalyze) {
      // Set pending analysis flag and show subscription modal
      setPendingAnalysis(true);
      setShowSubscriptionModal(true);
      return;
    }

    // User has access, proceed with analysis
    setCurrentState('analyzing');
  };

  const handleAnalysisComplete = (results: any) => {
    setAnalysisResults(results);
    setCurrentState('results');
  };

  const handleBackToUpload = () => {
    setCurrentState('upload');
    setAnalysisResults(null);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setCurrentState('upload');
  };

  const handleSubscriptionModalClose = () => {
    setShowSubscriptionModal(false);
    // Don't reset pendingAnalysis here - let the useEffect handle it
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderCurrentState = () => {
    switch (currentState) {
      case 'landing':
        return <LandingPage onGetStarted={handleGetStarted} />;
      case 'upload':
        return <UploadPage onFileUploaded={handleFileUploaded} />;
      case 'analyzing':
        return <LoadingAnalysis onComplete={handleAnalysisComplete} />;
      case 'results':
        return <AnalysisDashboard results={analysisResults} onBack={handleBackToUpload} />;
      default:
        return <LandingPage onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderCurrentState()}
      
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal
          onClose={handleSubscriptionModalClose}
          feature="resume_analysis"
          title="Upgrade to Continue"
          description="You've reached your free analysis limit. Upgrade to get 20 analyses per day."
        />
      )}
    </div>
  );
}

export default App;