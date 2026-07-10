'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const getJobsData = (t: any) => [
  {
    category: t('careers.catTech'),
    icon: '💻',
    color: 'from-blue-500 to-blue-600',
    jobs: [
      {
        title: t('careers.jobNextjs'),
        location: t('careers.locationCairoDoha'),
        type: t('careers.fullTime'),
        exp: t('careers.exp2to4'),
        key: 'nextjsDevelopers'
      },
      {
        title: t('careers.jobPerformanceAnalysts'),
        location: t('careers.locationDohaQatar'),
        type: t('careers.fullTime'),
        exp: t('careers.exp3to5'),
        key: 'performanceAnalysts'
      }
    ]
  },
  {
    category: t('careers.catManagement'),
    icon: '🏢',
    color: 'from-green-500 to-green-600',
    jobs: [
      {
        title: t('careers.jobClubManagement'),
        location: t('careers.locationArabianGulf'),
        type: t('careers.fullTime'),
        exp: t('careers.exp5plus'),
        key: 'clubManagement'
      },
      {
        title: t('careers.jobAcademyManagement'),
        location: t('careers.locationQatarUae'),
        type: t('careers.fullTime'),
        exp: t('careers.exp4to7'),
        key: 'academyManagement'
      },
      {
        title: t('careers.jobAccountants'),
        location: t('careers.locationCairoDoha'),
        type: t('careers.fullTime'),
        exp: t('careers.exp3plus'),
        key: 'accountants'
      }
    ]
  },
  {
    category: t('careers.catSports'),
    icon: '⚽',
    color: 'from-purple-500 to-purple-600',
    jobs: [
      {
        title: t('careers.jobScoutsManagement'),
        location: t('careers.locationGulfEurope'),
        type: t('careers.fullTime'),
        exp: t('careers.exp5plus'),
        key: 'scoutsManagement'
      },
      {
        title: t('careers.jobTournamentsManagement'),
        location: t('careers.locationQatarTurkey'),
        type: t('careers.fullTime'),
        exp: t('careers.exp3to6'),
        key: 'tournamentsManagement'
      },
      {
        title: t('careers.jobTrialsManagement'),
        location: t('careers.locationMultiCountry'),
        type: t('careers.fullTime'),
        exp: t('careers.exp4plus'),
        key: 'trialsManagement'
      },
      {
        title: t('careers.jobVideoPhotographer'),
        location: t('careers.locationCairoDoha'),
        type: t('careers.fullTime'),
        exp: t('careers.exp2plus'),
        key: 'videoPhotographer'
      }
    ]
  },
  {
    category: t('careers.catSupport'),
    icon: '🤝',
    color: 'from-orange-500 to-orange-600',
    jobs: [
      {
        title: t('careers.jobSales'),
        location: t('careers.locationCairoDoha'),
        type: t('careers.fullTime'),
        exp: t('careers.exp1to3'),
        key: 'sales'
      },
      {
        title: t('careers.jobCustomerRelations'),
        location: t('careers.locationDohaQatar'),
        type: t('careers.fullTime'),
        exp: t('careers.exp2to4'),
        key: 'customerRelations'
      },
      {
        title: t('careers.jobCallCenter'),
        location: t('careers.locationCairoEgypt'),
        type: t('careers.fullTime'),
        exp: t('careers.exp1to2'),
        key: 'callCenter'
      },
      {
        title: t('careers.jobDirectSales'),
        location: t('careers.locationField'),
        type: t('careers.fullTime'),
        exp: t('careers.exp1plus'),
        key: 'directSales'
      },
      {
        title: t('careers.jobDirectCustomerCare'),
        location: t('careers.locationRemote'),
        type: t('careers.partTime'),
        exp: t('careers.exp1plus'),
        key: 'directCustomerCare'
      }
    ]
  }
];

