import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear session storage on sign out
        if (event === 'SIGNED_OUT') {
          sessionStorage.clear();
          localStorage.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Disable email confirmation for immediate login
          emailRedirectTo: undefined,
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return { data, error };
      }

      // If signup successful and user is returned, they're logged in
      if (data.user && data.session) {
        console.log('Signup successful with immediate session:', data.user.email);
        setUser(data.user);
        return { data, error: null };
      }

      // If no session but user exists, it means email confirmation is required
      if (data.user && !data.session) {
        return { 
          data, 
          error: { 
            message: 'Please check your email to confirm your account before signing in.',
            name: 'EmailConfirmationRequired'
          } 
        };
      }

      return { data, error };
    } catch (err) {
      console.error('Signup exception:', err);
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          name: 'SignupError'
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Signin error:', error);
        return { data, error };
      }

      if (data.user && data.session) {
        console.log('Signin successful:', data.user.email);
        setUser(data.user);
      }

      return { data, error };
    } catch (err) {
      console.error('Signin exception:', err);
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          name: 'SigninError'
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear all session data before signing out
      sessionStorage.clear();
      localStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        setUser(null);
        // Force redirect to home page after logout
        window.location.href = '/';
      }
      
      return { error };
    } catch (err) {
      console.error('Signout exception:', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
          name: 'SignoutError'
        } 
      };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};