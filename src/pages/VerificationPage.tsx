import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AlertCircle, BarChart3, Check, CheckCircle2, Clock, Mail, RotateCcw, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VerificationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const email = searchParams.get('email') || ''
  const codeFromUrl = searchParams.get('code') || ''
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [canResend, setCanResend] = useState(true)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(3600)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(value => {
      if (value <= 1) { setError('Verification code has expired. Please request a new one.'); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!resendCooldown) return
    const timer = window.setInterval(() => setResendCooldown(value => {
      if (value <= 1) { setCanResend(true); window.clearInterval(timer); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])
  useEffect(() => {
    if (!loading && user && !verified) navigate('/app/dashboard', { replace: true })
  }, [loading, user, verified, navigate])

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const verify = async (value = code) => {
    if (value.length !== 6) { setError('Please enter the 6-digit verification code.'); return }
    if (!email) { setError('Email address is missing. Please sign up again.'); return }
    if (timeLeft <= 0) { setError('Verification code has expired. Please request a new one.'); return }
    setVerifying(true); setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' })
      if (verifyError) throw verifyError
      setVerified(true)
      toast.success('Email verified successfully!')
      window.setTimeout(() => navigate('/app/dashboard', { replace: true }), 1600)
    } catch (err: any) {
      console.error('Verification error:', err)
      setError(err.message || 'Invalid verification code. Please try again.')
      setCode('')
      inputRef.current?.focus()
    } finally { setVerifying(false) }
  }

  useEffect(() => {
    if (codeFromUrl.length === 6 && !verified) { setCode(codeFromUrl); verify(codeFromUrl) }
  }, [codeFromUrl])

  const handleCodeChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 6)
    setCode(next); setError(null)
    if (next.length === 6) verify(next)
  }

  const resend = async () => {
    if (!email) { setError('Email address is missing. Please sign up again.'); return }
    setResendLoading(true); setError(null)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
      if (resendError) throw resendError
      toast.success('New verification code sent to your email!')
      setCode(''); setTimeLeft(3600); setCanResend(false); setResendCooldown(60); inputRef.current?.focus()
    } catch (err: any) {
      console.error('Resend error:', err)
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally { setResendLoading(false) }
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

            {verified ? (
              <div className="auth-success">
                <div className="auth-success-icon"><CheckCircle2 size={32} /></div>
                <p className="auth-eyebrow">Verification complete</p>
                <h1 className="auth-title">Email verified.</h1>
                <p className="auth-copy">Your workspace is ready. Taking you to your dashboard.</p>
              </div>
            ) : (
              <>
                <p className="auth-eyebrow">One last step</p>
                <h1 className="auth-title">Verify your email.</h1>
                <p className="auth-copy">We sent a 6-digit code to <strong>{email || 'your email address'}</strong>. Enter it below to finish creating your account.</p>

                {error && <div className="auth-alert" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
                <div style={{ height: error ? 18 : 0 }} />
                <div className="auth-timer"><Clock size={14} /><span>Code expires in <strong>{formatTime(timeLeft)}</strong></span></div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="verification-code">Verification code</label>
                  <input ref={inputRef} id="verification-code" className="auth-input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={e => handleCodeChange(e.target.value)} disabled={verifying} maxLength={6} aria-describedby="verification-help" />
                  <span id="verification-help" className="auth-small">Enter all 6 digits. Verification starts automatically.</span>
                </div>

                <div style={{ height: 18 }} />
                <button className="auth-submit" type="button" onClick={() => verify()} disabled={verifying || code.length !== 6 || timeLeft <= 0}>
                  {verifying ? <><span className="auth-spinner" />Verifying...</> : <><CheckCircle2 size={17} />Verify email</>}
                </button>

                <hr className="auth-divider" />
                <p className="auth-small" style={{ textAlign: 'center', marginBottom: 12 }}>Didn't receive the code?</p>
                <button className="auth-secondary" type="button" onClick={resend} disabled={resendLoading || !canResend}>
                  {resendLoading ? <><span className="auth-spinner" style={{ borderColor: 'rgba(15,23,42,.25)', borderTopColor: '#0f172a' }} />Sending...</> : resendCooldown ? <><Clock size={15} />Resend in {resendCooldown}s</> : <><RotateCcw size={15} />Resend code</>}
                </button>

                <p className="auth-switch">Wrong email? <button type="button" className="auth-link" onClick={() => navigate('/signup', { replace: true })}>Go back</button></p>
                <div className="auth-security"><Shield size={14} /><span>Secure email verification</span></div>
              </>
            )}
          </div>
        </main>
        <aside className="auth-side">
          <div className="auth-side-inner">
            <span className="auth-side-kicker">Secure access</span>
            <h2 className="auth-panel-title">Your workspace starts with a verified identity.</h2>
            <p className="auth-panel-copy">Confirming your email helps keep account access and support operations tied to the right person.</p>
            <div className="auth-points">
              <div className="auth-point"><span className="auth-point-icon"><Mail size={16} /></span><span>Check your inbox for the latest code</span></div>
              <div className="auth-point"><span className="auth-point-icon"><Check size={16} /></span><span>Enter the six digits exactly as received</span></div>
              <div className="auth-point"><span className="auth-point-icon"><Shield size={16} /></span><span>Continue securely into Desk-Support</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
