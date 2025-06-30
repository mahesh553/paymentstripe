import  { useState, useEffect } from 'react';
import { X, FileText, Calendar, Download, Eye, Trash2, AlertCircle } from 'lucide-react';
import { getUserResumes, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ResumeHistoryModalProps {
  onClose: () => void;
}

const ResumeHistoryModal: React.FC<ResumeHistoryModalProps> = ({ onClose }) => {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await getUserResumes(user.id);
      
      if (error) {
        throw error;
      }
      
      // Limit to last 10 resumes
      const limitedResumes = (data || []).slice(0, 10);
      setResumes(limitedResumes);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError('Failed to load resume history');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (resume: any) => {
    try {
      setPreviewResume(resume);
      setShowPreview(true);
    } catch (error) {
      console.error('Error previewing resume:', error);
      setError('Failed to preview resume');
    }
  };

  const handleDownload = async (resume: any) => {
    try {
      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(resume.file_path);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading resume:', error);
      setError('Failed to download resume. The file may no longer be available.');
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) {
        throw error;
      }

      // Refresh the list
      await fetchResumes();
    } catch (error) {
      console.error('Error deleting resume:', error);
      setError('Failed to delete resume');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="w-5 h-5 text-green-600" />;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-600 text-white">
            <div>
              <h2 className="text-2xl font-bold">Resume History</h2>
              <p className="text-green-100 text-sm">Showing your last 10 resumes</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading resume history...</span>
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FileText className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
                <p className="text-gray-600">Upload your first resume to get started with AI analysis.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div key={resume.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(resume.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 truncate">
                            {resume.filename}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(resume.created_at)}
                            </div>
                            <span>{formatFileSize(resume.file_size)}</span>
                            <span className="capitalize">{resume.file_type.split('/').pop()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreview(resume)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Preview Resume"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDownload(resume)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download Resume"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {resumes.length} resume{resumes.length !== 1 ? 's' : ''} shown
                {resumes.length === 10 && (
                  <span className="text-gray-500"> (showing last 10)</span>
                )}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal - Fixed z-index */}
      {showPreview && previewResume && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Resume Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">{previewResume.filename}</h4>
                <div className="text-sm text-gray-500 mb-4">
                  Uploaded: {formatDate(previewResume.created_at)} • Size: {formatFileSize(previewResume.file_size)}
                </div>
              </div>
              {previewResume.original_text ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Extracted Text:</h5>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto bg-white p-4 rounded border">
                    {previewResume.original_text}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No text content available for preview</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => handleDownload(previewResume)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResumeHistoryModal;