import { useState } from 'react'
import { 
  Package, 
  Ticket, 
  BarChart3, 
  Users, 
  Shield, 
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Star,
  Menu,
  X,
  TrendingUp,
  Bell,
  Box,
  Activity,
  Target,
  Building2,
  Layers,
  Play
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    try {
    navigate(path)
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to window location if navigate fails
      window.location.hash = `#${path}`
    }
  }

  const features = [
    {
      icon: Package,
      title: 'Asset Management',
      description: 'Track and manage all company assets with real-time status updates and comprehensive reporting',
      color: 'emerald'
    },
    {
      icon: Ticket,
      title: 'Ticket System',
      description: 'Create, assign, and resolve support tickets efficiently with automated workflows',
      color: 'blue'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Organize teams and assign tasks with full visibility across your organization',
      color: 'slate'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Get deep insights into performance metrics and utilization trends',
      color: 'amber'
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure access control with granular admin and employee permissions',
      color: 'slate'
    },
    {
      icon: Clock,
      title: 'Real-Time Updates',
      description: 'Live data synchronization keeps your entire team in perfect sync',
      color: 'blue'
    }
  ]

  const stats = [
    { value: '99.9%', label: 'Uptime SLA', icon: Target },
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '<100ms', label: 'Response Time', icon: Zap },
    { value: '24/7', label: 'Support', icon: Shield }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<'emerald' | 'blue' | 'slate' | 'amber', string> = {
      emerald: 'bg-emerald-500 shadow-emerald-500/20',
      blue: 'bg-blue-500 shadow-blue-500/20',
      slate: 'bg-slate-900 shadow-slate-900/20',
      amber: 'bg-amber-500 shadow-amber-500/20'
    }
    return colors[color as 'emerald' | 'blue' | 'slate' | 'amber'] || colors.slate
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleNavigate('/')}>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-900 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
                <BarChart3 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <span className="text-lg lg:text-xl font-bold text-slate-900">DeskSupport Pro</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#features" className="px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all text-sm lg:text-base">Features</a>
              <a href="#benefits" className="px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all text-sm lg:text-base">Benefits</a>
              <a href="#pricing" className="px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all text-sm lg:text-base">Pricing</a>
              <div className="w-px h-6 bg-slate-200 mx-2" />
              <button 
                type="button"
                onClick={() => handleNavigate('/login')}
                className="px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all text-sm lg:text-base"
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => handleNavigate('/signup')}
                className="ml-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg lg:rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all text-sm lg:text-base"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2 border-t border-slate-200">
              <a href="#features" className="block py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50 px-4 transition-colors text-sm" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#benefits" className="block py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50 px-4 transition-colors text-sm" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
              <a href="#pricing" className="block py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50 px-4 transition-colors text-sm" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <div className="h-px bg-slate-200 my-2" />
              <button 
                type="button"
                onClick={() => {
                  handleNavigate('/login')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left py-2 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50 px-4 transition-colors text-sm"
              >
                Sign In
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleNavigate('/signup')
                  setMobileMenuOpen(false)
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all text-sm mt-2"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24">
          <div className="text-center max-w-4xl mx-auto mb-8 lg:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-slate-100 border border-slate-200 mb-4 lg:mb-6">
              <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 text-slate-900" />
              <span className="text-xs lg:text-sm text-slate-900 font-medium">Trusted by 50,000+ teams worldwide</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 leading-tight mb-4 lg:mb-6">
              The complete platform for
              <span className="block mt-1 lg:mt-2 text-slate-600">IT management</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed mb-6 lg:mb-8 max-w-3xl mx-auto px-4">
              Unified asset tracking, intelligent support tickets, and powerful team collaboration. Everything your IT team needs in one beautiful platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center mb-8 lg:mb-12 px-4">
              <button 
                type="button"
                onClick={() => handleNavigate('/signup')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 lg:px-8 py-3 lg:py-4 rounded-lg lg:rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all flex items-center justify-center gap-2 group text-sm lg:text-base"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                type="button"
                onClick={() => handleNavigate('/demo')}
                className="border-2 border-slate-200 hover:border-slate-300 text-slate-900 font-semibold px-6 lg:px-8 py-3 lg:py-4 rounded-lg lg:rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group text-sm lg:text-base"
              >
                <Play className="h-4 w-4 lg:h-5 lg:w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap justify-center gap-4 lg:gap-8 pt-6 lg:pt-8 border-t border-slate-200 px-4">
              {stats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                  <div key={idx} className="flex items-center gap-2 lg:gap-3">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-100 flex items-center justify-center">
                      <Icon className="h-3 w-3 lg:h-4 lg:w-4 text-slate-900" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg lg:text-2xl font-bold text-slate-900">{stat.value}</div>
                      <div className="text-xs lg:text-sm text-slate-600">{stat.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-12 lg:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Main Dashboard Card */}
            <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl lg:shadow-2xl border border-slate-200 bg-white">
              <div className="bg-slate-900 p-4 lg:p-8">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-4 lg:mb-8">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white rounded-lg lg:rounded-2xl flex items-center justify-center shadow-xl shadow-white/20">
                      <BarChart3 className="h-4 w-4 lg:h-6 lg:w-6 text-slate-900" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm lg:text-lg">Dashboard Overview</div>
                      <div className="text-slate-400 text-xs lg:text-sm">Real-time insights at a glance</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2">
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs lg:text-sm text-slate-400">Live</span>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-4 lg:mb-6">
                  {[
                    { icon: CheckCircle2, value: '127', label: 'Active Tickets', change: '+12%', color: 'emerald' },
                    { icon: Package, value: '342', label: 'Total Assets', change: '+8%', color: 'blue' },
                    { icon: Users, value: '48', label: 'Team Members', change: '+3%', color: 'slate' },
                    { icon: Target, value: '94%', label: 'Resolution Rate', change: '+5%', color: 'amber' }
                  ].map((stat, i) => {
                    const StatIcon = stat.icon
                    return (
                      <div key={i} className="bg-white/5 rounded-xl lg:rounded-2xl p-3 lg:p-5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2 lg:mb-4">
                          <div className={`w-8 h-8 lg:w-10 lg:h-10 ${getColorClasses(stat.color)} rounded-lg lg:rounded-xl flex items-center justify-center`}>
                            <StatIcon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                          </div>
                        </div>
                        <div className="text-white text-xl lg:text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-slate-400 text-xs lg:text-sm mb-1 lg:mb-2">{stat.label}</div>
                        <div className="text-emerald-400 text-xs flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {stat.change} this week
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Activity & Chart */}
                <div className="grid lg:grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-white/5 rounded-xl lg:rounded-2xl p-3 lg:p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                      <span className="text-white font-semibold text-sm lg:text-base">Recent Activity</span>
                      <Bell className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="space-y-2 lg:space-y-3">
                      {[
                        { icon: Box, text: 'MacBook Pro assigned to Marketing', time: '2m ago' },
                        { icon: Ticket, text: 'Support ticket #142 resolved', time: '5m ago' },
                        { icon: Users, text: '3 new team members added', time: '12m ago' },
                        { icon: Shield, text: 'Security audit completed', time: '1h ago' }
                      ].map((item, i) => {
                        const ItemIcon = item.icon
                        return (
                          <div key={i} className="flex items-center gap-2 lg:gap-3 p-2 rounded-lg lg:rounded-xl hover:bg-white/5 transition-colors">
                            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ItemIcon className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-300 text-xs lg:text-sm truncate">{item.text}</div>
                              <div className="text-slate-500 text-xs">{item.time}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl lg:rounded-2xl p-3 lg:p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                      <span className="text-white font-semibold text-sm lg:text-base">Performance</span>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="space-y-3 lg:space-y-4">
                      {[
                        { label: 'Ticket Resolution', value: 94, color: 'emerald' },
                        { label: 'Asset Utilization', value: 87, color: 'blue' },
                        { label: 'Team Efficiency', value: 91, color: 'amber' }
                      ].map((metric, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1 lg:mb-2">
                            <span className="text-slate-400 text-xs lg:text-sm">{metric.label}</span>
                            <span className="text-white font-semibold text-xs lg:text-sm">{metric.value}%</span>
                          </div>
                          <div className="h-1.5 lg:h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${metric.color}-500 rounded-full transition-all`}
                              style={{ width: `${metric.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Notification Cards - Hidden on mobile */}
            <div className="absolute -bottom-2 left-4 lg:-bottom-4 lg:left-8 bg-white rounded-lg lg:rounded-xl shadow-lg p-3 lg:p-4 border border-slate-200 hover:shadow-xl transition-shadow hidden lg:block">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm font-semibold text-slate-900">Ticket Resolved</div>
                  <div className="text-xs text-slate-600">2 minutes ago</div>
                </div>
              </div>
            </div>

            <div className="absolute -top-2 right-4 lg:-top-4 lg:right-8 bg-white rounded-lg lg:rounded-xl shadow-lg p-3 lg:p-4 border border-slate-200 hover:shadow-xl transition-shadow hidden lg:block">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-blue-500 flex items-center justify-center">
                  <Package className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs lg:text-sm font-semibold text-slate-900">Asset Added</div>
                  <div className="text-xs text-slate-600">Just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="py-6 lg:py-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-12">
            {[
              { icon: Zap, text: 'Lightning Fast' },
              { icon: Shield, text: 'Enterprise Security' },
              { icon: Star, text: '4.9/5 Rating' },
              { icon: Users, text: '50K+ Users' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="flex items-center gap-1.5 lg:gap-2 group">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                    <Icon className="h-3 w-3 lg:h-4 lg:w-4 text-slate-900 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs lg:text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 lg:mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-white border border-slate-200 mb-4 lg:mb-6 shadow-sm">
              <Layers className="h-3 w-3 lg:h-4 lg:w-4 text-slate-900" />
              <span className="text-xs lg:text-sm text-slate-900 font-medium">Powerful Features</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-3 lg:mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-base lg:text-xl text-slate-600 px-4">
              Built with modern teams in mind. Powerful, intuitive, and designed to scale with you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div 
                  key={idx} 
                  className="group bg-white rounded-xl lg:rounded-2xl p-4 lg:p-8 border border-slate-200 hover:border-slate-300 hover:shadow-lg lg:hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <div className={`inline-flex p-2 lg:p-3 ${getColorClasses(feature.color)} rounded-lg lg:rounded-xl mb-3 lg:mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-2 lg:mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm lg:text-base">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-16 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 lg:space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-slate-100 border border-slate-200 mb-4 lg:mb-6">
                  <CheckCircle2 className="h-3 w-3 lg:h-4 lg:w-4 text-slate-900" />
                  <span className="text-xs lg:text-sm text-slate-900 font-medium">Why Teams Choose Us</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-4 lg:mb-6">
                  Built for teams that move fast
                </h2>
                <p className="text-base lg:text-xl text-slate-600 leading-relaxed">
                  Stop juggling multiple tools. Get everything you need in one powerful, intuitive platform designed for modern IT operations.
                </p>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {[
                  'Centralized asset and ticket management',
                  'Real-time collaboration and updates',
                  'Comprehensive analytics and reporting',
                  'Secure multi-company isolation',
                  'Intuitive user interface',
                  'Scalable for teams of any size'
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="p-1 lg:p-1.5 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 lg:h-4 lg:w-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700 font-medium text-sm lg:text-base">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 lg:space-y-6">
              {[
                {
                  title: 'For Small Teams',
                  desc: 'Perfect for growing businesses starting their IT management journey',
                  icon: Users,
                  color: 'emerald',
                  stats: 'Up to 25 users'
                },
                {
                  title: 'For Enterprises',
                  desc: 'Scale effortlessly with advanced features and dedicated support',
                  icon: BarChart3,
                  color: 'blue',
                  stats: 'Unlimited users'
                },
                {
                  title: 'For MSPs',
                  desc: 'Manage multiple clients with complete data isolation and white-labeling',
                  icon: Building2,
                  color: 'slate',
                  stats: 'Multi-tenant'
                }
              ].map((item, idx) => {
                const ItemIcon = item.icon
                return (
                  <div 
                    key={idx} 
                    className="group bg-slate-50 rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div className={`p-2 lg:p-3 rounded-lg lg:rounded-xl ${getColorClasses(item.color)} group-hover:scale-110 transition-transform shadow-lg flex-shrink-0`}>
                        <ItemIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 lg:mb-2">
                          <h3 className="font-bold text-base lg:text-lg text-slate-900">{item.title}</h3>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{item.stats}</span>
                        </div>
                        <p className="text-slate-600 text-sm lg:text-base">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 lg:mb-6">
            Ready to transform your workflow?
          </h2>
          <p className="text-base lg:text-xl text-slate-300 mb-6 lg:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
            Join thousands of teams already using DeskSupport Pro to streamline their IT operations and boost productivity.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center mb-6 lg:mb-8 px-4">
            <button 
              type="button"
              onClick={() => handleNavigate('/signup')}
              className="bg-white hover:bg-slate-100 text-slate-900 font-semibold px-6 lg:px-8 py-3 lg:py-4 rounded-lg lg:rounded-xl shadow-lg shadow-white/10 hover:shadow-white/20 transition-all flex items-center justify-center gap-2 group text-sm lg:text-base"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              type="button"
              onClick={() => handleNavigate('/demo')}
              className="border-2 border-white/20 hover:border-white/30 text-white font-semibold px-6 lg:px-8 py-3 lg:py-4 rounded-lg lg:rounded-xl hover:bg-white/5 transition-all text-sm lg:text-base"
            >
              Schedule Demo
            </button>
          </div>
          <p className="text-xs lg:text-sm text-slate-400">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 lg:gap-12 mb-8 lg:mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3 lg:mb-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                  <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                </div>
                <span className="font-bold text-base lg:text-lg text-slate-900">DeskSupport Pro</span>
              </div>
              <p className="text-slate-600 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base">
                Enterprise-grade IT management platform designed for modern teams. Manage assets, resolve tickets, and collaborate seamlessly.
              </p>
              <div className="flex gap-2 lg:gap-3">
                {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                  <a key={social} href="#" className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-100 hover:bg-slate-900 flex items-center justify-center transition-colors group">
                    <span className="text-xs font-medium text-slate-600 group-hover:text-white transition-colors">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-slate-900 text-sm lg:text-base">Product</h4>
              <ul className="space-y-2 lg:space-y-3 text-xs lg:text-sm">
                {['Features', 'Pricing', 'Documentation', 'API', 'Changelog'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-slate-900 text-sm lg:text-base">Company</h4>
              <ul className="space-y-2 lg:space-y-3 text-xs lg:text-sm">
                {['About', 'Blog', 'Careers', 'Contact', 'Press'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 lg:mb-4 text-slate-900 text-sm lg:text-base">Legal</h4>
              <ul className="space-y-2 lg:space-y-3 text-xs lg:text-sm">
                {['Privacy', 'Terms', 'Security', 'Compliance', 'Cookies'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-6 lg:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 lg:gap-4">
            <p className="text-xs lg:text-sm text-slate-600 text-center md:text-left">&copy; 2025 DeskSupport Pro. All rights reserved.</p>
            <div className="flex items-center gap-4 lg:gap-6 text-xs lg:text-sm text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">Status</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Sitemap</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}