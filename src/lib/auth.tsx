import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from './supabase'
import { Session } from '@supabase/supabase-js'

import { Company, User } from '../types/database'

export interface CompanySettings {
  id: string
  company_id: string
  company_name: string | null
  company_logo_url: string | null
  favicon_url: string | null
  default_theme: string | null
  theme_colors: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  dark_primary_color: string | null
  dark_secondary_color: string | null
  dark_accent_color: string | null
  date_format: string | null
  time_format: string | null
  currency: string | null
  timezone: string | null
  enable_email_notifications: boolean | null
  enable_push_notifications: boolean | null
  enable_asset_qr_codes: boolean | null
  enable_ticket_attachments: boolean | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  company: Company | null
  settings: CompanySettings | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, companyName: string, role: 'admin' | 'employee') => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  updateCompany: (data: Partial<Company>) => Promise<void>
  updateSettings: (data: Partial<CompanySettings>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    company: Company | null;
    settings: CompanySettings | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    company: null,
    settings: null,
    session: null,
    loading: true,
    error: null,
  });

  // Single source of truth for profile loading
  const loadUserProfile = useCallback(async (userId: string, signal: AbortSignal) => {
    console.log('📥 Loading profile for user:', userId);
    
    try {
      // Check if request was aborted before starting
      if (signal.aborted) {
        console.log('⚠️ Request aborted before starting');
        return null;
      }

      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .abortSignal(signal)
        .single();
      
      if (signal.aborted) return null;
      if (userError) throw userError;
      if (!user.company_id) throw new Error('User does not have a company_id assigned');

      console.log('👤 User loaded:', user.id);

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .abortSignal(signal)
        .single();

      if (signal.aborted) return null;
      if (companyError) throw companyError;

      console.log('🏢 Company loaded:', company.id);

      // Fetch or create company settings
      let settings: CompanySettings | null = null;
      const { data: existingSettings, error: settingsError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company.id)
        .abortSignal(signal)
        .single();

      if (signal.aborted) return null;

      if (settingsError && settingsError.code === 'PGRST116') {
        // Settings don't exist, create them
        console.log('⚙️ Creating default settings');
        const { data: newSettings, error: createError } = await supabase
          .from('company_settings')
          .insert({ company_id: company.id })
          .select()
          .single();

        if (createError) throw createError;
        settings = newSettings as CompanySettings;
      } else if (settingsError) {
        throw settingsError;
      } else {
        settings = existingSettings as CompanySettings;
      }

      console.log('⚙️ Settings loaded');

      return {
        user: user as User,
        company: company as Company,
        settings: settings as CompanySettings,
      };
    } catch (error: any) {
      // Don't throw on abort
      if (signal.aborted || error.name === 'AbortError') {
        console.log('⚠️ Request aborted');
        return null;
      }
      console.error('❌ Error loading profile:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    let authSubscription: { unsubscribe: () => void } | null = null;
    let loadingTimeout: NodeJS.Timeout | null = null;
    let isInitialized = false;
    let hasLoadedInitialProfile = false; // Track if we've already loaded the profile

    // Safety timeout: if loading takes more than 10 seconds, force it to false
    loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached - forcing loading to false');
      setState(prev => {
        if (prev.loading) {
          return { ...prev, loading: false, error: 'Loading timeout - please try refreshing' };
        }
        return prev;
      });
    }, 10000);

    async function initialize() {
      // Prevent double initialization in StrictMode
      if (isInitialized) {
        console.log('⚠️ Already initialized, skipping...');
        return;
      }
      isInitialized = true;

      console.log('🚀 Initializing auth provider');

      try {
        // CRITICAL: Get session BEFORE setting up listener
        // This prevents session loss during StrictMode double-mount
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error getting session:', sessionError);
          throw sessionError;
        }

        console.log('📦 Initial session retrieved:', !!initialSession);

        // If we have a session, immediately load the profile
        if (initialSession?.user) {
          console.log('✅ Session found, loading profile immediately');
          setState(prev => ({ ...prev, session: initialSession, loading: true, error: null }));

          try {
            const profileData = await loadUserProfile(
              initialSession.user.id,
              abortController.signal
            );

            if (abortController.signal.aborted) return;

            if (profileData) {
              hasLoadedInitialProfile = true; // Mark that we've loaded the profile
              setState(prev => ({
                ...prev,
                user: profileData.user,
                company: profileData.company,
                settings: profileData.settings,
                session: initialSession,
                loading: false,
                error: null,
              }));
              console.log('✅ Profile loaded on initialization');
              if (loadingTimeout) clearTimeout(loadingTimeout);
            }
          } catch (error: any) {
            if (abortController.signal.aborted) return;
            console.error('❌ Failed to load profile on init:', error);
            setState(prev => ({
              ...prev,
              error: error.message || 'Failed to load user profile',
              loading: false,
            }));
          }
        } else {
          console.log('❌ No session found - user needs to log in');
          setState(prev => ({ ...prev, loading: false, session: null }));
          if (loadingTimeout) clearTimeout(loadingTimeout);
        }

        // Now set up the listener for future auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth event:', event, '| Session:', !!session);

            if (abortController.signal.aborted) return;

            // Update session
            setState(prev => ({ ...prev, session }));

            // Handle sign out
            if (event === 'SIGNED_OUT') {
              console.log('👋 User signed out - clearing all data');
              hasLoadedInitialProfile = false; // Reset flag on sign out
              setState({
                user: null,
                company: null,
                settings: null,
                session: null,
                loading: false,
                error: null,
              });
              if (loadingTimeout) clearTimeout(loadingTimeout);
              return;
            }

            // Only reload profile on SIGNED_IN if we haven't already loaded it
            // This prevents duplicate loads when Supabase fires SIGNED_IN after INITIAL_SESSION
            if (event === 'SIGNED_IN' && session?.user && !hasLoadedInitialProfile) {
              console.log('🔄 New sign in - loading profile');
              setState(prev => ({ ...prev, loading: true, error: null }));

              try {
                const profileData = await loadUserProfile(
                  session.user.id,
                  abortController.signal
                );

                if (abortController.signal.aborted) return;

                if (profileData) {
                  hasLoadedInitialProfile = true; // Mark that we've loaded the profile
                  setState(prev => ({
                    ...prev,
                    user: profileData.user,
                    company: profileData.company,
                    settings: profileData.settings,
                    loading: false,
                    error: null,
                  }));
                  console.log('✅ Profile loaded after sign in');
                  if (loadingTimeout) clearTimeout(loadingTimeout);
                }
              } catch (error: any) {
                if (abortController.signal.aborted) return;
                console.error('❌ Failed to load profile:', error);
                setState(prev => ({
                  ...prev,
                  error: error.message || 'Failed to load user profile',
                  loading: false,
                }));
              }
            } else if (event === 'SIGNED_IN' && hasLoadedInitialProfile) {
              console.log('⏭️ Skipping profile load - already loaded on initialization');
            }

            // Token refresh - just update session, keep existing profile
            if (event === 'TOKEN_REFRESHED') {
              console.log('🔄 Token refreshed - keeping existing profile');
            }
          }
        );

        authSubscription = subscription;
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to initialize auth' }));
        if (loadingTimeout) clearTimeout(loadingTimeout);
      }
    }

    initialize();

    return () => {
      console.log('🧹 Cleaning up auth provider');
      if (loadingTimeout) clearTimeout(loadingTimeout);
      abortController.abort();
      authSubscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Profile loading handled by onAuthStateChange
    } catch (error: any) {
      console.error('Error signing in:', error);
      const errorMessage = error.message || 'Failed to sign in';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false,
      }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    companyName: string, 
    role: 'admin' | 'employee'
  ) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error('No user returned from signup');

      console.log('✅ Auth user created:', authUser.user.id);

      // Setup company and user profile
      const { error: setupError } = await supabase.rpc('setup_new_company', {
        p_company_name: companyName,
        p_user_id: authUser.user.id,
        p_user_email: email,
        p_user_full_name: fullName,
        p_user_role: role,
      });

      if (setupError) throw setupError;

      console.log('✅ Company setup completed');

      // Profile loading will be handled by onAuthStateChange SIGNED_IN event
    } catch (error: any) {
      console.error('Error signing up:', error);
      const errorMessage = error.message || 'Failed to sign up';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false,
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // State clearing handled by onAuthStateChange
    } catch (error: any) {
      console.error('Error signing out:', error);
      const errorMessage = error.message || 'Failed to sign out';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false,
      }));
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      if (!state.user?.id) throw new Error('No user logged in');

      const { id, company_id, ...updateData } = data as any;

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        user: updatedUser as User,
        error: null,
      }));

      console.log('✅ Profile updated');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Failed to update profile';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.user?.id]);

  const updateCompany = useCallback(async (data: Partial<Company>) => {
    try {
      if (!state.company?.id) throw new Error('No company found');
      if (state.user?.role !== 'admin') throw new Error('Only admins can update company');

      const { id, ...updateData } = data as any;

      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', state.company.id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        company: updatedCompany as Company,
        error: null,
      }));

      console.log('✅ Company updated');
    } catch (error: any) {
      console.error('Error updating company:', error);
      const errorMessage = error.message || 'Failed to update company';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.company?.id, state.user?.role]);

  const updateSettings = useCallback(async (data: Partial<CompanySettings>): Promise<void> => {
    try {
      console.log('⚙️ Updating settings');
      
      if (!state.settings?.id) throw new Error('No settings found');
      if (!state.company?.id) throw new Error('No company found');
      if (state.user?.role !== 'admin') throw new Error('Only admins can update settings');

      const { id, company_id, ...updateData } = data as any;

      const { data: updatedSettings, error } = await supabase
        .from('company_settings')
        .update(updateData)
        .eq('company_id', state.company.id)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        settings: updatedSettings as CompanySettings,
        error: null,
      }));

      console.log('✅ Settings updated');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      const errorMessage = error.message || 'Failed to update settings';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.settings?.id, state.company?.id, state.user?.role]);

  const refreshProfile = useCallback(async () => {
    if (!state.user?.id) return;
    
    console.log('🔄 Refreshing profile');
    setState(prev => ({ ...prev, loading: true, error: null }));

    const abortController = new AbortController();
    
    try {
      const profileData = await loadUserProfile(state.user.id, abortController.signal);

      if (profileData) {
        setState(prev => ({
          ...prev,
          user: profileData.user,
          company: profileData.company,
          settings: profileData.settings,
          loading: false,
          error: null,
        }));
        console.log('✅ Profile refreshed');
      }
    } catch (error: any) {
      console.error('Error refreshing profile:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to refresh profile',
        loading: false,
      }));
    }
  }, [state.user?.id, loadUserProfile]);

  const value = {
    user: state.user,
    company: state.company,
    settings: state.settings,
    session: state.session,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updateCompany,
    updateSettings,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      console.warn('⚠️ User not authenticated');
    }
    if (!auth.loading && auth.user && !auth.user.company_id) {
      console.error('❌ User loaded without company_id');
    }
  }, [auth.loading, auth.user]);
  
  return auth;
}

export function useCompanyId(): string | null {
  const { user } = useAuth();
  return user?.company_id || null;
}