'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const TR = {
  ar: {
    dir: 'rtl', lang: 'ar',
    joinBtn: 'انضم الآن',
    nav: ['الرئيسية', 'تطبيق حجز', 'الأكاديمية', 'الأندية', 'البطولات'],
    footerDesc: 'منصة رائدة تهدف إلى تمكين المواهب الكروية العربية باستخدام التكنولوجيا الحديثة والذكاء الاصطناعي للوصول إلى العالمية.',
    footerCols: [
      { title: 'روابط سريعة', links: [{ l: 'البحث عن المواهب', h: '#' }, { l: 'تقارير الأداء', h: '#' }, { l: 'الأكاديمية الرقمية', h: '#' }, { l: 'جدول المباريات', h: '#' }, { l: 'أخبار النجوم', h: '#' }] },
      { title: 'الشركة', links: [{ l: 'من نحن', h: '/about' }, { l: 'الوظائف', h: '/careers' }, { l: 'شركاء النجاح', h: '/success-stories' }, { l: 'اتصل بنا', h: '/contact' }] },
      { title: 'الدعم القانوني', links: [{ l: 'سياسة الخصوصية', h: '/privacy' }, { l: 'الشروط والأحكام', h: '/terms' }, { l: 'معايير الكشافة', h: '#' }, { l: 'الدعم الفني', h: '/support' }] },
    ],
    copyright: '© 2024 EL7LM platform with V Lab Ai. جميع الحقوق محفوظة.',
    designedFor: 'صُمِّم للأبطال',
  },
  en: {
    dir: 'ltr', lang: 'en',
    joinBtn: 'Join Now',
    nav: ['Home', 'Hagzz App', 'Academy', 'Clubs', 'Tournaments'],
    footerDesc: 'A leading platform aiming to empower Arab football talents using modern technology and artificial intelligence to reach global recognition.',
    footerCols: [
      { title: 'Quick Links', links: [{ l: 'Talent Search', h: '#' }, { l: 'Performance Reports', h: '#' }, { l: 'Digital Academy', h: '#' }, { l: 'Match Schedule', h: '#' }, { l: 'Star News', h: '#' }] },
      { title: 'Company', links: [{ l: 'About Us', h: '/about' }, { l: 'Careers', h: '/careers' }, { l: 'Success Stories', h: '/success-stories' }, { l: 'Contact', h: '/contact' }] },
      { title: 'Legal', links: [{ l: 'Privacy Policy', h: '/privacy' }, { l: 'Terms & Conditions', h: '/terms' }, { l: 'Scouting Standards', h: '#' }, { l: 'Technical Support', h: '/support' }] },
    ],
    copyright: '© 2024 EL7LM platform with V Lab Ai. ALL RIGHTS RESERVED.',
    designedFor: 'Designed for Champions',
  }
};

