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
        toast.success('Account created successfully!')
      } else {
        await signIn(trimmedEmail, trimmedPassword)
        toast.success('Logged in successfully!')
      }
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate('/app/dashboard', { replace: true })
      }, 100)
      
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
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">DeskSupport Pro</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-slate-600 text-lg">
              {isSignUp ? 'Start managing your IT operations today' : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-slate-700 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium text-slate-700 block">
                    Company Name
                  </label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="companyName"
                      type="text"
                      placeholder="Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={loading}
                      autoComplete="organization"
                      required={isSignUp}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
                  Password
                </label>
                {!isSignUp && (
                  <button 
                    type="button"
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    onClick={() => toast('Password reset feature coming soon!', { icon: 'ℹ️' })}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <p className="text-sm text-slate-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button"
                onClick={toggleMode}
                disabled={loading}
                className="text-slate-900 hover:text-slate-700 font-semibold transition-colors disabled:opacity-50"
              >
                {isSignUp ? 'Sign in' : 'Create account'}
              </button>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Shield className="h-4 w-4" />
            <span>Enterprise-grade security & encryption</span>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        {/* Floating Cards */}
        <div className="absolute top-20 right-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Ticket Resolved</div>
              <div className="text-xs text-slate-400">2 minutes ago</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl transform hover:scale-105 transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Asset Added</div>
              <div className="text-xs text-slate-400">Just now</div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Transform your IT operations
          </h2>
          <p className="text-xl text-slate-300 mb-12 leading-relaxed">
            Streamline support tickets, manage assets, and empower your team with one powerful platform.
          </p>

          {/* Feature List */}
          <div className="space-y-6 mb-12">
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-all">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Real-time Analytics</h3>
                <p className="text-slate-400">Track performance metrics and make data-driven decisions</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-all">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Team Collaboration</h3>
                <p className="text-slate-400">Work together seamlessly across departments</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-500/20 transition-all">
                <Shield className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Secure & Compliant</h3>
                <p className="text-slate-400">Enterprise-grade security with role-based access</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
            {stats.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="group cursor-default">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}