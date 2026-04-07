'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
    formTitle: 'نموذج التقديم للوظيفة',
    backBtn: 'العودة للوظائف',
    submitBtn: 'إرسال الطلب',
    loadingBtn: 'جاري الإرسال...',
    successTitle: 'تم إرسال طلبك بنجاح',
    successMsg: 'سنتواصل معك قريباً عبر البريد الإلكتروني أو الهاتف.',
    labels: {
      roles: 'اختر الوظيفة/الوظائف',
      name: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      country: 'الدولة',
      city: 'المحافظة / المدينة',
      exp: 'الخبرات السابقة',
      linkedin: 'رابط لينكدإن (اختياري)',
      facebook: 'رابط فيسبوك/إنستغرام',
      notes: 'ملاحظات إضافية'
    }
  }
};

const AVAILABLE_ROLES = [
  { key: 'nextjsDevelopers', label: 'مبرمجين Next.js' },
  { key: 'performanceAnalysts', label: 'محللي الأداء' },
  { key: 'clubManagement', label: 'إدارة الأندية' },
  { key: 'academyManagement', label: 'إدارة الأكاديمية' },
  { key: 'accountants', label: 'المحاسبين' },
  { key: 'scoutsManagement', label: 'إدارة الكشافين' },
  { key: 'tournamentsManagement', label: 'إدارة البطولات' },
  { key: 'trialsManagement', label: 'إدارة الاختبارات' },
  { key: 'videoPhotographer', label: 'مصور فيديو' },
  { key: 'sales', label: 'وظائف المبيعات' },
  { key: 'customerRelations', label: 'علاقات العملاء' },
  { key: 'callCenter', label: 'كول سنتر' },
  { key: 'directSales', label: 'مبيعات مباشرة' },
  { key: 'directCustomerCare', label: 'رعاية عملاء مباشرة' }
];

function ApplyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleFromQuery = searchParams.get('role') || '';
  
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', country: '', governorate: '',
    experience: '', linkedin: '', facebook: '', notes: ''
  });

  useEffect(() => {
    if (roleFromQuery) {
        setSelectedRoles([roleFromQuery]);
    }
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [roleFromQuery]);

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Logic for submission would go here (e.g. Supabase or API)
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const theme = {
    bg: dark ? '#080d20' : '#f8fafc',
    panelBg: dark ? '#0f172a' : '#ffffff',
    text: dark ? '#ffffff' : '#0f172a',
    subText: dark ? '#bdc4ef' : '#64748b',
    primary: dark ? '#bdc4ef' : '#4f46e5',
    border: dark ? 'rgba(189,196,239,0.1)' : 'rgba(0,0,0,0.06)',
    inputBg: dark ? '#161e3f' : '#f1f5f9',
    headerBg: dark ? 'rgba(8,13,32,.8)' : 'rgba(255,255,255,.8)',
  };

  const t = TR.ar;

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh', direction: 'rtl' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&display=swap" />
      
      {/* HEADER */}
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 200,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 2rem', height: scrolled ? '4rem' : '6rem',
        background: theme.headerBg, backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${theme.border}`, transition: 'all 0.4s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
             <img src="/el7lm-logo.png" alt="Logo" style={{ height: '64px', width: '64px', objectFit: 'contain' }} />
             <span className="hl" style={{ fontSize: '1.5rem', fontWeight: 900, color: theme.primary }}>EL7LM</span>
          </Link>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: theme.primary }}>🏠 الرئيسية</Link>
          </nav>
        </div>
        <button onClick={() => setDark(!dark)} style={{ background: 'none', border: 'none', color: theme.text, cursor: 'pointer', padding: '0.5rem' }}>
          {dark ? '🌞' : '🌙'}
        </button>
      </header>

      <main style={{ paddingTop: '8rem', paddingBottom: '5rem' }}>
        <div className="ct">
          <div style={{ maxWidth: '850px', margin: '0 auto', background: theme.panelBg, borderRadius: '32px', padding: '3rem', border: `1px solid ${theme.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }} className="apply-card">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h1 className="st" style={{ fontSize: '2rem', margin: 0 }}>{t.formTitle}</h1>
              <Link href="/careers" style={{ 
                color: theme.primary, textDecoration: 'none', fontWeight: 700, 
                display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${theme.border}`,
                padding: '0.5rem 1rem', borderRadius: '12px'
              }}>
                ⬅️ {t.backBtn}
              </Link>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>✅</div>
                <h2 className="st" style={{ marginBottom: '1rem' }}>{t.successTitle}</h2>
                <p style={{ color: theme.subText, fontSize: '1.2rem', marginBottom: '3rem' }}>{t.successMsg}</p>
                <button onClick={() => router.push('/')} className="tc" style={{ background: theme.primary, color: 'white', padding: '1rem 3rem', borderRadius: '12px', border: 'none', fontWeight: 800 }}>العودة للرئيسية</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2.5rem' }}>
                {/* Roles multi-select */}
                <div>
                  <label style={{ display: 'block', fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.1rem' }}>{t.labels.roles}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {AVAILABLE_ROLES.map(r => (
                      <label key={r.key} style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
                        background: selectedRoles.includes(r.key) ? `${theme.primary}15` : theme.inputBg, 
                        borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                        border: selectedRoles.includes(r.key) ? `1px solid ${theme.primary}` : `1px solid transparent`
                      }}>
                        <input type="checkbox" checked={selectedRoles.includes(r.key)} onChange={e => {
                          setSelectedRoles(prev => e.target.checked ? [...prev, r.key] : prev.filter(k => k !== r.key));
                        }} style={{ width: '1.25rem', height: '1.25rem' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Grid Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div className="fi">
                    <label>{t.labels.name}</label>
                    <input name="fullName" required value={form.fullName} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="أدخل اسمك بالكامل" />
                  </div>
                  <div className="fi">
                    <label>{t.labels.email}</label>
                    <input type="email" name="email" required value={form.email} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="example@mail.com" />
                  </div>
                  <div className="fi">
                    <label>{t.labels.phone}</label>
                    <input name="phone" required value={form.phone} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="+2010xxxxxxx" />
                  </div>
                  <div className="fi">
                    <label>{t.labels.country}</label>
                    <input name="country" required value={form.country} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="الدولة الحالية" />
                  </div>
                </div>

                <div className="fi">
                  <label>{t.labels.exp}</label>
                  <textarea name="experience" required value={form.experience} onChange={handleChange} rows={5} style={{ background: theme.inputBg, color: theme.text }} placeholder="صف خبراتك السابقة بإيجاز..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div className="fi">
                    <label>{t.labels.linkedin}</label>
                    <input name="linkedin" value={form.linkedin} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="fi">
                    <label>{t.labels.facebook}</label>
                    <input name="facebook" value={form.facebook} onChange={handleChange} style={{ background: theme.inputBg, color: theme.text }} placeholder="رابط الملف الشخصي" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="tc" style={{ 
                  padding: '1.25rem', background: 'linear-gradient(135deg, #4f46e5, #080d20)', 
                  color: 'white', borderRadius: '16px', border: 'none', fontWeight: 900, 
                  cursor: 'pointer', fontSize: '1.2rem', marginTop: '1rem',
                  boxShadow: '0 10px 30px rgba(79,70,229,0.3)'
                }}>
                  {loading ? t.loadingBtn : t.submitBtn}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: dark ? '#080d20' : '#ffffff', padding: '5rem 0', borderTop: `1px solid ${theme.border}` }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
               <p style={{ color: theme.subText, marginBottom: '0.5rem' }}>{t.copyright}</p>
               <Link href="/" style={{ color: theme.primary, textDecoration: 'none', fontWeight: 700 }}>🏠 العودة للصفحة الرئيسية</Link>
            </div>
            <div className="hl" style={{ color: theme.primary, fontWeight: 900, fontSize: '1.1rem' }}>Mesk llc Qatar</div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .ct { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
        .hl { font-family: 'Space Grotesk', sans-serif; }
        .st { font-family: 'Space Grotesk', 'IBM Plex Sans Arabic', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; }
        .fi { display: flex; flex-direction: column; gap: 0.75rem; }
        .fi label { font-weight: 800; color: ${theme.text}; font-size: 0.95rem; }
        .fi input, .fi textarea { padding: 1.1rem; border-radius: 16px; border: 1px solid ${theme.border}; outline: none; transition: all 0.2s; font-family: inherit; font-size: 1rem; }
        .fi input:focus, .fi textarea:focus { border-color: ${theme.primary}; box-shadow: 0 0 0 4px ${theme.primary}15; }
        .tc { transition: all 0.3s ease; }
        .tc:hover { transform: translateY(-3px); filter: brightness(1.1); }
        @media(max-width: 768px) { 
            .ct { padding: 0 1.25rem; } 
            .apply-card { padding: 2rem 1.5rem !important; borderRadius: 24px !important; }
        }
      ` }} />
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div style={{ padding: '10rem', textAlign: 'center', background: '#080d20', color: 'white' }}>جاري التحميل...</div>}>
      <ApplyForm />
    </Suspense>
  );
}
