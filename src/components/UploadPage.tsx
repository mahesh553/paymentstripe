import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check, AlertCircle, Crown, Lock, Eye, BarChart3 } from 'lucide-react';
import { validateFile, extractTextFromFile } from '../services/fileExtractor';
import { uploadResume, createResumeRecord, getUserResumes } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import UserMenu from './UserMenu';
import SubscriptionModal from './SubscriptionModal';

interface UploadPageProps {
  onFileUploaded: () => void;
  isQuotaExhausted?: boolean;
}

const UploadPage: React.FC<UploadPageProps> = ({ onFileUploaded, isQuotaExhausted }) => {
  const { user } = useAuth();
  const { subscription, getRemainingUsage, getUsageLimit } = useSubscription();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lastResumeData, setLastResumeData] = useState<any>(null);
  const [loadingLastResume, setLoadingLastResume] = useState(false);

  const remainingAnalyses = getRemainingUsage('resume_analysis');
  const totalLimit = getUsageLimit('resume_analysis');
  const usedAnalyses = totalLimit > 0 ? totalLimit - remainingAnalyses : 0;
  const canUpload = subscription?.isPremium || subscription?.isAdmin || remainingAnalyses > 0;

  // Fetch last resume data from database when component mounts
  useEffect(() => {
    const fetchLastResumeFromDatabase = async () => {
      if (!user) return;

      setLoadingLastResume(true);
      try {
        console.log('Fetching last resume from database for upload page:', user.email);
        
        // Get user's resumes from database, ordered by most recent
        const { data: resumes, error } = await getUserResumes(user.id);
        
        if (error) {
          console.error('Error fetching user resumes:', error);
          return;
        }

        if (resumes && resumes.length > 0) {
          // Get the most recent resume
          const mostRecentResume = resumes[0];
          console.log('Found most recent resume for upload page:', mostRecentResume.filename);
          
          // Check if there's stored analysis results in session storage for this resume
          const storedAnalysisKey = `analysis_${mostRecentResume.id}`;
          const storedAnalysis = sessionStorage.getItem(storedAnalysisKey);
          
          let analysisResults = null;
          if (storedAnalysis) {
            try {
              analysisResults = JSON.parse(storedAnalysis);
              console.log('Found stored analysis results for resume on upload page');
            } catch (error) {
              console.error('Error parsing stored analysis:', error);
            }
          }

          // Set the resume data with analysis if available
          const resumeData = {
            ...mostRecentResume,
            text: mostRecentResume.original_text,
            analysisResults: analysisResults
          };
          
          setLastResumeData(resumeData);
          console.log('Last resume data loaded from database on upload page:', resumeData.filename);
        } else {
          console.log('No resumes found in database for upload page');
          setLastResumeData(null);
        }
      } catch (error) {
        console.error('Error fetching last resume from database:', error);
      } finally {
        setLoadingLastResume(false);
      }
    };

    if (user && !loadingLastResume) {
      fetchLastResumeFromDatabase();
    }
  }, [user]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!canUpload) {
      setShowUpgradeModal(true);
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setUploadedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  }, [canUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !canUpload
  });

  const handleUpload = async () => {
    if (!uploadedFile || !user || !canUpload) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(uploadedFile);

      // Upload file to Supabase Storage
      const { data: _uploadData, error: uploadError, fileName } = await uploadResume(uploadedFile, user.id);
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Create resume record in database
      const resumeData = {
        user_id: user.id,
        filename: uploadedFile.name,
        file_path: fileName,
        file_size: uploadedFile.size,
        file_type: uploadedFile.type,
        original_text: extractedText
      };

      const { data: resumeRecord, error: recordError } = await createResumeRecord(resumeData);
      
      if (recordError) {
        throw new Error(`Failed to save resume record: ${recordError.message}`);
      }

      setUploadSuccess(true);
      
      // Store resume data for analysis
      const currentResumeData = {
        ...resumeRecord,
        text: extractedText
      };
      
      sessionStorage.setItem('currentResume', JSON.stringify(currentResumeData));

      // Proceed to analysis
      setTimeout(() => {
        onFileUploaded();
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleAnalyzeLastResume = async () => {
    if (!lastResumeData || !user) return;

    // Check if user can perform resume analysis
    const { subscription: currentSubscription, trackFeatureUsage } = await import('../context/SubscriptionContext');
    
    // For quota-exhausted users, show upgrade modal
    if (!subscription?.isPremium && !subscription?.isAdmin && remainingAnalyses === 0) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      // Track feature usage
      const canAnalyze = await trackFeatureUsage('resume_analysis');
      
      if (!canAnalyze) {
        setShowUpgradeModal(true);
        return;
      }

      // Store the last resume data for analysis
      sessionStorage.setItem('currentResume', JSON.stringify({
        ...lastResumeData,
        text: lastResumeData.original_text || lastResumeData.text
      }));

      // Proceed to analysis
      onFileUploaded();
    } catch (error) {
      console.error('Error analyzing last resume:', error);
      setUploadError('Failed to analyze last resume. Please try again.');
    }
  };

  const handleViewLastResults = () => {
    if (!lastResumeData) return;

    // Store the resume data in session storage
    sessionStorage.setItem('currentResume', JSON.stringify({
      ...lastResumeData,
      text: lastResumeData.original_text || lastResumeData.text
    }));

    // If analysis results exist, go directly to results
    if (lastResumeData.analysisResults) {
      // Trigger the analysis complete flow with existing results
      window.dispatchEvent(new CustomEvent('viewLastAnalysis', { 
        detail: lastResumeData.analysisResults 
      }));
    } else {
      // If no analysis results, start new analysis
      onFileUploaded();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Resume Analyzer</h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quota Status Banner */}
        {isQuotaExhausted && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Free Analysis Limit Reached</h3>
                  <p className="text-red-700 mt-1">
                    You've used your free monthly analysis. Upgrade to Premium for 20 analyses per day.
                  </p>
                </div>
              </div>
              <button
                onClick={handleUpgradeClick}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Previous Resume Analysis Display */}
        {lastResumeData && isQuotaExhausted && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Previous Resume Analysis</h3>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{lastResumeData.filename}</p>
                  <p className="text-sm text-gray-500">
                    Analyzed on {new Date(lastResumeData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {lastResumeData.analysisResults && (
                  <div className="text-right mr-4">
                    <div className="text-2xl font-bold text-green-600">
                      {lastResumeData.analysisResults.overall_score}
                    </div>
                    <div className="text-sm text-gray-500">Overall Score</div>
                  </div>
                )}
                <button
                  onClick={handleViewLastResults}
                  disabled={loadingLastResume}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                >
                  {loadingLastResume ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      {lastResumeData.analysisResults ? (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Results
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Analyze Resume
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              {lastResumeData.analysisResults 
                ? 'View your previous analysis results or upgrade to Premium for unlimited new analyses.'
                : 'This resume hasn\'t been analyzed yet. Click "Analyze Resume" to get insights, or upgrade to Premium for unlimited analyses.'
              }
            </p>
          </div>
        )}

        {/* Last Resume Quick Analysis for Users with Remaining Quota */}
        {lastResumeData && !isQuotaExhausted && canUpload && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              Quick Action: Analyze Your Last Resume
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white p-3 rounded-lg border border-green-200 mr-4">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{lastResumeData.filename}</p>
                  <p className="text-sm text-gray-600">
                    Uploaded on {new Date(lastResumeData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {lastResumeData.analysisResults && (
                  <button
                    onClick={handleViewLastResults}
                    disabled={loadingLastResume}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Results
                  </button>
                )}
                <button
                  onClick={handleAnalyzeLastResume}
                  disabled={loadingLastResume}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
                >
                  {loadingLastResume ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      {lastResumeData.analysisResults ? 'Re-analyze' : 'Analyze This Resume'}
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-3">
              💡 Skip the upload step and analyze your most recent resume directly from our database.
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {isQuotaExhausted ? 'Upgrade to Upload New Resume' : 'Upload Your Resume'}
          </h2>
          <p className="text-lg text-gray-600">
            {isQuotaExhausted 
              ? 'Get unlimited access to upload and analyze new resumes with Premium'
              : 'Upload your resume to get instant AI-powered analysis and recommendations'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                !canUpload
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : isDragActive
                    ? 'border-green-500 bg-green-50 cursor-pointer'
                    : 'border-gray-300 hover:border-green-400 hover:bg-gray-50 cursor-pointer'
              }`}
            >
              <input {...getInputProps()} disabled={!canUpload} />
              
              {!canUpload ? (
                <>
                  <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">
                    Upload Locked - Upgrade Required
                  </h3>
                  <p className="text-gray-500 mb-4">
                    You've reached your free analysis limit. Upgrade to Premium to upload new resumes.
                  </p>
                  <button
                    onClick={handleUpgradeClick}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Premium
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {isDragActive ? 'Drop your resume here' : 'Drop your resume here, or click to browse'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Supports PDF, DOCX, and TXT files up to 10MB
                  </p>
                  <div className="flex justify-center space-x-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-3 py-1 rounded">PDF</span>
                    <span className="bg-gray-100 px-3 py-1 rounded">DOCX</span>
                    <span className="bg-gray-100 px-3 py-1 rounded">TXT</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Preview */}
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-200">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!uploading && !uploadSuccess && (
                  <button
                    onClick={removeFile}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Upload Status */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <p className="text-red-700">{uploadError}</p>
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <p className="text-green-700">Resume uploaded successfully! Starting analysis...</p>
                </div>
              )}

              {/* Upload Button */}
              {!uploadSuccess && (
                <div className="text-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !canUpload}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </div>
                    ) : (
                      'Analyze Resume'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usage Indicator */}
        {!subscription?.isPremium && !subscription?.isAdmin && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center bg-white rounded-lg px-4 py-2 border border-gray-200">
              <span className="text-sm text-gray-600 mr-2">Free Plan:</span>
              <span className={`font-semibold ${remainingAnalyses > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {usedAnalyses}/{totalLimit > 0 ? totalLimit : 1} analyses used this month
              </span>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload</h3>
            <p className="text-gray-600 text-sm">
              Upload your resume in PDF, DOCX, or TXT format
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Analyze</h3>
            <p className="text-gray-600 text-sm">
              Our AI analyzes content, structure, and keywords
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-bold">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Improve</h3>
            <p className="text-gray-600 text-sm">
              Get detailed feedback and actionable recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <SubscriptionModal
          onClose={() => setShowUpgradeModal(false)}
          feature="resume_analysis"
          title="Upgrade to Upload New Resume"
          description="You've reached your free analysis limit. Upgrade to Premium for 20 analyses per day and unlimited resume uploads."
        />
      )}
    </div>
  );
};

export default UploadPage;