import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { supabase } from './supabase'
import { Session } from '@supabase/supabase-js'

import { Company, User } from '../types/database'

// Define CompanySettings type based on your database schema
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

  // ✅ Track if we're currently loading to prevent concurrent calls
  const isLoadingProfile = useRef(false);
  const initialLoadDone = useRef(false);
  const lastLoadedUserId = useRef<string | null>(null); // ✅ Track which user we last loaded

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setState(prev => ({ ...prev, session }));
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
        
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, error: 'Failed to initialize' }));
        }
      }
    }

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event);
      
      setState(prev => ({ ...prev, session }));
      
      // ✅ Only reload profile for actual auth changes, not tab visibility
      if (event === 'SIGNED_IN' && session?.user) {
        // Only load if we haven't loaded this user yet, or if it's a different user
        if (lastLoadedUserId.current !== session.user.id && !isLoadingProfile.current) {
          await loadUserProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        lastLoadedUserId.current = null;
        setState(prev => ({
          ...prev,
          user: null,
          company: null,
          settings: null,
          loading: false,
        }));
      }
      // ✅ Ignore INITIAL_SESSION and TOKEN_REFRESHED events - they don't need profile reload
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserProfile(userId: string) {
    // ✅ Prevent concurrent loads
    if (isLoadingProfile.current) {
      console.log('Profile load already in progress, skipping...');
      return;
    }

    // ✅ Don't reload if we already have this user's data
    if (lastLoadedUserId.current === userId && state.user) {
      console.log('User already loaded, skipping...');
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    isLoadingProfile.current = true;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user data with company_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Validate company_id exists
      if (!user.company_id) {
        throw new Error('User does not have a company_id assigned');
      }

      console.log('User loaded:', {
        id: user.id,
        email: user.email,
        company_id: user.company_id,
        role: user.role,
      });

      // Get company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (companyError) throw companyError;

      console.log('Company loaded:', {
        id: company.id,
        name: company.name,
        subscription_plan: company.subscription_plan,
      });

      // Get company settings
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (settingsError) {
        console.warn('No company settings found, creating default settings');
        
        // Create default settings if they don't exist
        const { data: newSettings, error: createError } = await supabase
          .from('company_settings')
          .insert({
            company_id: company.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        
        lastLoadedUserId.current = userId;
        
        setState(prev => ({
          ...prev,
          user: user as User,
          company: company as Company,
          settings: newSettings as CompanySettings,
          loading: false,
          error: null,
        }));
        
        isLoadingProfile.current = false;
        return;
      }

      console.log('Company settings loaded:', {
        company_id: settings.company_id,
        theme: settings.default_theme,
      });

      lastLoadedUserId.current = userId;

      setState(prev => ({
        ...prev,
        user: user as User,
        company: company as Company,
        settings: settings as CompanySettings,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load user profile',
        loading: false,
        user: null,
        company: null,
        settings: null,
      }));
      lastLoadedUserId.current = null; // ✅ Reset on error
    } finally {
      isLoadingProfile.current = false;
    }
  }

  async function signIn(email: string, password: string) {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // loadUserProfile will be called automatically by onAuthStateChange
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
  }

  async function signUp(
    email: string, 
    password: string, 
    fullName: string, 
    companyName: string, 
    role: 'admin' | 'employee'
  ) {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Step 1: Create auth user
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authUser.user) throw new Error('No user returned from signup');

      console.log('Auth user created:', authUser.user.id);

      // Step 2: Setup company and user profile via RPC
      const { error: setupError } = await supabase.rpc('setup_new_company', {
        p_company_name: companyName,
        p_user_id: authUser.user.id,
        p_user_email: email,
        p_user_full_name: fullName,
        p_user_role: role,
      });

      if (setupError) {
        console.error('Setup error:', setupError);
        throw setupError;
      }

      console.log('Company setup completed');

      // Step 3: Load the complete user profile with company data
      await loadUserProfile(authUser.user.id);

      // Step 4: Refresh session to ensure tokens are up to date
      await supabase.auth.refreshSession();

      console.log('User profile loaded and session refreshed');
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
  }

  async function signOut() {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear cached user ID
      lastLoadedUserId.current = null;

      // State will be cleared automatically by onAuthStateChange
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
  }

  async function updateProfile(data: Partial<User>) {
    try {
      if (!state.user?.id) throw new Error('No user logged in');

      // Don't allow changing company_id or id
      const { id, company_id, ...updateData } = data as any;

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state with returned data
      setState(prev => ({
        ...prev,
        user: updatedUser as User,
        error: null,
      }));

      console.log('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Failed to update profile';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }

  async function updateCompany(data: Partial<Company>) {
    try {
      if (!state.company?.id) throw new Error('No company found');
      if (state.user?.role !== 'admin') throw new Error('Only admins can update company');

      // Don't allow changing id
      const { id, ...updateData } = data as any;

      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', state.company.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state with returned data
      setState(prev => ({
        ...prev,
        company: updatedCompany as Company,
        error: null,
      }));

      console.log('Company updated successfully');
    } catch (error: any) {
      console.error('Error updating company:', error);
      const errorMessage = error.message || 'Failed to update company';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }

  async function updateSettings(data: Partial<CompanySettings>): Promise<void> {
    try {
      console.log('=== UPDATE SETTINGS DEBUG ===')
      console.log('Current settings state:', state.settings)
      console.log('Data to update:', data)
      
      if (!state.settings?.id) {
        throw new Error('No settings found - settings.id is missing')
      }
      
      if (!state.company?.id) {
        throw new Error('No company found')
      }
      
      if (state.user?.role !== 'admin') {
        throw new Error('Only admins can update settings')
      }

      // Don't allow changing id or company_id
      const { id, company_id, ...updateData } = data as any;

      console.log('Settings ID:', state.settings.id)
      console.log('Company ID:', state.company.id)
      console.log('Update data (cleaned):', updateData)

      // Use company_id instead of id for the WHERE clause (more reliable)
      const { data: updatedSettings, error } = await supabase
        .from('company_settings')
        .update(updateData)
        .eq('company_id', state.company.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Settings updated successfully:', updatedSettings)

      // Update local state with the returned data
      setState(prev => ({
        ...prev,
        settings: updatedSettings as CompanySettings,
        error: null,
      }));
    } catch (error: any) {
      console.error('=== UPDATE SETTINGS ERROR ===')
      console.error('Error updating settings:', error)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      console.error('Error hint:', error?.hint)
      
      const errorMessage = error.message || 'Failed to update settings';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }

  async function refreshProfile() {
    if (!state.user?.id) return;
    lastLoadedUserId.current = null; // ✅ Force reload
    await loadUserProfile(state.user.id);
  }

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

// Helper hook to ensure user is loaded with company_id
export function useRequireAuth() {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      console.warn('User not authenticated');
    }
    if (!auth.loading && auth.user && !auth.user.company_id) {
      console.error('User loaded without company_id');
    }
  }, [auth.loading, auth.user]);
  
  return auth;
}

// Helper hook to get company_id safely
export function useCompanyId(): string | null {
  const { user } = useAuth();
  return user?.company_id || null;
}