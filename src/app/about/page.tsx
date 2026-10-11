'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { WebsiteShell } from '@/components/website/WebsiteShell';

export default function AboutPage() {
  const [dark, setDark] = useState(false);
  const { t, isRTL } = useTranslation();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    return () => {
      observer.disconnect();
    };
  }, []);

  const theme = {
    bg: dark ? '#080d20' : '#f8fafc',
    panelBg: dark ? '#0f172a' : '#ffffff',
    cardBg: dark ? '#161e3f' : '#f1f5f9',
    text: dark ? '#ffffff' : '#0f172a',
    subText: dark ? '#bdc4ef' : '#64748b',
    primary: '#10b981',
    glow: 'rgba(16,185,129,.15)',
    border: dark ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)',
    btnGradient: 'linear-gradient(135deg,#10b981,#059669)',
    btnText: '#ffffff'
  };

  return (
    <WebsiteShell title={t('about.heroTitle')}>
      <div style={{ color: theme.text, minHeight: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&display=swap" />

        <div className="about-content">
        {/* HERO SECTION */}
        <section style={{ padding: '6rem 0' }}>
          <div className="ct">
            <div className="reveal" style={{ textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
              <span className="hl" style={{ color: theme.primary, fontWeight: 800, fontSize: '1.125rem', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: '1.5rem' }}>{t('about.badge')}</span>
              <h1 className="st" style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '2.5rem' }}>
                {t('about.heroTitle')}
              </h1>
              <p style={{ fontSize: '1.5rem', color: theme.subText, lineHeight: 1.7, marginBottom: '4rem' }}>
                {t('about.heroSub')}
              </p>
            </div>
          </div>
        </section>

        {/* VALUES SECTION */}
        <section style={{ padding: '8rem 0' }}>
          <div className="ct">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
              {[
                { title: t('about.visionTitle'), sub: t('about.visionDesc') },
                { title: t('about.missionTitle'), sub: t('about.missionDesc') },
                { title: t('about.valuesTitle'), sub: t('about.valuesDesc') }
              ].map((v, i) => (
                <div key={i} className="reveal reveal-card" style={{ padding: '3.5rem 2.5rem', background: theme.panelBg, borderRadius: '32px', border: `1px solid ${theme.border}` }}>
                  <h4 className="hl" style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 900 }}>{v.title}</h4>
                  <p style={{ color: theme.subText, fontSize: '0.95rem', lineHeight: 1.7 }}>{v.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDER MESSAGE */}
        <section style={{ padding: '6rem 0', background: theme.panelBg }}>
          <div className="ct">
            <div className="reveal reveal-card founder-card" style={{ maxWidth: '900px', margin: '0 auto', background: theme.bg, padding: '4rem', borderRadius: '32px', border: `1px solid ${theme.border}`, position: 'relative' }}>
               <span style={{ position: 'absolute', top: '2rem', right: '2rem', fontSize: '6rem', color: theme.primary, opacity: 0.1, fontFamily: 'serif' }}>"</span>
               <h2 className="hl" style={{ fontSize: '1.25rem', color: theme.primary, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('about.founderMessageTitle')}</h2>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem', alignItems: 'center' }} className="founder-grid">
                 <div>
                   <p style={{ fontSize: '1.5rem', lineHeight: 1.7, fontWeight: 500, marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
                     {t('about.founderMessage')}
                   </p>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div>
                         <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{t('about.founderName')}</div>
                         <div style={{ color: theme.subText, fontSize: '1rem' }}>{t('about.founderRole')}</div>
                      </div>
                   </div>
                 </div>
                 
                 <div className="founder-img-container" style={{ position: 'relative' }}>
                    <div style={{ borderRadius: '24px', overflow: 'hidden', border: `4px solid ${theme.primary}`, boxShadow: `0 20px 40px ${theme.glow}` }}>
                       <img src="/images/team/founder.jpg" alt="Founder" className="founder-img" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '8rem 0', textAlign: 'center' }}>
          <div className="ct reveal">
             <h2 className="st" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>{t('about.ctaTitle')}</h2>
             <p style={{ color: theme.subText, fontSize: '1.25rem', marginBottom: '3rem' }}>{t('about.ctaSub')}</p>
             <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/auth/register?role=player" className="tc" style={{ background: theme.primary, color: 'white', padding: '1.25rem 2.5rem', borderRadius: '16px', fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem', boxShadow: `0 10px 40px ${theme.glow}` }}>
                  {t('about.registerAsPlayer')}
                </Link>
                <Link href="/auth/register?role=club" className="tc" style={{ border: `2px solid ${theme.primary}`, color: theme.text, padding: '1.125rem 2.5rem', borderRadius: '16px', fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem' }}>
                  {t('about.registerAsClub')}
                </Link>
              </div>
          </div>
        </section>

        <style dangerouslySetInnerHTML={{ __html: `
          .ct { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
          .hl { font-family: 'Space Grotesk', sans-serif; }
          .st { font-family: 'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; }
          .tc { transition: all 0.3s ease; }
          .tc:hover { transform: translateY(-3px); opacity: 0.9; }
          .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
          .reveal.active { opacity: 1; transform: translateY(0); }
          @media(max-width: 768px) {
            .founder-card { padding: 2rem !important; }
            .founder-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
            .founder-img-container { order: -1; margin-bottom: 1rem; }
            .founder-img { max-width: 200px; margin: 0 auto; }
            .st { font-size: 2.2rem !important; }
            .ct { padding: 0 1rem; }
          }
        ` }} />
        </div>
      </div>
    </WebsiteShell>
  );
}
