'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createPortalClient } from '@/lib/tournament-portal/auth';
import { usePortalTheme } from '../../_components/PortalShell';
import { toast } from 'sonner';

type Photo   = { id: string; url: string; caption: string | null; uploaded_at: string };
type Sponsor = { id: string; name: string; logo_url: string | null; tier: string; website_url: string | null };

const TIERS: { id: string; label: string; color: string }[] = [
  { id: 'platinum', label: '💎 بلاتيني', color: '#e2e8f0' },
  { id: 'gold',     label: '🥇 ذهبي',    color: '#f59e0b' },
  { id: 'silver',   label: '🥈 فضي',     color: '#94a3b8' },
  { id: 'bronze',   label: '🥉 برونزي',  color: '#b45309' },
];

export default function GalleryPage() {
  const { id }     = useParams<{ id: string }>();
  const { isDark } = usePortalTheme();
  const S = isDark ? D : L;
  const supabase   = createPortalClient();

  const [tab,       setTab]       = useState<'photos' | 'sponsors'>('photos');
  const [photos,    setPhotos]    = useState<Photo[]>([]);
  const [sponsors,  setSponsors]  = useState<Sponsor[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox,  setLightbox]  = useState<string | null>(null);

  // Sponsor form
  const [sName, setSName] = useState('');
  const [sTier, setSTier] = useState('gold');
  const [sWeb,  setSWeb]  = useState('');
  const [sLogo, setSLogo] = useState('');
  const [showSponsorForm, setShowSponsorForm] = useState(false);

  const photoInput   = useRef<HTMLInputElement>(null);
  const sponsorInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [pRes, sRes] = await Promise.all([
        supabase.from('tournament_gallery').select('*').eq('tournament_id', id).order('uploaded_at', { ascending: false }),
        supabase.from('tournament_sponsors').select('*').eq('tournament_id', id).order('tier').order('name'),
      ]);
      setPhotos(pRes.data || []);
      setSponsors(sRes.data || []);
      setLoading(false);
    })();
  }, [id]);

  const uploadPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext  = file.name.split('.').pop();
        const path = `tournaments/${id}/gallery/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const form = new FormData();
        form.append('file', file);
        form.append('bucket', 'tournaments');
        form.append('path', path);
        const res  = await fetch('/api/storage/upload', { method: 'POST', body: form });
        const json = await res.json();
        if (!json.url) { toast.error('فشل رفع الصورة'); continue; }
        await supabase.from('tournament_gallery').insert({ tournament_id: id, url: json.url, caption: null });
      }
      const { data } = await supabase.from('tournament_gallery').select('*').eq('tournament_id', id).order('uploaded_at', { ascending: false });
      setPhotos(data || []);
      toast.success('تم رفع الصور');
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from('tournament_gallery').delete().eq('id', photoId);
    setPhotos(p => p.filter(x => x.id !== photoId));
    toast.success('تم الحذف');
  };

  const uploadSponsorLogo = async (file: File): Promise<string | null> => {
    const ext  = file.name.split('.').pop();
    const path = `tournaments/${id}/sponsors/${Date.now()}.${ext}`;
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', 'tournaments');
    form.append('path', path);
    const res  = await fetch('/api/storage/upload', { method: 'POST', body: form });
    const json = await res.json();
    return json.url || null;
  };

  const saveSponsor = async () => {
    if (!sName.trim()) { toast.error('أدخل اسم الراعي'); return; }
    const { data, error } = await supabase.from('tournament_sponsors').insert({ tournament_id: id, name: sName.trim(), logo_url: sLogo || null, tier: sTier, website_url: sWeb.trim() || null }).select().single();
    if (error) { toast.error(error.message); return; }
    setSponsors(s => [...s, data]);
    setSName(''); setSTier('gold'); setSWeb(''); setSLogo('');
    setShowSponsorForm(false);
    toast.success('تم إضافة الراعي');
  };

  const deleteSponsor = async (sId: string) => {
    await supabase.from('tournament_sponsors').delete().eq('id', sId);
    setSponsors(s => s.filter(x => x.id !== sId));
    toast.success('تم الحذف');
  };

  if (loading) return <Loader isDark={isDark} />;

  const platinums = sponsors.filter(s => s.tier === 'platinum');
  const golds     = sponsors.filter(s => s.tier === 'gold');
  const silvers   = sponsors.filter(s => s.tier === 'silver');
  const bronzes   = sponsors.filter(s => s.tier === 'bronze');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Tab bar */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '4px', display: 'flex', gap: 4 }}>
        {([['photos','🖼️ معرض الصور'],['sponsors','🤝 الرعاة']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s', background: tab === k ? '#d97706' : 'transparent', color: tab === k ? '#fff' : S.text2 }}>{lbl}</button>
        ))}
      </div>

      {/* PHOTOS tab */}
      {tab === 'photos' && (
        <>
          {/* Upload bar */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>رفع صور البطولة</div>
              <div style={{ fontSize: 12, color: S.text2, marginTop: 2 }}>يمكنك رفع عدة صور دفعة واحدة · JPG, PNG, WebP</div>
            </div>
            <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={e => e.target.files && uploadPhotos(e.target.files)} />
            <button onClick={() => photoInput.current?.click()} disabled={uploading} className="sp-btn sp-btn-primary sp-btn-sm">
              {uploading ? '⏳ جاري الرفع...' : '📤 رفع صور'}
            </button>
          </div>

          {/* Grid */}
          {photos.length === 0
            ? <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: S.text2, fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                <div>لا توجد صور بعد — ارفع أولى صور البطولة</div>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {photos.map(p => (
                  <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer', border: `1px solid ${S.border}` }} onClick={() => setLightbox(p.url)}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={e => { e.stopPropagation(); deletePhoto(p.id); }} style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                ))}
              </div>
          }
        </>
      )}

      {/* SPONSORS tab */}
      {tab === 'sponsors' && (
        <>
          {/* Add sponsor bar */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showSponsorForm ? 14 : 0 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: S.text }}>🤝 إضافة راعٍ جديد</div>
              <button onClick={() => setShowSponsorForm(f => !f)} className="sp-btn sp-btn-primary sp-btn-sm">
                {showSponsorForm ? '✕ إلغاء' : '+ إضافة راعٍ'}
              </button>
            </div>

            {showSponsorForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="sp-label">اسم الراعي *</label>
                    <input className="sp-input" value={sName} onChange={e => setSName(e.target.value)} placeholder="مثال: شركة الاتصالات" />
                  </div>
                  <div>
                    <label className="sp-label">الفئة</label>
                    <select className="sp-select" value={sTier} onChange={e => setSTier(e.target.value)}>
                      {TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="sp-label">الموقع الإلكتروني (اختياري)</label>
                  <input className="sp-input" value={sWeb} onChange={e => setSWeb(e.target.value)} placeholder="https://..." dir="ltr" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input ref={sponsorInput} type="file" accept="image/*" hidden onChange={async e => {
                    if (!e.target.files?.[0]) return;
                    const url = await uploadSponsorLogo(e.target.files[0]);
                    if (url) setSLogo(url);
                  }} />
                  <button onClick={() => sponsorInput.current?.click()} className="sp-btn sp-btn-ghost sp-btn-sm">📤 رفع شعار</button>
                  {sLogo && <img src={sLogo} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: `1px solid ${S.border}` }} />}
                  {sLogo && <button onClick={() => setSLogo('')} style={{ background: 'none', border: 'none', color: S.text2, cursor: 'pointer', fontSize: 12 }}>✕ إزالة الشعار</button>}
                </div>
                <button onClick={saveSponsor} className="sp-btn sp-btn-primary">💾 حفظ الراعي</button>
              </div>
            )}
          </div>

          {/* Sponsor tiers */}
          {sponsors.length === 0
            ? <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center', color: S.text2, fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                <div>لا يوجد رعاة بعد</div>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { tier: 'platinum', label: '💎 الرعاة البلاتينيون', items: platinums, color: '#e2e8f0', size: 90 },
                  { tier: 'gold',     label: '🥇 الرعاة الذهبيون',    items: golds,     color: '#f59e0b', size: 70 },
                  { tier: 'silver',   label: '🥈 الرعاة الفضيون',     items: silvers,   color: '#94a3b8', size: 56 },
                  { tier: 'bronze',   label: '🥉 الرعاة البرونزيون',  items: bronzes,   color: '#b45309', size: 44 },
                ].filter(tier => tier.items.length > 0).map(tier => (
                  <div key={tier.tier} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: tier.color, marginBottom: 12 }}>{tier.label}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {tier.items.map(sp => (
                        <div key={sp.id} style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 120, position: 'relative' }}>
                          <button onClick={() => deleteSponsor(sp.id)} style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', borderRadius: 5, width: 20, height: 20, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          {sp.logo_url
                            ? <img src={sp.logo_url} alt={sp.name} style={{ width: tier.size, height: tier.size * 0.6, objectFit: 'contain' }} />
                            : <div style={{ width: tier.size, height: tier.size * 0.6, background: S.surface, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: tier.size * 0.3, border: `1px dashed ${S.border}` }}>🏢</div>
                          }
                          <div style={{ fontSize: 12, fontWeight: 700, color: S.text, textAlign: 'center' }}>{sp.name}</div>
                          {sp.website_url && (
                            <a href={sp.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none' }}>🔗 الموقع</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
          }
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>✕ إغلاق</button>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12 }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function Loader({ isDark }: { isDark: boolean }) {
  return <div style={{ display:'flex',justifyContent:'center',padding:60 }}><div style={{ width:36,height:36,borderRadius:'50%',border:`3px solid ${isDark?'rgba(255,255,255,0.1)':'#e2e8f0'}`,borderTopColor:'#d97706',animation:'spin 0.7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

const D = { surface: '#131929', surface2: '#1a2235', border: 'rgba(255,255,255,0.07)', text: '#e8eaf0', text2: '#64748b' };
const L = { surface: '#ffffff', surface2: '#f8fafc', border: '#e2e8f0', text: '#0f172a', text2: '#64748b' };
