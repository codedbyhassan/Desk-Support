import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BarChart3, Check, ChevronDown, Menu, Package, Shield, Ticket, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/marketing.css'

const capabilities = [
  { icon: Package, title: 'Asset management', text: 'Keep equipment, ownership, status and history in one operational record.' },
  { icon: Ticket, title: 'Support tickets', text: 'Capture requests, assign responsibility and move work from open to resolved.' },
  { icon: Users, title: 'Teams & departments', text: 'Give every team a clear workspace while keeping organisation-wide visibility.' },
  { icon: BarChart3, title: 'Operational insight', text: 'Turn tickets and asset activity into information your team can act on.' },
  { icon: Shield, title: 'Controlled access', text: 'Keep sensitive operational data behind role-aware access and permissions.' },
  { icon: Activity, title: 'Live workspace', text: 'Keep activity visible across the people responsible for getting work done.' },
]

const plans = [
  { name: 'Starter', price: 'Free', text: 'For small teams getting organised.', features: ['Core ticket management', 'Asset records', 'Team workspace'] },
  { name: 'Business', price: 'Custom', text: 'For teams running day-to-day IT operations.', features: ['Everything in Starter', 'Advanced workflows', 'Reporting & permissions'], featured: true },
  { name: 'Enterprise', price: 'Custom', text: 'For organisations with larger operational needs.', features: ['Everything in Business', 'Organisation-wide controls', 'Deployment support'] },
]

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const go = (path: string) => navigate(path)

  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: 0.12, rootMargin: '0px 0px -60px' })
    revealItems.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="Marketing navigation">
        <div className="marketing-container marketing-nav-inner">
          <button type="button" className="marketing-brand" onClick={() => go('/')} aria-label="Desk-Support home"><span className="marketing-brand-mark"><BarChart3 size={18} aria-hidden="true" /></span><span>Desk-Support</span></button>
          <div className="marketing-nav-links"><a className="marketing-nav-link" href="#capabilities">Capabilities</a><a className="marketing-nav-link" href="#workflow">How it works</a><a className="marketing-nav-link" href="#pricing">Pricing</a></div>
          <div className="marketing-nav-actions"><button type="button" className="marketing-nav-link" onClick={() => go('/login')}>Sign in</button><button type="button" className="marketing-button marketing-button-primary" onClick={() => go('/signup')}>Get started <ArrowRight size={15} aria-hidden="true" /></button></div>
          <button type="button" className="marketing-mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen}>{mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}</button>
        </div>
        {mobileOpen && <div className="marketing-container marketing-mobile-menu"><div><a className="marketing-nav-link" href="#capabilities" onClick={() => setMobileOpen(false)}>Capabilities</a><a className="marketing-nav-link" href="#workflow" onClick={() => setMobileOpen(false)}>How it works</a><a className="marketing-nav-link" href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a><button type="button" className="marketing-button marketing-button-secondary" onClick={() => go('/login')}>Sign in</button><button type="button" className="marketing-button marketing-button-primary" onClick={() => go('/signup')}>Get started</button></div></div>}
      </nav>

      <section className="marketing-hero">
        <div className="marketing-container marketing-hero-grid">
          <div className="marketing-hero-copy-wrap"><div className="marketing-eyebrow hero-reveal hero-reveal-delay-1">IT operations, without the clutter</div><h1 className="hero-reveal hero-reveal-delay-2">Run your support desk with <span>clarity.</span></h1><p className="marketing-hero-copy hero-reveal hero-reveal-delay-3">Desk-Support brings tickets, assets, teams and operational activity into one focused workspace built for organisations that need work to stay visible.</p><div className="marketing-hero-actions hero-reveal hero-reveal-delay-4"><button type="button" className="marketing-button marketing-button-primary marketing-magnetic" onClick={() => go('/signup')}>Create your workspace <ArrowRight size={16} aria-hidden="true" /></button><a className="marketing-button marketing-button-secondary" href="#workflow">See how it works <ChevronDown size={15} aria-hidden="true" /></a></div><div className="marketing-trust hero-reveal hero-reveal-delay-5">Built around the work your support team already does — not another generic dashboard.</div></div>
          <div className="marketing-product-frame marketing-parallax" aria-label="Desk-Support product preview"><div className="marketing-window"><div className="marketing-window-bar" aria-hidden="true"><i className="marketing-window-dot" /><i className="marketing-window-dot" /><i className="marketing-window-dot" /></div><div className="marketing-window-body"><aside className="marketing-product-sidebar" aria-label="Product preview navigation">{['Overview', 'Tickets', 'Assets', 'Teams', 'Reports'].map((item, index) => <div key={item} className={`marketing-side-item ${index === 0 ? 'active' : ''}`}>{item}</div>)}</aside><div className="marketing-product-main"><div className="marketing-product-title"><strong>Operations overview</strong><span className="marketing-live"><i aria-hidden="true" /> Live</span></div><div className="marketing-kpis"><div className="marketing-kpi"><small>Open tickets</small><strong>24</strong><em>+8% this week</em></div><div className="marketing-kpi"><small>Assets tracked</small><strong>342</strong><em>All records current</em></div><div className="marketing-kpi"><small>In progress</small><strong>11</strong><em>Across 4 teams</em></div><div className="marketing-kpi"><small>Resolved</small><strong>86%</strong><em>Current period</em></div></div><div className="marketing-chart" aria-label="Illustrative operational activity chart"><div className="marketing-chart-lines" aria-hidden="true">{[34,52,43,70,57,84,64,91,76].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div></div></div></div></div>
        </div>
      </section>

      <section id="capabilities" className="marketing-section marketing-section-soft"><div className="marketing-container"><div className="marketing-section-heading reveal-up" data-reveal><small>Core capabilities</small><h2>One system for the work behind every request.</h2><p>Desk-Support connects the operational pieces that normally live across spreadsheets, chat threads and disconnected tools.</p></div><div className="marketing-capabilities">{capabilities.map(({ icon: Icon, title, text }, index) => <article className="marketing-capability reveal-up" data-reveal style={{ '--reveal-delay': `${index * 70}ms` } as React.CSSProperties} key={title}><div className="marketing-capability-icon"><Icon size={19} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section id="workflow" className="marketing-section"><div className="marketing-container marketing-workflow"><div><div className="marketing-section-heading reveal-up" data-reveal style={{ '--reveal-delay': '80ms' } as React.CSSProperties}><small>How it works</small><h2>Less chasing. More resolving.</h2><p>Give every request a clear owner, every asset a record and every team a shared operational picture.</p></div><div className="marketing-workflow-list">{[['01', 'Capture the request', 'Create a ticket with the context your team needs from the start.'], ['02', 'Assign the work', 'Route the request to the right person, team or department.'], ['03', 'Track the outcome', 'Keep activity, status and resolution history visible until the work is complete.']].map(([step, title, text], index) => <div className="marketing-workflow-item reveal-up" data-reveal style={{ '--reveal-delay': `${140 + index * 90}ms` } as React.CSSProperties} key={step}><div className="marketing-step">{step}</div><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div><div className="marketing-feature-panel reveal-scale" data-reveal><span className="label">Operational foundation</span><h3>Make the state of your organisation obvious.</h3><p>The goal is not more screens. It is a dependable source of truth for what needs attention, who owns it and what happened.</p><ul>{['Tickets connected to people and teams', 'Assets with accountable ownership', 'Role-aware operational access', 'A workspace designed for daily use'].map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul></div></div></section>
      <section id="pricing" className="marketing-section marketing-section-soft"><div className="marketing-container"><div className="marketing-section-heading reveal-up" data-reveal><small>Pricing</small><h2>Start with the workflow. Scale when you need to.</h2><p>Simple plans for teams at different stages of operational maturity. Contact us when your requirements become more specific.</p></div><div className="marketing-pricing">{plans.map((plan, index) => <article className={`marketing-price-card reveal-up ${plan.featured ? 'featured' : ''}`} data-reveal style={{ '--reveal-delay': `${index * 100}ms` } as React.CSSProperties} key={plan.name}><h3>{plan.name}</h3><div className="marketing-price">{plan.price}{plan.price !== 'Free' && <span> / plan</span>}</div><p>{plan.text}</p><ul>{plan.features.map(feature => <li key={feature}><Check size={15} aria-hidden="true" />{feature}</li>)}</ul><button type="button" className={`marketing-button ${plan.featured ? 'marketing-button-primary' : 'marketing-button-secondary'}`} onClick={() => go('/signup')}>{plan.price === 'Free' ? 'Get started' : 'Talk to us'}</button></article>)}</div></div></section>
      <section className="marketing-cta"><div className="marketing-container marketing-cta-inner reveal-up" data-reveal><div><h2>Your support operation deserves a system built around it.</h2><p>Bring your tickets, assets and teams into one workspace.</p></div><button type="button" className="marketing-button marketing-button-primary marketing-magnetic" onClick={() => go('/signup')}>Get started <ArrowRight size={16} aria-hidden="true" /></button></div></section>
      <footer className="marketing-footer"><div className="marketing-container marketing-footer-inner"><span>© {new Date().getFullYear()} Desk-Support</span><span>Support operations, organised.</span></div></footer>
    </main>
  )
}
