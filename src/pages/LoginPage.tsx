import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { ArrowRight, Mail, Lock, Shield, BarChart3, CheckCircle2, Users, Package, Ticket, TrendingUp, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

interface LoginPageProps {
  defaultToSignUp?: boolean
}

export default function LoginPage({ defaultToSignUp = false }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, signUp } = useAuth()
  
  const [isSignUp, setIsSignUp] = useState(defaultToSignUp || location.pathname === '/signup')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Trim and validate inputs
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    
    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Please enter your email and password')
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    
    try {
      if (isSignUp) {
        const trimmedName = fullName.trim()
        const trimmedCompanyName = companyName.trim()
        if (!trimmedName) {
          toast.error('Please enter your full name')
          return
        }
        if (!trimmedCompanyName) {
          toast.error('Please enter your company name')
          return
        }
        await signUp(trimmedEmail, trimmedPassword, trimmedName, trimmedCompanyName, 'admin')
        toast.success('Verification code sent to your email!')
        
        // Redirect to verification page instead of dashboard
        navigate(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`, { replace: true })
      } else {
        await signIn(trimmedEmail, trimmedPassword)
        toast.success('Logged in successfully!')
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate('/app/dashboard', { replace: true })
        }, 100)
      }
      
    } catch (error: any) {
      console.error('❌ Auth error:', error)
      
      // Better error messages
      let errorMessage = isSignUp ? 'Failed to create account' : 'Failed to login'
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email before logging in.'
      } else if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
        errorMessage = 'Connection timeout. Please check your internet and try again.'
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      })
      
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    navigate(isSignUp ? '/login' : '/signup', { replace: true })
  }

  const stats = [
    { icon: Users, value: '50K+', label: 'Active Users' },
    { icon: Ticket, value: '99.9%', label: 'Uptime SLA' },
    { icon: Zap, value: '<100ms', label: 'Response Time' }
  ]

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[hsl(var(--primary))] rounded-2xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary))]/20">
                <BarChart3 className="h-6 w-6 text-[hsl(var(--primary-foreground))]" />
              </div>
              <span className="text-xl lg:text-2xl font-bold text-[hsl(var(--foreground))]">DeskSupport Pro</span>
            </div>
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-[hsl(var(--foreground))] mb-3">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-sm lg:text-base text-[hsl(var(--muted-foreground))]">
              {isSignUp ? 'Start managing your IT operations today' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] block">
                    Full Name
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                    <input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      autoComplete="name"
                      autoFocus={isSignUp}
                      required={isSignUp}
                      className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] block">
                    Company Name
                  </label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                    <input
                      id="companyName"
                      type="text"
                      placeholder="Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={loading}
                      autoComplete="organization"
                      required={isSignUp}
                      className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus={!isSignUp}
                  required
                  className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] block">
                  Password
                </label>
                {!isSignUp && (
                  <button 
                    type="button"
                    className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium transition-colors"
                    onClick={() => toast('Password reset feature coming soon!', { icon: 'ℹ️' })}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary))]/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-[hsl(var(--primary-foreground))] font-semibold py-3 sm:py-4 rounded-xl shadow-lg shadow-[hsl(var(--primary))]/20 hover:shadow-[hsl(var(--primary))]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm lg:text-base"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-[hsl(var(--primary-foreground))]/30 border-t-[hsl(var(--primary-foreground))] rounded-full animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center mt-6">
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button"
                onClick={toggleMode}
                disabled={loading}
                className="text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] font-semibold transition-colors disabled:opacity-50"
              >
                {isSignUp ? 'Sign in' : 'Create account'}
              </button>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
            <Shield className="h-4 w-4" />
            <span>Enterprise-grade security & encryption</span>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex w-1/2 bg-[hsl(var(--primary))] p-12 items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        {/* Floating Cards */}
        <div className="absolute top-20 right-20 glass-card border border-[hsl(var(--primary-foreground))]/10 rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[hsl(var(--success-500))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--success-500))]/20">
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[hsl(var(--primary-foreground))]">Ticket Resolved</div>
              <div className="text-xs text-[hsl(var(--primary-foreground))]/60">2 minutes ago</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-20 glass-card border border-[hsl(var(--primary-foreground))]/10 rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary))]/20 border-2 border-[hsl(var(--primary-foreground))]/20">
              <Package className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[hsl(var(--primary-foreground))]">Asset Added</div>
              <div className="text-xs text-[hsl(var(--primary-foreground))]/60">Just now</div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-[hsl(var(--primary-foreground))] mb-6 leading-tight">
            Transform your IT operations
          </h2>
          <p className="text-base lg:text-lg xl:text-xl text-[hsl(var(--primary-foreground))]/80 mb-12 leading-relaxed">
            Streamline support tickets, manage assets, and empower your team with one powerful platform.
          </p>

          {/* Feature List */}
          <div className="space-y-6 mb-12">
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--success-500))]/10 border border-[hsl(var(--success-500))]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--success-500))]/20 transition-all">
                <TrendingUp className="h-6 w-6 text-[hsl(var(--success-500))]" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--primary-foreground))] mb-1">Real-time Analytics</h3>
                <p className="text-sm lg:text-base text-[hsl(var(--primary-foreground))]/70">Track performance metrics and make data-driven decisions</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary-foreground))]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--primary))]/30 transition-all">
                <Users className="h-6 w-6 text-[hsl(var(--primary-foreground))]" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--primary-foreground))] mb-1">Team Collaboration</h3>
                <p className="text-sm lg:text-base text-[hsl(var(--primary-foreground))]/70">Work together seamlessly across departments</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary-foreground))]/10 border border-[hsl(var(--primary-foreground))]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[hsl(var(--primary-foreground))]/20 transition-all">
                <Shield className="h-6 w-6 text-[hsl(var(--primary-foreground))]" />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-semibold text-[hsl(var(--primary-foreground))] mb-1">Secure & Compliant</h3>
                <p className="text-sm lg:text-base text-[hsl(var(--primary-foreground))]/70">Enterprise-grade security with role-based access</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[hsl(var(--primary-foreground))]/10">
            {stats.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="group cursor-default">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-[hsl(var(--primary-foreground))]/60 group-hover:text-[hsl(var(--primary-foreground))] transition-colors" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-bold text-[hsl(var(--primary-foreground))] mb-1 group-hover:scale-105 transition-transform origin-left">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-[hsl(var(--primary-foreground))]/70">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}