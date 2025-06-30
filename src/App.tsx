import { useState, useEffect } from 'react';
//import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { useSubscription } from './context/SubscriptionContext';
import LandingPage from './components/LandingPage';
import UploadPage from './components/UploadPage';
import AnalysisDashboard from './components/AnalysisDashboard';
import AuthModal from './components/AuthModal';
import LoadingAnalysis from './components/LoadingAnalysis';
import SubscriptionModal from './components/SubscriptionModal';
import LastAnalysisModal from './components/LastAnalysisModal';

type AppState = 'landing' | 'upload' | 'analyzing' | 'results';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLastAnalysisModal, setShowLastAnalysisModal] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(false);
  const { user, loading } = useAuth();
  const { subscription, trackFeatureUsage, getRemainingUsage, refreshSubscription, getUsageLimit } = useSubscription();

  // Reset to landing page when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setCurrentState('landing');
      setAnalysisResults(null);
      setShowAuthModal(false);
      setShowSubscriptionModal(false);
      setShowLastAnalysisModal(false);
      setPendingAnalysis(false);
    }
  }, [user, loading]);

  // Handle pending analysis after subscription modal closes
  useEffect(() => {
    if (pendingAnalysis && !showSubscriptionModal) {
      setPendingAnalysis(false);
      
      // Only proceed with analysis if user has upgraded to premium
      if (subscription?.isPremium) {
        setCurrentState('analyzing');
      } else {
        // User closed modal without upgrading, stay on upload page
        setCurrentState('upload');
      }
    }
  }, [pendingAnalysis, showSubscriptionModal, subscription?.isPremium]);

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
    
    // Store analysis results with resume data for future reference
    const storedResumeData = sessionStorage.getItem('currentResume');
    if (storedResumeData) {
      try {
        const resumeData = JSON.parse(storedResumeData);
        resumeData.analysisResults = results;
        sessionStorage.setItem('currentResume', JSON.stringify(resumeData));
        
        // Also store analysis results separately for quick access
        if (resumeData.id) {
          sessionStorage.setItem(`analysis_${resumeData.id}`, JSON.stringify(results));
        }
      } catch (error) {
        console.error('Error storing analysis results:', error);
      }
    }
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
  };

  const handleLastAnalysisModalClose = () => {
    setShowLastAnalysisModal(false);
    // After closing the modal, go to upload page
    setCurrentState('upload');
  };

  const handleViewLastAnalysis = () => {
    setShowLastAnalysisModal(false);
    // The resume data is already stored in session storage by the LandingPage component
    const storedResumeData = sessionStorage.getItem('currentResume');
    if (storedResumeData) {
      try {
        const resumeData = JSON.parse(storedResumeData);
        if (resumeData.analysisResults) {
          setAnalysisResults(resumeData.analysisResults);
          setCurrentState('results');
        } else {
          // If no analysis results, go to analyzing state
          setCurrentState('analyzing');
        }
      } catch (error) {
        console.error('Error parsing stored resume data:', error);
        setCurrentState('upload');
      }
    } else {
      // If no stored data, go to upload page
      setCurrentState('upload');
    }
  };

  const handleUpgradeFromModal = () => {
    setShowLastAnalysisModal(false);
    setShowSubscriptionModal(true);
  };

  // Handle viewing last analysis from landing page
  const handleViewLastAnalysisFromLanding = (resumeData: any) => {
    if (resumeData?.analysisResults) {
      setAnalysisResults(resumeData.analysisResults);
      setCurrentState('results');
    } else {
      // If no analysis results, go to analyzing state to analyze the resume
      setCurrentState('analyzing');
    }
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
        return (
          <LandingPage 
            onGetStarted={handleGetStarted}
            onViewLastAnalysis={handleViewLastAnalysisFromLanding}
          />
        );
      case 'upload':
        return (
          <UploadPage 
            onFileUploaded={handleFileUploaded}
            isQuotaExhausted={!subscription?.isPremium && !subscription?.isAdmin && getRemainingUsage('resume_analysis') === 0}
          />
        );
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

      {showLastAnalysisModal && (
        <LastAnalysisModal
          onClose={handleLastAnalysisModalClose}
          onViewAnalysis={handleViewLastAnalysis}
          onUpgrade={handleUpgradeFromModal}
          resumeData={null} // This will be handled by the modal itself
        />
      )}
    </div>
  );
}

export default App;