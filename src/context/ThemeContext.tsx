import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type Theme = 'light' | 'dark' | 'system'
export interface CustomTheme { primary: string; secondary: string; accent: string; background: string; foreground: string; muted: string; border: string; destructive: string; warning: string; success: string }
export interface ThemeSettings { fontSize: number; borderRadius: number; componentSpacing: 'compact' | 'default' | 'comfortable'; buttonStyle: 'default' | 'outline' | 'ghost'; highContrast: boolean; reduceMotion: boolean }
export interface ContrastCheckResult { isCompliant: boolean; ratio: number; level: 'FAIL' | 'AA' | 'AAA' }

const defaults: CustomTheme = { primary: '#2563eb', secondary: '#64748b', accent: '#0ea5e9', background: '#ffffff', foreground: '#0f172a', muted: '#f1f5f9', border: '#e2e8f0', destructive: '#dc2626', warning: '#d97706', success: '#15803d' }
const defaultSettings: ThemeSettings = { fontSize: 16, borderRadius: 10, componentSpacing: 'default', buttonStyle: 'default', highContrast: false, reduceMotion: false }
function readJson<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? { ...fallback as object, ...JSON.parse(value) } as T : fallback } catch { return fallback } }
function hexToRgb(hex: string) { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null }
function luminance(rgb:{r:number;g:number;b:number}) { return [rgb.r,rgb.g,rgb.b].map(c=>c/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0) }
function contrast(fg:string,bg:string):ContrastCheckResult { const a=hexToRgb(fg),b=hexToRgb(bg);if(!a||!b)return{isCompliant:false,ratio:0,level:'FAIL'};const x=luminance(a),y=luminance(b),ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05);return{isCompliant:ratio>=4.5,ratio:Math.round(ratio*100)/100,level:ratio>=7?'AAA':ratio>=4.5?'AA':'FAIL'} }

interface ThemeContextType { theme:Theme;toggleTheme:()=>void;setTheme:(theme:Theme)=>void;customTheme:CustomTheme;updateCustomTheme:(theme:Partial<CustomTheme>)=>void;themeSettings:ThemeSettings;updateThemeSettings:(settings:Partial<ThemeSettings>)=>void;resetTheme:()=>void;exportTheme:()=>void;importTheme:(data:string)=>void;validateTheme:()=>string[];checkContrast:(fg:string,bg:string)=>ContrastCheckResult;isAccessibleTheme:()=>boolean }
const ThemeContext=createContext<ThemeContextType|undefined>(undefined)

export function ThemeProvider({children}:{children:ReactNode}) {
  const { company, settings } = useAuth()
  const [theme,setThemeState]=useState<Theme>(()=>{const v=localStorage.getItem('theme');return v==='light'||v==='dark'||v==='system'?v:'system'})
  const [customTheme,setCustomTheme]=useState<CustomTheme>(()=>readJson('customTheme',defaults))
  const [themeSettings,setThemeSettings]=useState<ThemeSettings>(()=>readJson('themeSettings',defaultSettings))

  useEffect(()=>{
    if(!company?.id||localStorage.getItem('theme'))return
    let cancelled=false
    void supabase.from('company_settings').select('default_theme').eq('company_id',company.id).maybeSingle().then(({data})=>{if(cancelled)return;const value=data?.default_theme;if(value==='light'||value==='dark'||value==='system')setThemeState(value)})
    return()=>{cancelled=true}
  },[company?.id])

  useEffect(()=>{
    const root=document.documentElement
    const apply=()=>{root.classList.remove('light','dark');root.classList.add(theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme);root.classList.toggle('high-contrast',themeSettings.highContrast);root.style.setProperty('--font-size-base',`${Math.min(20,Math.max(14,themeSettings.fontSize))}px`);root.style.setProperty('--radius',`${Math.min(16,Math.max(4,themeSettings.borderRadius))}px`);root.style.setProperty('--space-multiplier',String({compact:.75,default:1,comfortable:1.25}[themeSettings.componentSpacing]));root.style.setProperty('--transition-fast',themeSettings.reduceMotion?'0.01ms':'100ms');root.style.setProperty('--transition-normal',themeSettings.reduceMotion?'0.01ms':'150ms');root.style.setProperty('--transition-slow',themeSettings.reduceMotion?'0.01ms':'200ms')}
    apply();const media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener?.('change',apply);localStorage.setItem('theme',theme);return()=>media.removeEventListener?.('change',apply)
  },[theme,themeSettings])

  useEffect(()=>{
    const companyTheme:Partial<CustomTheme>={primary:settings?.primary_color||customTheme.primary,secondary:settings?.secondary_color||customTheme.secondary,accent:settings?.accent_color||customTheme.accent}
    Object.entries({...customTheme,...companyTheme}).forEach(([key,value])=>document.documentElement.style.setProperty(`--color-${key}`,value))
    localStorage.setItem('customTheme',JSON.stringify(customTheme))
  },[customTheme,settings?.accent_color,settings?.primary_color,settings?.secondary_color])
  useEffect(()=>localStorage.setItem('themeSettings',JSON.stringify(themeSettings)),[themeSettings])

  const validateTheme=()=>{const errors:string[]=[];if(!contrast(customTheme.foreground,'#fff').isCompliant)errors.push('Foreground contrast fails WCAG AA.');if(!contrast('#fff',customTheme.primary).isCompliant)errors.push('Primary button contrast fails WCAG AA.');if(!contrast('#fff',customTheme.destructive).isCompliant)errors.push('Destructive button contrast fails WCAG AA.');return errors}
  const value=useMemo<ThemeContextType>(()=>({theme,toggleTheme:()=>setThemeState(v=>v==='light'?'dark':v==='dark'?'system':'light'),setTheme:setThemeState,customTheme,updateCustomTheme:v=>setCustomTheme(p=>({...p,...v})),themeSettings,updateThemeSettings:v=>setThemeSettings(p=>({...p,...v,fontSize:Math.min(20,Math.max(14,v.fontSize??p.fontSize)),borderRadius:Math.min(16,Math.max(4,v.borderRadius??p.borderRadius))})),resetTheme:()=>{setThemeState('system');setCustomTheme(defaults);setThemeSettings(defaultSettings)},exportTheme:()=>{const blob=new Blob([JSON.stringify({version:1,theme,colors:customTheme,settings:themeSettings},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='desk-support-theme.json';a.click()},importTheme:data=>{try{const p=JSON.parse(data);if(p.colors)setCustomTheme({...defaults,...p.colors});if(p.settings)setThemeSettings({...defaultSettings,...p.settings});if(['light','dark','system'].includes(p.theme))setThemeState(p.theme)}catch{throw new Error('Invalid theme configuration.')}},validateTheme,checkContrast:contrast,isAccessibleTheme:()=>validateTheme().length===0}),[theme,customTheme,themeSettings])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export function useTheme(){const value=useContext(ThemeContext);if(!value)throw new Error('useTheme must be used within ThemeProvider');return value}
