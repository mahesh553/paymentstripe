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

// Database helpers - Using xxpj_users as the main user profile table
export const createUserProfile = async (userId: string, profileData: any) => {
  // First ensure the user exists in auth.users (this should trigger the handle_new_user function)
  const { data: authUser } = await supabase.auth.getUser()
  
  if (!authUser.user || authUser.user.id !== userId) {
    return { 
      data: null, 
      error: new Error('User not authenticated or ID mismatch') 
    }
  }

  // Check if xxpj_users record already exists
  const { data: existingProfile } = await supabase
    .from('xxpj_users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingProfile) {
    // Profile already exists, just return it
    const { data, error } = await supabase
      .from('xxpj_users')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  }

  // Create new profile if it doesn't exist
  const { data, error } = await supabase
    .from('xxpj_users')
    .insert([
      {
        id: userId,
        email: authUser.user.email!,
        full_name: profileData.full_name || authUser.user.user_metadata?.full_name || null,
        avatar_url: profileData.avatar_url || authUser.user.user_metadata?.avatar_url || null,
        is_admin: false,
        subscription_tier: 'free',
        email_verified: authUser.user.email_confirmed_at ? true : false,
        onboarding_completed: false,
        preferences: profileData.preferences || {},
        timezone: profileData.timezone || 'UTC',
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
  // Ensure user exists in xxpj_users table before creating resume record
  const { data: userExists, error: userError } = await supabase
    .from('xxpj_users')
    .select('id')
    .eq('id', resumeData.user_id)
    .single()

  if (userError || !userExists) {
    console.error('User not found in xxpj_users table:', userError)
    
    // Try to create the user profile from auth.users
    const { data: authUser } = await supabase.auth.getUser()
    if (authUser.user && authUser.user.id === resumeData.user_id) {
      const { error: createError } = await createUserProfile(resumeData.user_id, {
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name
      })
      
      if (createError) {
        return { 
          data: null, 
          error: new Error('Failed to create user profile. Please try logging out and back in.') 
        }
      }
    } else {
      return { 
        data: null, 
        error: new Error('User profile not found. Please ensure you are properly logged in.') 
      }
    }
  }

  const { data, error } = await supabase
    .from('resumes')
    .insert([resumeData])
    .select()
    .single()
  
  return { data, error }
}

export const updateResumeContent = async (resumeId: string, content: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .update({ 
      original_text: content,
      updated_at: new Date().toISOString()
    })
    .eq('id', resumeId)
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

// Subscription helpers - Using xxpj_subscriptions
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

// Usage tracking helpers - Using xxpj_usage and xxpj_usage_tracking
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

// Get user subscription status
export const getUserSubscriptionStatus = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('get_user_subscription_status')
  
  return { data, error }
}

// Get feature limits
export const getFeatureLimits = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('get_feature_limits', { user_uuid: userId })
  
  return { data, error }
}

// Check subscription type with expiration details
export const checkUserSubscriptionType = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('check_user_subscription_type', { user_uuid: userId })
  
  return { data, error }
}

// Debug helper
export const debugUserStatus = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('debug_user_status', { user_uuid: userId })
  
  return { data, error }
}