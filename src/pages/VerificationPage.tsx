import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import Loader from '@/components/Loader'
import { supabase } from '@/lib/supabase'
import { Mail, CheckCircle2, AlertCircle, Clock, RotateCcw } from 'lucide-react'
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
  const [timeLeft, setTimeLeft] = useState(3600) // 1 hour

  const inputRef = useRef<HTMLInputElement>(null)
  const resendTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const expiryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Countdown timer for OTP expiry
  useEffect(() => {
    expiryTimeoutRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setError('Verification code has expired. Please request a new one.')
          setCode('')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (expiryTimeoutRef.current) clearInterval(expiryTimeoutRef.current)
    }
  }, [])

  // Format time display (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle numeric input only
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setError(null)

    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      handleVerify(value)
    }
  }

  // Verify OTP code
  const handleVerify = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || code

    if (!finalCode || finalCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (!email) {
      setError('Email address is missing. Please sign up again.')
      return
    }

    if (timeLeft <= 0) {
      setError('Verification code has expired. Please request a new one.')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      // Call Supabase to verify the OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: finalCode,
        type: 'email',
      })

      if (verifyError) {
        console.error('Verification error:', verifyError)
        setError(verifyError.message || 'Invalid verification code. Please try again.')
        setCode('')
        inputRef.current?.focus()
        return
      }

      // Success!
      setVerified(true)
      toast.success('Email verified successfully!')

      // Stop all timers
      if (expiryTimeoutRef.current) clearInterval(expiryTimeoutRef.current)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/app/dashboard', { replace: true })
      }, 2000)
    } catch (err: any) {
      console.error('Verification error:', err)
      setError(err.message || 'An error occurred during verification')
      setCode('')
      inputRef.current?.focus()
    } finally {
      setVerifying(false)
    }
  }

  // Resend verification code
  const handleResend = async () => {
    if (!email) {
      setError('Email address is missing. Please sign up again.')
      return
    }

    setResendLoading(true)
    setError(null)

    try {
      // Request a new OTP
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (resendError) {
        console.error('Resend error:', resendError)
        setError(resendError.message || 'Failed to resend code. Please try again.')
        setResendLoading(false)
        return
      }

      // Success
      toast.success('New verification code sent to your email!')
      setCode('')
      setTimeLeft(3600) // Reset timer to 1 hour
      setCanResend(false)
      setResendCooldown(60) // 60 second cooldown

      // Cooldown timer
      resendTimeoutRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true)
            if (resendTimeoutRef.current) clearInterval(resendTimeoutRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      inputRef.current?.focus()
    } catch (err: any) {
      console.error('Resend error:', err)
      setError(err.message || 'An error occurred while resending the code')
      setResendLoading(false)
    } finally {
      setResendLoading(false)
    }
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user && !verified) {
      // User is already verified, redirect to dashboard
      navigate('/app/dashboard', { replace: true })
    }
  }, [user, loading, verified, navigate])

  // If code is in URL params, auto-fill and verify
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 6 && !verified) {
      setCode(codeFromUrl)
      handleVerify(codeFromUrl)
    }
  }, [codeFromUrl, verified])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success State */}
          {verified ? (
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-pulse" />
                    <CheckCircle2 className="h-16 w-16 text-green-500 relative z-10" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Email Verified!</h1>
                <p className="text-slate-600">Your account is all set. Redirecting to dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
                <p className="text-slate-300">
                  Enter the 6-digit code we sent to<br />
                  <span className="font-semibold">{email}</span>
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Timer */}
                <div className="mb-6 flex items-center justify-center gap-2 text-slate-600 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires in <span className="font-semibold text-slate-900">{formatTime(timeLeft)}</span>
                  </span>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Code Input */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Verification Code
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={handleCodeChange}
                    disabled={verifying || verified}
                    maxLength={6}
                    className="w-full px-4 py-4 text-center text-3xl font-bold tracking-widest border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter 6 digits or click a link in your email
                  </p>
                </div>

                {/* Verify Button */}
                <button
                  onClick={() => handleVerify()}
                  disabled={verifying || code.length !== 6 || verified || timeLeft <= 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Verify Code
                    </>
                  )}
                </button>

                {/* Resend Button */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600 text-center mb-4">
                    Didn't receive the code?
                  </p>
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || !canResend}
                    className="w-full border-2 border-slate-900 text-slate-900 hover:bg-slate-50 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resendLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <Clock className="h-4 w-4" />
                        Resend in {resendCooldown}s
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Resend Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center text-sm text-slate-600">
                <p>
                  Back to{' '}
                  <button
                    onClick={() => navigate('/login', { replace: true })}
                    className="text-slate-900 hover:text-slate-700 font-semibold transition-colors"
                  >
                    sign in
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Having trouble? {' '}
            <a href="#" className="text-slate-900 hover:text-slate-700 font-semibold transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