export default function CareersPage() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const theme = {
    bg: dark ? '#080d20' : '#f8fafc',
    panelBg: dark ? '#0f172a' : '#ffffff',
    cardBg: dark ? '#161e3f' : '#f1f5f9',
    text: dark ? '#ffffff' : '#0f172a',
    subText: dark ? '#bdc4ef' : '#64748b',
    primary: dark ? '#bdc4ef' : '#4f46e5',
    border: dark ? 'rgba(189,196,239,0.1)' : 'rgba(0,0,0,0.06)',
    headerBg: dark ? 'rgba(8,13,32,.8)' : 'rgba(255,255,255,.8)',
  };

  const JOBS_DATA = getJobsData(t);

  const footerCols = [
    {
      title: t('about.footerQuickLinks'),
      links: [
        { l: t('about.footerTalentSearch'), h: '#' },
        { l: t('about.footerPerformanceReports'), h: '#' },
        { l: t('about.footerDigitalAcademy'), h: '#' },
        { l: t('about.footerMatchSchedule'), h: '#' },
        { l: t('about.footerStarNews'), h: '#' }
      ]
    },
    {
      title: t('about.footerCompany'),
      links: [
        { l: t('about.badge'), h: '/about' },
        { l: t('careers.pageTitle'), h: '/careers' },
        { l: t('successStories.title'), h: '/success-stories' },
        { l: t('contact.title'), h: '/contact' }
      ]
    },
    {
      title: t('about.footerLegal'),
      links: [
        { l: t('privacy.title'), h: '/privacy' },
        { l: t('terms.title'), h: '/terms' },
        { l: t('about.footerScoutingStandards'), h: '#' },
        { l: t('support.title'), h: '/support' }
      ]
    }
  ];

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', direction: isRTL ? 'rtl' : 'ltr' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&display=swap" />

      {/* HEADER */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 200,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: scrolled ? '0 2rem' : '0 3rem', height: scrolled ? '4rem' : '6rem',
        background: theme.headerBg, backdropFilter: 'blur(24px)',
        borderBottom: scrolled ? `1px solid ${theme.border}` : '1px solid transparent',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
             <img src="/el7lm-logo.png" alt="EL7LM Logo" style={{ height: '64px', width: '64px', transition: 'all 0.4s ease', objectFit: 'contain' }} />
             <span className="hl" style={{ fontSize: '1.5rem', fontWeight: 900, color: dark ? '#bdc4ef' : '#4f46e5', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>EL7LM</span>
          </Link>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {[
              { label: t('nav.home'), href: '/' },
              { label: t('nav.hagzz'), href: '/' },
              { label: t('nav.academy'), href: '/' },
              { label: t('nav.clubs'), href: '/' },
              { label: t('nav.tournaments'), href: '/' }
            ].map((item, i) => (
              <Link key={i} href={item.href} style={{
                fontFamily: "'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif",
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.025em',
                textDecoration: 'none', color: i === 0 ? (dark ? '#bdc4ef' : '#4f46e5') : theme.subText,
                transition: 'color .2s'
              }}>{item.label}</Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setDark(!dark)} style={{ background: 'none', border: 'none', color: theme.text, cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '8px' }}>
            {dark ? '🌞' : '🌙'}
          </button>
          <Link href="/auth/register" className="hl" style={{
            padding: '.5rem 1.5rem', borderRadius: '2px',
            background: 'linear-gradient(135deg,#bdc4ef,#161e3f)', color: '#272e50',
            fontWeight: 900, fontSize: '.875rem', textDecoration: 'none'
          }}>{t('about.joinNow')}</Link>
        </div>
      </header>

      <main style={{ paddingTop: '8rem' }}>
        {/* HERO */}
        <section style={{ padding: '6rem 0' }}>
          <div className="ct">
            <div className="reveal" style={{ textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
              <span className="hl" style={{ color: theme.primary, fontWeight: 800, fontSize: '1.125rem', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: '1.5rem' }}>{t('careers.badge')}</span>
              <h1 className="st" style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '2.5rem' }}>{t('careers.pageTitle')}</h1>
              <p style={{ fontSize: '1.5rem', color: theme.subText, lineHeight: 1.7 }}>{t('careers.pageSub')}</p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ padding: '4rem 0', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
          <div className="ct">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', textAlign: 'center' }}>
              {[
                { n: '25+', l: t('careers.statsEmployees'), i: '👥' },
                { n: '8', l: t('careers.statsCountries'), i: '🌍' },
                { n: '150+', l: t('careers.statsPlayers'), i: '⚽' },
                { n: '25+', l: t('careers.statsPartners'), i: '🏆' }
              ].map((s, i) => (
                <div key={i} className="reveal">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{s.i}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: theme.primary }}>{s.n}</div>
                  <div style={{ fontWeight: 700, color: theme.subText }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* JOBS */}
        <section id="jobs" style={{ padding: '8rem 0' }}>
          <div className="ct">
            <div className="reveal" style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 className="st" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>{t('careers.jobsTitle')}</h2>
              <p style={{ color: theme.subText, fontSize: '1.2rem' }}>{t('careers.jobsSub')}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
              {JOBS_DATA.map((cat, i) => (
                <div key={i}>
                  <div className="reveal" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{
                      width: '4rem', height: '4rem', borderRadius: '16px', background: theme.panelBg,
                      border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                    }}>{cat.icon}</div>
                    <h3 className="st" style={{ fontSize: '2rem', margin: 0 }}>{cat.category}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    {cat.jobs.map((job, j) => (
                      <div key={j} className="reveal reveal-card tc" style={{ background: theme.panelBg, borderRadius: '24px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '2.5rem' }}>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>{job.title}</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                            <span style={{ border: `1px solid ${theme.border}`, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>📍 {job.location}</span>
                            <span style={{ border: `1px solid ${theme.border}`, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>🕒 {job.type}</span>
                            <span style={{ border: `1px solid ${theme.border}`, padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>🎓 {job.exp}</span>
                          </div>
                          <Link href={`/careers/apply?role=${job.key}`} className="tc" style={{
                            display: 'block', textAlign: 'center', padding: '1.25rem',
                            background: theme.primary, color: dark ? '#080d20' : 'white', borderRadius: '16px',
                            fontWeight: 900, textDecoration: 'none'
                          }}>{t('careers.applyBtn')}</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '8rem 0', background: 'linear-gradient(135deg, #4f46e5, #080d20)', color: 'white' }}>
          <div className="ct reveal" style={{ textAlign: 'center' }}>
            <h2 className="st" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>{t('careers.noJobTitle')}</h2>
            <p style={{ opacity: 0.8, fontSize: '1.3rem', marginBottom: '4rem', maxWidth: '800px', margin: '0 auto 4rem' }}>{t('careers.noJobSub')}</p>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/careers/apply" className="tc" style={{ background: 'white', color: '#4f46e5', padding: '1.25rem 3rem', borderRadius: '16px', fontWeight: 900, textDecoration: 'none', fontSize: '1.1rem' }}>{t('careers.sendCV')}</Link>
              <Link href="/contact" className="tc" style={{ border: '2px solid white', color: 'white', padding: '1.125rem 3rem', borderRadius: '16px', fontWeight: 900, textDecoration: 'none', fontSize: '1.1rem' }}>{t('careers.contactUs')}</Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: dark ? '#080d20' : '#ffffff', padding: '8rem 0', borderTop: `1px solid ${theme.border}` }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4rem' }}>
            <div style={{ flex: '1 1 300px' }}>
              <img src="/el7lm-logo.png" alt="Logo" style={{ height: '50px', marginBottom: '1.5rem' }} />
              <p style={{ color: theme.subText, lineHeight: 1.8 }}>{t('about.footerDescription')}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', flex: '2 1 600px' }}>
              {footerCols.map((col: any, i: number) => (
                <div key={i}>
                  <h4 className="hl" style={{ fontWeight: 900, marginBottom: '1.5rem', fontSize: '0.85rem', letterSpacing: '0.1em' }}>{col.title}</h4>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {col.links.map((link: any, j: number) => (
                      <Link key={j} href={link.h} style={{ color: theme.subText, textDecoration: 'none', fontSize: '0.9rem' }}>{link.l}</Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: '5rem', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ color: theme.subText, fontSize: '0.85rem' }}>{t('about.copyright')}</p>
            <div className="hl" style={{ fontWeight: 900, color: theme.primary }}>Mesk llc Qatar</div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        body { margin: 0; font-family: 'IBM Plex Sans Arabic', sans-serif; overflow-x: hidden; }
        .ct { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
        .hl { font-family: 'Space Grotesk', sans-serif; }
        .st { font-family: 'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; }
        .tc { transition: all 0.3s ease; }
        .tc:hover { transform: translateY(-3px); opacity: 0.9; }
        .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal.active { opacity: 1; transform: translateY(0); }
        @media(max-width: 768px) {
          .st { font-size: 2.2rem !important; }
          .ct { padding: 0 1rem; }
        }
      ` }} />
    </div>
  );
}
