import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { validateFile, extractTextFromFile } from '../services/fileExtractor';
import { uploadResume, createResumeRecord } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';

interface UploadPageProps {
  onFileUploaded: () => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ onFileUploaded }) => {
  const { user } = useAuth();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!uploadedFile || !user) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(uploadedFile);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError, fileName } = await uploadResume(uploadedFile, user.id);
      
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
      sessionStorage.setItem('currentResume', JSON.stringify({
        ...resumeRecord,
        text: extractedText
      }));

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
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Your Resume
          </h2>
          <p className="text-lg text-gray-600">
            Upload your resume to get instant AI-powered analysis and recommendations
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
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
                    disabled={uploading}
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
    </div>
  );
};

export default UploadPage;