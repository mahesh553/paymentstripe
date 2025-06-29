export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  original_text?: string;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  resume_id: string;
  analysis_type: string;
  results: any;
  score?: number;
  created_at: string;
}

export interface JobMatch {
  id: string;
  resume_id: string;
  job_description: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: any;
  created_at: string;
}

export interface AnalysisResults {
  overall_score: number;
  sections: {
    contact_info: SectionAnalysis;
    professional_summary: SectionAnalysis;
    work_experience: SectionAnalysis;
    education: SectionAnalysis;
    skills: SectionAnalysis;
    achievements: SectionAnalysis;
  };
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  keywords: string[];
}

export interface SectionAnalysis {
  score: number;
  feedback: string;
  suggestions: string[];
  present: boolean;
}

export interface FileUpload {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}