export default function AboutPage() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);

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
    primary: '#10b981',
    glow: 'rgba(16,185,129,.15)',
    border: dark ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)',
    headerBg: dark ? 'rgba(8,13,32,.8)' : 'rgba(255,255,255,.8)',
    btnGradient: 'linear-gradient(135deg,#10b981,#059669)',
    btnText: '#ffffff'
  };

  const isRTL = true;
  const t = TR[isRTL ? 'ar' : 'en'];

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
             <span className="hl" style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.primary, textTransform: 'uppercase', letterSpacing: '-0.05em' }}>EL7LM</span>
          </Link>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {t.nav.map((item, i) => (
              <Link key={i} href="/" style={{
                fontFamily: "'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif",
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.025em',
                textDecoration: 'none', color: i === 0 ? theme.primary : theme.subText,
                transition: 'color .2s'
              }}>{item}</Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setDark(!dark)} style={{ background: 'none', border: 'none', color: theme.text, cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '8px' }}>
            {dark ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <Link href="/auth/register" className="hl" style={{
            padding: '.5rem 1.5rem', borderRadius: '2px',
            background: theme.btnGradient, color: theme.btnText,
            fontWeight: 900, fontSize: '.875rem', textDecoration: 'none'
          }}>{t.joinBtn}</Link>
        </div>
      </header>

      <main style={{ paddingTop: '8rem' }}>
        {/* HERO SECTION */}
        <section style={{ padding: '6rem 0' }}>
          <div className="ct">
            <div className="reveal" style={{ textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
              <span className="hl" style={{ color: theme.primary, fontWeight: 800, fontSize: '1.125rem', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block', marginBottom: '1.5rem' }}>من نحن</span>
              <h1 className="st" style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '2.5rem' }}>
                نحن لا نصنع مجرد منصة.. نحن نبني مستقبل كرة القدم العربية
              </h1>
              <p style={{ fontSize: '1.5rem', color: theme.subText, lineHeight: 1.7, marginBottom: '4rem' }}>
                المستشار الرقمي لكل موهبة شابة تحلم بالاحتراف، والجسر الذكي الذي يربط بين الملاعب والاحتراف العالمي.
              </p>
            </div>
          </div>
        </section>

        {/* VALUES SECTION */}
        <section style={{ padding: '8rem 0' }}>
          <div className="ct">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
              {[
                { title: 'الرؤية', sub: 'أن تصبح منصة "الحلم" المرجع الأول لاكتشاف المواهب الكروية عالمياً باستخدام الذكاء الاصطناعي.' },
                { title: 'المهمة', sub: 'نقل التكنولوجيا المتقدمة من المختبرات إلى الملاعب، لتمكين كل لاعب مجتهد من الحصول على فرصته العادلة.' },
                { title: 'القيم', sub: 'العدالة، الابتكار، والاحترافية. نحن نؤمن أن الموهبة يمكن أن تولد في أي مكان.' }
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
               <h2 className="hl" style={{ fontSize: '1.25rem', color: theme.primary, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>رسالة من المؤسس</h2>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem', alignItems: 'center' }} className="founder-grid">
                 <div>
                   <p style={{ fontSize: '1.5rem', lineHeight: 1.7, fontWeight: 500, marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
                     "بدأنا 'الحلم' لأننا نؤمن أن في كل شارع وكل أكاديمية موهبة مدفونة تنتظر من يراها. هدفنا في Mesk و V Lab هو أن نوفر لهذه المواهب 'العين الرقمية' التي لا تنام، والفرصة التي تستحقها للوصول للعالمية."
                   </p>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div>
                         <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>محمد سعودي</div>
                         <div style={{ color: theme.subText, fontSize: '1rem' }}>المؤسس والرئيس التنفيذي</div>
                      </div>
                   </div>
                 </div>
                 
                 <div className="founder-img-container" style={{ position: 'relative' }}>
                    <div style={{ borderRadius: '24px', overflow: 'hidden', border: `4px solid ${theme.primary}`, boxShadow: `0 20px 40px ${theme.glow}` }}>
                       <img src="/images/team/founder.jpg" alt="محمد سعودي" className="founder-img" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '8rem 0', textAlign: 'center' }}>
          <div className="ct reveal">
             <h2 className="st" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>انضم إلينا اليوم..</h2>
             <p style={{ color: theme.subText, fontSize: '1.25rem', marginBottom: '3rem' }}>وابدأ رحلتك من "الملعب" إلى "العالمية"!</p>
             <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/auth/register?role=player" className="tc" style={{ background: theme.primary, color: 'white', padding: '1.25rem 2.5rem', borderRadius: '16px', fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem', boxShadow: `0 10px 40px ${theme.glow}` }}>
                  سجل الآن كلاعب
                </Link>
                <Link href="/auth/register?role=club" className="tc" style={{ border: `2px solid ${theme.primary}`, color: theme.text, padding: '1.125rem 2.5rem', borderRadius: '16px', fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem' }}>
                  سجل كنادٍ/كشاف
                </Link>
             </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ background: dark ? '#080d20' : '#ffffff', padding: '8rem 0', borderTop: `1px solid ${theme.border}` }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4rem' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <img src="/el7lm-logo.png" alt="EL7LM Logo" style={{ height: '50px', width: 'auto' }} />
              </div>
              <p style={{ color: theme.subText, maxWidth: '400px', lineHeight: 1.8, fontSize: '0.95rem' }}>{t.footerDesc}</p>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', flex: '2 1 600px' }}>
              {t.footerCols.map((col: any, i: number) => (
                <div key={i} style={{ minWidth: '150px' }}>
                  <h4 className="hl" style={{ color: theme.text, fontWeight: 900, marginBottom: '1.5rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em' }}>{col.title}</h4>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {col.links.map((link: any, j: number) => (
                      <Link key={j} href={link.h} style={{ color: theme.subText, textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = theme.primary}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = theme.subText}>
                        {link.l}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: '5rem', paddingTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <p style={{ color: theme.subText, fontSize: '0.85rem', fontWeight: 500 }}>{t.copyright}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <span style={{ fontSize: '0.75rem', color: theme.subText, display: 'block' }}>{t.designedFor}</span>
                <span className="hl" style={{ fontSize: '0.875rem', color: theme.primary, fontWeight: 900, letterSpacing: '.05em' }}>Mesk llc Qatar</span>
              </div>
              <div style={{ 
                width: '3.5rem', height: '3.5rem', borderRadius: '12px', 
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                border: `1px solid ${theme.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary,
                boxShadow: '0 10px 20px rgba(16,185,129,0.1)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
            </div>
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
          .founder-card { padding: 2rem !important; }
          .founder-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .founder-img-container { order: -1; margin-bottom: 1rem; }
          .founder-img { max-width: 200px; margin: 0 auto; }
          .st { font-size: 2.2rem !important; }
          .ct { padding: 0 1rem; }
        }
      ` }} />
    </div>
  );
}
