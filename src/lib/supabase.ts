import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Database helpers - Updated to use xxpj_ prefixed tables
export const createUserProfile = async (userId: string, profileData: any) => {
  const { data, error } = await supabase
    .from('xxpj_users')
    .insert([
      {
        id: userId,
        ...profileData,
      },
    ])
    .select()
    .single()
  
  return { data, error }
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('xxpj_users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('xxpj_users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Resume helpers
export const uploadResume = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  return { data, error, fileName }
}

export const createResumeRecord = async (resumeData: any) => {
  const { data, error } = await supabase
    .from('resumes')
    .insert([resumeData])
    .select()
    .single()
  
  return { data, error }
}

export const getUserResumes = async (userId: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const deleteResume = async (resumeId: string, filePath: string) => {
  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from('resumes')
    .remove([filePath])
  
  if (storageError) {
    console.warn('Failed to delete file from storage:', storageError)
  }
  
  // Delete from database
  const { data, error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', resumeId)
    .select()
  
  return { data, error }
}

export const createAnalysisRecord = async (analysisData: any) => {
  const { data, error } = await supabase
    .from('analyses')
    .insert([analysisData])
    .select()
    .single()
  
  return { data, error }
}

export const getResumeAnalyses = async (resumeId: string) => {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// Subscription helpers - Updated to use xxpj_ prefixed tables
export const getUserSubscription = async (userId: string) => {
  const { data, error } = await supabase
    .from('xxpj_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return { data, error }
}

export const createSubscription = async (subscriptionData: any) => {
  const { data, error } = await supabase
    .from('xxpj_subscriptions')
    .insert([subscriptionData])
    .select()
    .single()
  
  return { data, error }
}

export const updateSubscription = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('xxpj_subscriptions')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Usage tracking helpers
export const getUserUsage = async (userId: string) => {
  const { data, error } = await supabase
    .from('xxpj_usage')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return { data, error }
}

export const trackUsage = async (userId: string, feature: string) => {
  const { data, error } = await supabase
    .rpc('track_feature_usage', {
      user_uuid: userId,
      feature_name: feature
    })
  
  return { data, error }
}

// Debug helper
export const debugUserStatus = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('debug_user_status', { user_uuid: userId })
  
  return { data, error }
}