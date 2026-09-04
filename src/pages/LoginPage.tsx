import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { ArrowRight, BarChart3, Building2, Check, Lock, Mail, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface LoginPageProps { defaultToSignUp?: boolean }

export default function LoginPage({ defaultToSignUp = false }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(defaultToSignUp || location.pathname === '/signup')
  const [loading, setLoading] = useState(false)
  const [signupComplete, setSignupComplete] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password
    if (!trimmedEmail || !trimmedPassword) { toast.error('Please enter your email and password'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error('Please enter a valid email address'); return }
    setLoading(true)
    try {
      if (isSignUp) {
        const name = fullName.trim()
        const company = companyName.trim()
        if (!name) { toast.error('Please enter your full name'); return }
        if (!company) { toast.error('Please enter your company name'); return }
        const result = await signUp(trimmedEmail, trimmedPassword, name, company)
        if (result.emailConfirmationRequired) {
          setSignupComplete(true)
          toast.success('Check your email to confirm your account.')
        } else {
          navigate('/app/dashboard', { replace: true })
        }
      } else {
        await signIn(trimmedEmail, trimmedPassword)
        toast.success('Logged in successfully!')
        setTimeout(() => navigate('/app/dashboard', { replace: true }), 100)
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      let message = isSignUp ? 'Failed to create account' : 'Failed to login'
      if (error.message?.includes('Invalid login credentials')) message = 'Invalid email or password. Please check your credentials.'
      else if (error.message?.includes('Email not confirmed')) message = 'Please confirm your email before logging in.'
      else if (error.message?.toLowerCase().includes('already registered')) message = 'An account with this email already exists.'
      else if (error.message?.toLowerCase().includes('timeout')) message = 'Connection timeout. Please try again.'
      else if (error.message?.toLowerCase().includes('fetch')) message = 'Network error. Please check your connection.'
      else if (error.message) message = error.message
      toast.error(message, { duration: 5000 })
    } finally { setLoading(false) }
  }

  const toggleMode = () => {
    const next = !isSignUp
    setIsSignUp(next)
    setSignupComplete(false)
    navigate(next ? '/signup' : '/login', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <main className="auth-main">
          <div className="auth-form-wrap">
            <div className="auth-brand-row">
              <div className="auth-mark"><BarChart3 size={20} strokeWidth={2.5} /></div>
              <span className="auth-brand">Desk-Support</span>
            </div>

            {signupComplete ? (
              <div className="auth-success">
                <div className="auth-success-icon"><Mail size={32} /></div>
                <p className="auth-eyebrow">Almost there</p>
                <h1 className="auth-title">Check your email.</h1>
                <p className="auth-copy">We sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account and you'll be taken straight to your Desk-Support dashboard.</p>
                <button className="auth-secondary" type="button" onClick={() => { setSignupComplete(false); setPassword('') }}>
                  <ArrowRight size={16} /> Use a different account
                </button>
              </div>
            ) : (
              <>
                <p className="auth-eyebrow">Support operations</p>
                <h1 className="auth-title">{isSignUp ? 'Create your workspace.' : 'Welcome back.'}</h1>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  {isSignUp && <>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="fullName">Full name</label>
                      <div className="auth-input-wrap"><User className="auth-input-icon" size={18} /><input id="fullName" className="auth-input" type="text" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} autoComplete="name" autoFocus required /></div>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label" htmlFor="companyName">Company</label>
                      <div className="auth-input-wrap"><Building2 className="auth-input-icon" size={18} /><input id="companyName" className="auth-input" type="text" placeholder="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={loading} autoComplete="organization" required /></div>
                    </div>
                  </>}
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="email">Email address</label>
                    <div className="auth-input-wrap"><Mail className="auth-input-icon" size={18} /><input id="email" className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} autoComplete="email" autoFocus={!isSignUp} required /></div>
                  </div>
                  <div className="auth-field">
                    <div className="auth-password-row"><label className="auth-label" htmlFor="password">Password</label>{!isSignUp && <button type="button" className="auth-link" onClick={() => toast('Password reset feature coming soon!', { icon: 'ℹ️' })}>Forgot password?</button>}</div>
                    <div className="auth-input-wrap"><Lock className="auth-input-icon" size={18} /><input id="password" className="auth-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} autoComplete={isSignUp ? 'new-password' : 'current-password'} required /></div>
                  </div>
                  <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? <><span className="auth-spinner" aria-hidden="true" />{isSignUp ? 'Creating workspace...' : 'Signing in...'}</> : <>{isSignUp ? 'Create workspace' : 'Sign in'}<ArrowRight size={17} /></>}
                  </button>
                </form>

                <p className="auth-switch">{isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}<button type="button" className="auth-link" onClick={toggleMode} disabled={loading}>{isSignUp ? 'Sign in' : 'Create one'}</button></p>
              </>
            )}
          </div>
        </main>
        <aside className="auth-side">
          <div className="auth-side-inner">
            <span className="auth-side-kicker">Desk-Support</span>
            <h2 className="auth-panel-title">Keep every support request moving.</h2>
            <p className="auth-panel-copy">A focused workspace for tickets, assets and the people responsible for keeping work running.</p>
            <div className="auth-points">
              <div className="auth-point"><span className="auth-point-icon"><Check size={16} /></span><span>Centralize incoming support requests</span></div>
              <div className="auth-point"><span className="auth-point-icon"><Check size={16} /></span><span>Track work from open to resolved</span></div>
              <div className="auth-point"><span className="auth-point-icon"><Check size={16} /></span><span>Keep equipment and ownership organized</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
