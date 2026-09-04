import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AuthProfile { id:string; full_name:string; avatar_url:string|null; phone:string|null; last_seen_at:string|null; is_online:boolean; created_at:string; updated_at:string; role:string; company_id:string; membership_id:string; department_id:string|null }
export interface AuthCompany { id:string; name:string; email:string|null; phone:string|null; address:string|null; website:string|null; logo_url:string|null; status:'active'|'suspended'|'archived'; created_at:string; updated_at:string }
export interface CompanySettings { company_id:string; primary_color:string|null; secondary_color:string|null; accent_color:string|null; default_theme:'light'|'dark'|'system'; date_format:string; time_format:'12h'|'24h'; currency_code:string; timezone:string; enable_email_notifications:boolean; enable_push_notifications:boolean; enable_asset_qr_codes:boolean; enable_ticket_attachments:boolean; created_at:string; updated_at:string }
interface AuthContextType { user:AuthProfile|null; session:Session|null; company:AuthCompany|null; settings:CompanySettings|null; loading:boolean; error:string|null; signIn:(email:string,password:string)=>Promise<void>; signUp:(email:string,password:string,fullName:string,companyName:string,role?:'admin'|'employee')=>Promise<{emailConfirmationRequired:boolean}>; signOut:()=>Promise<void>; updateProfile:(data:Partial<Pick<AuthProfile,'full_name'|'avatar_url'|'phone'>>)=>Promise<void>; updateCompany:(data:Partial<Omit<AuthCompany,'id'|'created_at'|'updated_at'>>)=>Promise<void>; updateSettings:(data:Partial<Omit<CompanySettings,'company_id'|'created_at'|'updated_at'>>)=>Promise<void>; refreshProfile:()=>Promise<void> }
const AuthContext=createContext<AuthContextType|undefined>(undefined)

async function loadWorkspace(userId:string):Promise<Pick<AuthContextType,'user'|'company'|'settings'>>{
 const {data:profiles,error:pe}=await supabase.from('profiles').select('*').eq('id',userId).limit(1); if(pe)throw pe
 const profile=profiles?.[0] ?? null
 if(!profile)throw new Error('Your account is not provisioned for a company.')
 const {data:memberships,error:me}=await supabase.from('company_memberships').select('id,company_id,role,department_id,is_active,joined_at').eq('user_id',userId).eq('is_active',true).order('joined_at',{ascending:true}).limit(1); if(me)throw me
 const membership=memberships?.[0] ?? null
 if(!membership)throw new Error('Your account is not provisioned for a company.')
 const {data:company,error:ce}=await supabase.from('companies').select('*').eq('id',membership.company_id).limit(1); if(ce)throw ce
 const companyRow=company?.[0] ?? null
 if(!companyRow)throw new Error('Your company could not be loaded.')
 const {data:settingsRows,error:se}=await supabase.from('company_settings').select('*').eq('company_id',membership.company_id).limit(1); if(se)throw se
 const settings=settingsRows?.[0] ?? null
 return {user:{...profile,role:membership.role,company_id:membership.company_id,membership_id:membership.id,department_id:membership.department_id} as AuthProfile,company:companyRow as AuthCompany,settings:settings as CompanySettings|null}
}

async function ensureProvisioned(session:Session){
 try{return await loadWorkspace(session.user.id)}catch(error){
   const message=error instanceof Error?error.message:''
   if(!message.includes('not provisioned'))throw error
   const metadata=session.user.user_metadata as {company_name?:string;full_name?:string}|undefined
   if(!metadata?.company_name)throw error
   const {error:fnError}=await supabase.functions.invoke('create-company',{body:{name:metadata.company_name,full_name:metadata.full_name??''}})
   if(fnError)throw fnError
   return loadWorkspace(session.user.id)
 }
}

