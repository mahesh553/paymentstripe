import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, createUserProfile, supabase } from '../lib/supabase';
import { User as CustomUser } from '../types';

interface UserContextType {
  userProfile: CustomUser | null;
  loading: boolean;
  updateProfile: (updates: Partial<CustomUser>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await getUserProfile(user.id);
      
      if (error && error.code === 'PGRST116') {
        // User profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        };
        
        const { data: createdProfile, error: createError } = await createUserProfile(user.id, newProfile);
        if (createError) {
          console.error('Error creating user profile:', createError);
          // Even if profile creation fails, we can still continue
          // The user exists in auth.users, which is what matters for foreign keys
        } else {
          setUserProfile(createdProfile);
        }
      } else if (error) {
        console.error('Error fetching user profile:', error);
        // Even if profile fetch fails, we can still continue
        // The user exists in auth.users, which is what matters for foreign keys
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<CustomUser>) => {
    if (!user || !userProfile) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    userProfile,
    loading,
    updateProfile,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};