export function AuthProvider({children}:{children:ReactNode}){
 const [state,setState]=useState({user:null as AuthProfile|null,company:null as AuthCompany|null,settings:null as CompanySettings|null,session:null as Session|null,loading:true,error:null as string|null})
 const refreshProfile=useCallback(async()=>{if(!state.session?.user)return;const workspace=await loadWorkspace(state.session.user.id);setState(prev=>({...prev,...workspace,error:null}))},[state.session?.user?.id])
 useEffect(()=>{let mounted=true;let subscription:{unsubscribe:()=>void}|undefined
  const initialize=async()=>{try{const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!mounted)return;if(!data.session){setState(prev=>({...prev,loading:false,session:null}))}else{setState(prev=>({...prev,session:data.session,loading:true}));try{const workspace=await ensureProvisioned(data.session);if(mounted)setState(prev=>({...prev,...workspace,loading:false,error:null}))}catch(error){if(mounted)setState(prev=>({...prev,loading:false,error:error instanceof Error?error.message:'Failed to load workspace'}))}}
   const {data:{subscription:authSubscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(!mounted)return;if(event==='SIGNED_OUT'||!session){setState({user:null,company:null,settings:null,session:null,loading:false,error:null});return}setState(prev=>({...prev,session,loading:true,error:null}));if(event==='SIGNED_IN'||event==='INITIAL_SESSION'){setTimeout(async()=>{if(!mounted)return;try{const workspace=await ensureProvisioned(session);if(mounted)setState(prev=>({...prev,...workspace,loading:false,error:null}))}catch(error){if(mounted)setState(prev=>({...prev,loading:false,error:error instanceof Error?error.message:'Failed to load workspace'}))}},0)}});subscription=authSubscription
  }catch(error){if(mounted)setState(prev=>({...prev,loading:false,error:error instanceof Error?error.message:'Failed to initialize authentication'}))}}
  void initialize();return()=>{mounted=false;subscription?.unsubscribe()}
 },[])
 const signIn=useCallback(async(email:string,password:string)=>{setState(prev=>({...prev,loading:true,error:null}));const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error){setState(prev=>({...prev,loading:false,error:error.message}));throw error}},[])
 const signUp=useCallback(async(email:string,password:string,fullName:string,companyName:string)=>{setState(prev=>({...prev,loading:true,error:null}));const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{full_name:fullName.trim(),company_name:companyName.trim()},emailRedirectTo:window.location.origin}});if(error){setState(prev=>({...prev,loading:false,error:error.message}));throw error}if(!data.user){setState(prev=>({...prev,loading:false}));throw new Error('Account creation failed.')}setState(prev=>({...prev,session:data.session,loading:!!data.session}));return {emailConfirmationRequired:!data.session}},[])
 const signOut=useCallback(async()=>{const {error}=await supabase.auth.signOut();if(error)throw error},[])
 const updateProfile=useCallback(async(data:Partial<Pick<AuthProfile,'full_name'|'avatar_url'|'phone'>>)=>{if(!state.user)throw new Error('No authenticated user.');const {data:updated,error}=await supabase.from('profiles').update(data).eq('id',state.user.id).select('*').single();if(error)throw error;setState(prev=>({...prev,user:{...prev.user!,...updated}}))},[state.user?.id])
 const updateCompany=useCallback(async(data:Partial<Omit<AuthCompany,'id'|'created_at'|'updated_at'>>)=>{if(!state.company)throw new Error('No company selected.');if(state.user?.role!=='admin')throw new Error('Only company administrators can update company details.');const {data:updated,error}=await supabase.from('companies').update(data).eq('id',state.company.id).select('*').single();if(error)throw error;setState(prev=>({...prev,company:updated as AuthCompany}))},[state.company?.id,state.user?.role])
 const updateSettings=useCallback(async(data:Partial<Omit<CompanySettings,'company_id'|'created_at'|'updated_at'>>)=>{if(!state.company)throw new Error('No company selected.');if(state.user?.role!=='admin')throw new Error('Only company administrators can update settings.');const {data:updated,error}=await supabase.from('company_settings').update(data).eq('company_id',state.company.id).select('*').single();if(error)throw error;setState(prev=>({...prev,settings:updated as CompanySettings}))},[state.company?.id,state.user?.role])
 return <AuthContext.Provider value={{...state,signIn,signUp,signOut,updateProfile,updateCompany,updateSettings,refreshProfile}}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth must be used within AuthProvider');return value}
