'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { LANGUAGES, D5, SupportedLang, getTranslation } from '@/lib/website-i18n';

// ─── Data Definitions ────────────────────────────────────────────────────────
interface OfficeCountry {
  id: string;
  hq?: number;
  ll: [number, number];
  p?: [number, number, number];
  x?: number;
  y?: number;
}

const COUNTRIES: OfficeCountry[] = [
  { id: 'qa', hq: 1, ll: [51.5, 25.3] },
  { id: 'eg', ll: [31.3, 30.1] },
  { id: 'sa', ll: [46.7, 24.7] },
  { id: 'ma', ll: [-6.85, 34] },
  { id: 'pt', ll: [-9.1, 38.7] },
  { id: 'es', ll: [-3.7, 40.4] },
  { id: 'sn', ll: [-17.45, 14.7] },
];

const COUNTRY_FLAGS: Record<string, string> = {
  qa: '/assets/img/flags/qa.png',
  eg: '/assets/img/flags/eg.png',
  sa: '/assets/img/flags/sa.png',
  ma: '/assets/img/flags/ma.png',
  pt: '/assets/img/flags/pt.png',
  es: '/assets/img/flags/es.png',
  sn: '/assets/img/flags/sn.png',
};

const SERVICES: [string, string, string[]][] = [
  ['v1', 'opps', ['s11', 's12', 's13']],
  ['v2', 'clubs', ['s21', 's22', 's23']],
  ['v3', 'academies', ['s31', 's32', 's33']],
  ['v4', 'coaches', ['s41', 's42', 's43']],
  ['v5', 'agents', ['s51', 's52', 's53']],
  ['v6', '', ['s61', 's62', 's63']],
  ['v7', '', ['s71', 's72', 'c3']],
  ['v8', '', ['s81', 's82', 's83']],
];

const CREST_PALETTES = [
  ['#161653', '#DB9B2C'],
  ['#0F723C', '#fff'],
  ['#DB9B2C', '#161653'],
  ['#8A1538', '#f3f1ef'],
  ['#0b6e99', '#f2c94c'],
  ['#c0392b', '#fff'],
  ['#2c3e50', '#e67e22'],
  ['#6c3483', '#f1c40f'],
];

const CREST_EMBLEMS = [
  (c: string) => `<polygon points="50,28 56,46 75,46 60,57 66,75 50,64 34,75 40,57 25,46 44,46" fill="${c}"/>`,
  (c: string) => `<rect x="18" y="52" width="64" height="12" fill="${c}"/><rect x="18" y="72" width="64" height="8" fill="${c}"/>`,
  (c: string) => `<path d="M20 70L50 34L80 70L68 70L50 48L32 70Z" fill="${c}"/>`,
  (c: string) => `<circle cx="50" cy="55" r="20" fill="none" stroke="${c}" stroke-width="7"/><circle cx="50" cy="55" r="6" fill="${c}"/>`,
  (c: string) => `<path d="M30 40L44 62L50 36L56 62L70 40L66 74L34 74Z" fill="${c}"/>`,
  (c: string) => `<path d="M55 26L34 58H50L44 84L68 50H52Z" fill="${c}"/>`,
  (c: string) => `<path d="M18 60Q34 40 50 60T82 60" fill="none" stroke="${c}" stroke-width="8"/><path d="M18 76Q34 56 50 76T82 76" fill="none" stroke="${c}" stroke-width="8"/>`,
];

const SOCIAL_LINKS = [
  { id: 'yt', name: 'YouTube', url: 'https://www.youtube.com/@el7lm25', color: '#FF0000' },
  { id: 'ig', name: 'Instagram', url: 'https://www.instagram.com/hagzzel7lm/', color: '#E4405F' },
  { id: 'fb', name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61577797509887', color: '#0866FF' },
  { id: 'tt', name: 'TikTok', url: 'https://www.tiktok.com/@meskel7lm', color: '#000000' },
  { id: 'li', name: 'LinkedIn', url: 'https://www.linkedin.com/showcase/el7lm', color: '#0A66C2' },
];

const PG_MAP: Record<string, string> = {
  opps: 'v1',
  clubs: 'v2',
  academies: 'v3',
  coaches: 'v4',
  agents: 'v5',
  about: 'pt_about',
  jobs: 'pt_jobs',
  privacy: 'pt_priv',
  terms: 'pt_terms',
};

// World map coastlines data for 3D Globe
const PG_DATA = [
  [[-168,66],[-156,71],[-125,70],[-95,68],[-82,68],[-65,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,31],[-80,26],[-82,28],[-90,30],[-97,27],[-97,22],[-91,19],[-87,21],[-88,16],[-83,15],[-83,10],[-77,8],[-80,7],[-85,10],[-92,14],[-105,20],[-110,24],[-112,29],[-117,32],[-121,35],[-124,40],[-124,47],[-130,54],[-140,60],[-152,59],[-165,55],[-158,58],[-165,62]],
  [[-73,78],[-60,82],[-30,83],[-18,78],[-20,70],[-40,65],[-48,61],[-54,67],[-58,75]],
  [[-77,8],[-72,12],[-62,10],[-52,5],[-50,0],[-44,-2],[-35,-5],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-39],[-65,-45],[-68,-52],[-70,-55],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0]],
  [[-9,37],[-9,43],[-2,44],[-4,48],[2,51],[8,54],[8,57],[5,58],[5,62],[14,67],[25,71],[31,70],[40,67],[44,68],[60,69],[70,73],[80,73],[100,77],[113,74],[130,71],[150,71],[170,70],[180,68],[180,65],[170,62],[160,61],[156,51],[150,59],[140,54],[135,44],[130,42],[129,35],[126,35],[122,40],[118,38],[122,31],[120,24],[110,21],[108,16],[109,11],[105,9],[100,13],[100,7],[103,1],[98,8],[98,16],[94,17],[92,22],[87,21],[80,15],[78,8],[73,18],[72,22],[68,24],[62,25],[57,26],[56,26],[51.5,24.5],[50,26],[48,30],[56,25],[58,23],[55,17],[44,12.5],[43,16],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[23,40],[22,37],[20,40],[19,42],[13,45],[18,40],[16,38],[12,42],[8,44],[3,43],[-1,38],[-5,36]],
  [[-17,21],[-17,14],[-12,8],[-8,4],[5,5],[9,4],[9,-1],[13,-6],[12,-17],[15,-27],[18,-34],[26,-34],[32,-28],[35,-22],[40,-15],[40,-10],[39,-5],[41,-2],[51,12],[43,12],[38,18],[33,28],[32,31],[25,32],[20,31],[10,34],[11,37],[0,36],[-6,36],[-10,30]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
  [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-35],[130,-32],[115,-34]],
  [[-5,50],[1,51],[2,53],[-2,56],[-5,58],[-6,56],[-3,54],[-5,52]],
  [[130,32],[136,34],[141,38],[142,45],[140,41],[135,36]],
  [[109,1],[117,7],[119,1],[116,-4],[110,-3]]
];

function isInsidePolygon(P: number[][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) {
      c = !c;
    }
  }
  return c;
}

const RAD = Math.PI / 180;
const LAND_POINTS: [number, number][] = [];
for (let la = -58; la <= 82; la += 2.4) {
  const st = Math.min(20, 2.4 / Math.max(0.1, Math.cos(la * RAD)));
  for (let lo = -180; lo < 180; lo += st) {
    for (let k = 0; k < PG_DATA.length; k++) {
      if (isInsidePolygon(PG_DATA[k], lo, la)) {
        LAND_POINTS.push([lo, la]);
        break;
      }
    }
  }
}

export default function HomePage() {
  // ─── State Management ───────────────────────────────────────────────────────
  const [lang, setLang] = useState<SupportedLang>('ar');
  const [langIndex, setLangIndex] = useState<number>(1);
  const [view, setView] = useState<'home' | 'offices' | 'page'>('home');
  const [subPageSlug, setSubPageSlug] = useState<string>('');
  const [preloaderDone, setPreloaderDone] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [videoPaused, setVideoPaused] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [selectedOffice, setSelectedOffice] = useState<OfficeCountry>(COUNTRIES[0]);
  const [openServiceIdx, setOpenServiceIdx] = useState<number | null>(null);
  const [headerDark, setHeaderDark] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeAnimRef = useRef<number | null>(null);

  // Translation helper
  const t = useCallback((k: string, fb?: string) => getTranslation(k, langIndex, fb), [langIndex]);

  // Initial load: language, hash, preloader timer
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mk_lang') as SupportedLang;
      if (saved && ['en', 'ar', 'fr', 'es', 'pt'].includes(saved)) {
        const idx = LANGUAGES.findIndex(l => l.code === saved);
        if (idx !== -1) {
          setLang(saved);
          setLangIndex(idx);
          document.documentElement.lang = saved;
          document.documentElement.dir = LANGUAGES[idx].dir;
        }
      } else {
        // Default Arabic
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
      }
    } catch {}

    const timer = setTimeout(() => {
      setPreloaderDone(true);
    }, 2400);

    // Popup timer
    const popTimer = setTimeout(() => {
      try {
        if (!sessionStorage.getItem('mk_pop')) {
          setShowPopup(true);
        }
      } catch {
        setShowPopup(true);
      }
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearTimeout(popTimer);
    };
  }, []);

  // Sync document title and html attributes on lang change
  useEffect(() => {
    document.title = t('ttl');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang, t]);

  // Hash Routing
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash;
    if (hash === '#offices') {
      setView('offices');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash.startsWith('#p/')) {
      const slug = hash.replace('#p/', '');
      setSubPageSlug(slug);
      setView('page');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setView('home');
      if (hash && hash !== '#home') {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  // Header background on scroll
  useEffect(() => {
    const onScroll = () => {
      if (view === 'page') {
        setHeaderDark(true);
      } else if (view === 'offices') {
        setHeaderDark(false);
      } else {
        setHeaderDark(window.scrollY > window.innerHeight * 0.7);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [view]);

  // Language switch handler
  const handleLangSelect = (newLang: SupportedLang) => {
    const idx = LANGUAGES.findIndex(l => l.code === newLang);
    if (idx !== -1) {
      setLang(newLang);
      setLangIndex(idx);
      try {
        localStorage.setItem('mk_lang', newLang);
      } catch {}
    }
  };

  // Video play/pause
  const toggleVideo = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setVideoPaused(false);
      } else {
        videoRef.current.pause();
        setVideoPaused(true);
      }
    }
  };

  // Dismiss popup
  const dismissPopup = () => {
    setShowPopup(false);
    try {
      sessionStorage.setItem('mk_pop', '1');
    } catch {}
  };

  // ─── 3D Globe Implementation ───────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'offices') {
      if (globeAnimRef.current) cancelAnimationFrame(globeAnimRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let l0 = -20;
    let p0 = 22;
    let targetL: number | null = null;
    let targetP = 0;
    let isAuto = true;
    let dragData: { x: number; y: number; l: number; p: number } | null = null;
    let movedDist = 0;
    let W = 0;
    let R = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = rect.width;
      canvas.width = W * dpr;
      canvas.height = W * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = W * 0.44;
    };
    resize();
    window.addEventListener('resize', resize);

    function project(lo: number, la: number): [number, number, number] {
      const a = (lo - l0) * RAD;
      const f = la * RAD;
      const q = p0 * RAD;
      const cf = Math.cos(f);
      const ca = Math.cos(a);
      return [
        cf * Math.sin(a),
        Math.cos(q) * Math.sin(f) - Math.sin(q) * cf * ca,
        Math.sin(q) * Math.sin(f) + Math.cos(q) * cf * ca,
      ];
    }

    function draw(ts: number) {
      if (!dragData) {
        if (targetL !== null) {
          const dl = ((targetL - l0 + 540) % 360) - 180;
          l0 += dl * 0.07;
          p0 += (targetP - p0) * 0.07;
          if (Math.abs(dl) < 0.05 && Math.abs(targetP - p0) < 0.05) {
            targetL = null;
          }
        } else if (isAuto) {
          l0 += 0.12;
        }
      }

      ctx.clearRect(0, 0, W, W);
      const c = W / 2;

      // Base sphere gradient
      const grad = ctx.createRadialGradient(c - R * 0.3, c - R * 0.35, R * 0.1, c, c, R);
      grad.addColorStop(0, '#2b2b8a');
      grad.addColorStop(1, '#0c0c3a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c, c, R, 0, 7);
      ctx.fill();

      ctx.strokeStyle = 'rgba(219,155,44,.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Land dots
      for (let i = 0; i < LAND_POINTS.length; i++) {
        const pt = project(LAND_POINTS[i][0], LAND_POINTS[i][1]);
        if (pt[2] > 0) {
          ctx.fillStyle = `rgba(243,241,239,${(0.15 + 0.6 * pt[2]).toFixed(2)})`;
          ctx.fillRect(c + R * pt[0] - 1, c - R * pt[1] - 1, 2, 2);
        }
      }

      // Office pins
      COUNTRIES.forEach(country => {
        const p = project(country.ll[0], country.ll[1]);
        country.p = p;
        if (p[2] <= 0.05) return;

        const x = c + R * p[0];
        const y = c - R * p[1];
        country.x = x;
        country.y = y;

        const isSel = selectedOffice.id === country.id;
        const wave = ((((ts / 1000 + country.ll[0] * 0.1) % 1.6) + 1.6) % 1.6) / 1.6;

        ctx.strokeStyle = `rgba(219,155,44,${((1 - wave) * 0.8).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5 + wave * 18, 0, 7);
        ctx.stroke();

        ctx.fillStyle = isSel ? '#fff' : '#DB9B2C';
        ctx.beginPath();
        ctx.arc(x, y, isSel ? 7 : 5, 0, 7);
        ctx.fill();

        if (isSel) {
          ctx.strokeStyle = '#DB9B2C';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 7);
          ctx.stroke();
        }
      });

      globeAnimRef.current = requestAnimationFrame(draw);
    }

    globeAnimRef.current = requestAnimationFrame(draw);

    function hit(e: PointerEvent): OfficeCountry | null {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let closest: OfficeCountry | null = null;
      let minD = 24;

      COUNTRIES.forEach(c => {
        if (c.p && c.p[2] > 0.05 && c.x !== undefined && c.y !== undefined) {
          const d = Math.hypot(c.x - x, c.y - y);
          if (d < minD) {
            minD = d;
            closest = c;
          }
        }
      });
      return closest;
    }

    const onPointerDown = (e: PointerEvent) => {
      dragData = { x: e.clientX, y: e.clientY, l: l0, p: p0 };
      movedDist = 0;
      targetL = null;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (dragData) {
        const dx = e.clientX - dragData.x;
        const dy = e.clientY - dragData.y;
        movedDist = Math.max(movedDist, Math.abs(dx) + Math.abs(dy));
        l0 = dragData.l - dx * 0.4;
        p0 = Math.max(-60, Math.min(60, dragData.p + dy * 0.3));
      } else {
        canvas.style.cursor = hit(e) ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (dragData && movedDist < 6) {
        const clicked = hit(e);
        if (clicked) {
          setSelectedOffice(clicked);
          isAuto = false;
          targetL = clicked.ll[0];
          targetP = Math.max(-40, Math.min(50, clicked.ll[1] * 0.8));
        }
      }
      dragData = null;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      if (globeAnimRef.current) cancelAnimationFrame(globeAnimRef.current);
    };
  }, [view, selectedOffice.id]);

  // Pick country from chip button
  const handlePickCountry = (c: OfficeCountry) => {
    setSelectedOffice(c);
  };

  const currentAddress = [t(`ci_${selectedOffice.id}`, ''), t(`ad_${selectedOffice.id}`, '')]
    .filter(Boolean)
    .join(lang === 'ar' ? '، ' : ', ') || t('addr_na');
  const currentPhone = selectedOffice.id === 'eg' ? '201017799580' : '97470542458';

  return (
    <div className={`el7lm-site ${preloaderDone ? 'go' : ''}`}>
      {/* ─── Inline SVG Sprite ──────────────────────────────────────────────── */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="i-wa" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52s.198-.298.298-.497c.099-.198.05-.371-.025-.52s-.669-1.612-.916-2.207c-.242-.579-.487-.5-.669-.51a13 13 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074s2.096 3.2 5.077 4.487c.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413s.248-1.289.173-1.413c-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
        </symbol>
        <symbol id="i-gp" viewBox="0 0 24 24">
          <path d="m22.018 13.298-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594M1.337.924a1.5 1.5 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087zm12.207 10.065 3.258-3.238L3.45.195a1.47 1.47 0 0 0-.946-.179zm0 2.067-11 10.933c.298.036.612-.016.906-.183l13.324-7.54z" />
        </symbol>
        <symbol id="i-ap" viewBox="0 0 24 24">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </symbol>
        <symbol id="i-yt" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z" />
        </symbol>
        <symbol id="i-ig" viewBox="0 0 24 24">
          <path d="M7.03.084c-1.277.06-2.149.264-2.91.563a5.9 5.9 0 0 0-2.124 1.388 5.9 5.9 0 0 0-1.38 2.127C.321 4.926.12 5.8.064 7.076s-.069 1.688-.063 4.947.021 3.667.083 4.947c.061 1.277.264 2.149.563 2.911.308.789.72 1.457 1.388 2.123a5.9 5.9 0 0 0 2.129 1.38c.763.295 1.636.496 2.913.552 1.278.056 1.689.069 4.947.063s3.668-.021 4.947-.082c1.28-.06 2.147-.265 2.91-.563a5.9 5.9 0 0 0 2.123-1.388 5.9 5.9 0 0 0 1.38-2.129c.295-.763.496-1.636.551-2.912.056-1.28.07-1.69.063-4.948-.006-3.258-.02-3.667-.081-4.947-.06-1.28-.264-2.148-.564-2.911a5.9 5.9 0 0 0-1.387-2.123 5.86 5.86 0 0 0-2.128-1.38C19.074.322 18.202.12 16.924.066 15.647.009 15.236-.006 11.977 0S8.31.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408a3.7 3.7 0 0 1-1.382-.895 3.7 3.7 0 0 1-.9-1.378c-.165-.423-.363-1.058-.417-2.228-.06-1.264-.072-1.644-.08-4.848-.006-3.204.006-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.477-.96.895-1.382a3.7 3.7 0 0 1 1.379-.9c.423-.165 1.057-.361 2.227-.417 1.265-.06 1.644-.072 4.848-.08 3.203-.006 3.583.006 4.85.062 1.168.05 1.804.244 2.227.408.56.216.96.475 1.382.895s.681.817.9 1.378c.165.422.362 1.056.417 2.227.06 1.265.074 1.645.08 4.848.005 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.805-.408 2.23-.216.56-.477.96-.896 1.38a3.7 3.7 0 0 1-1.378.9c-.422.165-1.058.362-2.226.418-1.266.06-1.645.072-4.85.079s-3.582-.006-4.848-.06m9.783-16.192a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012a6.161 6.161 0 1 0 12.323-.024 6.162 6.162 0 0 0-12.323.024M8 12.008A4 4 0 1 1 12.008 16 4 4 0 0 1 8 12.008" />
        </symbol>
        <symbol id="i-fb" viewBox="0 0 24 24">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a9 9 0 0 1 1.141.195v3.325a9 9 0 0 0-.653-.036 27 27 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.7 1.7 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647" />
        </symbol>
        <symbol id="i-tt" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07" />
        </symbol>
        <symbol id="i-li" viewBox="0 0 448 512">
          <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3M135.4 416H69V202.2h66.5V416zM102.2 96a38.5 38.5 0 1 1 0 77 38.5 38.5 0 1 1 0-77m282.1 320h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9z" />
        </symbol>
      </svg>

      {/* ─── Preloader ──────────────────────────────────────────────────────── */}
      <div id="pre" className={preloaderDone ? 'out' : ''}>
        <div id="grid">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="c"
              style={{
                ['--k' as any]: ['#fff', '#DB9B2C', '#0F723C', '#fff'][i % 4],
                ['--o' as any]: (0.15 + (i % 5) * 0.1).toFixed(2),
                ['--d' as any]: (1.2 + (i % 3) * 0.6).toFixed(1) + 's',
                animationDelay: `-${(i % 4) * 0.7}s`,
              }}
            />
          ))}
        </div>
        <div className="badge">
          <img src="/assets/img/logo-emblem.png" alt="El7lm Logo" />
        </div>
      </div>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header id="hd" className={`${headerDark ? 'dk' : ''} ${mobileMenuOpen ? 'mo' : ''}`}>
        <a className="logo" href="#home" onClick={() => setView('home')}>
          <span className="lm">
            <img src="/assets/img/logo-emblem.png" alt="Logo" />
          </span>
          <span>{t('br')}</span>
        </a>

        <button
          id="mb"
          aria-label={t('mn')}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span />
          <span />
        </button>

        <nav id="nv" className={mobileMenuOpen ? 'open' : ''}>
          <a
            href="#svc"
            onClick={() => {
              setView('home');
              setMobileMenuOpen(false);
            }}
          >
            {t('n_svc')}
          </a>
          <a
            href="#nasr"
            onClick={() => {
              setView('home');
              setMobileMenuOpen(false);
            }}
          >
            {t('n_nasr')}
          </a>
          <a
            href="#offices"
            onClick={() => {
              setView('offices');
              setMobileMenuOpen(false);
            }}
          >
            {t('n_off')}
          </a>
          <a
            href="#ct"
            onClick={() => {
              setView('home');
              setMobileMenuOpen(false);
            }}
          >
            {t('n_ct')}
          </a>

          {/* Quick Platform Sign In link */}
          <Link
            href="/login"
            className="pill"
            style={{ padding: '0.4rem 1.1rem', fontSize: '0.9rem' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('n_login')}
          </Link>

          {/* Language Switcher */}
          <select
            id="lgs"
            value={lang}
            onChange={(e) => handleLangSelect(e.target.value as SupportedLang)}
            aria-label="Language"
          >
            {LANGUAGES.map(item => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </nav>
      </header>

      {/* ─── View 1: Home ───────────────────────────────────────────────────── */}
      {view === 'home' && (
        <main id="home">
          {/* Hero */}
          <div className="hero">
            <video
              ref={videoRef}
              className="hv"
              id="hv"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/img/hero-poster.jpg"
              aria-hidden="true"
            >
              <source src="/assets/video/hero.mp4" type="video/mp4" />
            </video>
            <div className="hs" />
            <button className="pv" id="pv" onClick={toggleVideo} aria-label={videoPaused ? t('pv_r') : t('pv_p')}>
              {videoPaused ? '▶' : '❚❚'}
            </button>

            <h1>
              <span><i>{t('h1a')}</i></span>
              <span><i>{t('h1b')}</i></span>
            </h1>

            <div className="row">
              <a className="pill" href="#nasr">
                {t('h_cta')}
              </a>
              <span className="tag">{t('h_tag')}</span>
            </div>
          </div>

          {/* Services Section */}
          <section id="svc">
            <div className="lbl">{t('s_lbl')}</div>
            <h2>{t('s_h')}</h2>
            <p className="intro">{t('s_p')}</p>

            <div className="svc" id="list">
              {SERVICES.map(([key, slug, subKeys], idx) => {
                const title = t(key);
                const isOpen = openServiceIdx === idx;
                return (
                  <div key={key} className={`rw ${isOpen ? 'open' : ''}`}>
                    <div
                      className="cap"
                      onClick={() => setOpenServiceIdx(isOpen ? null : idx)}
                    >
                      <span>{title}</span>
                      <div className="bar">
                        <div className="trk">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <b key={i}>{title}</b>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="sub">
                      <div className="subi">
                        <ul>
                          {subKeys.map(k => (
                            <li key={k}>{t(k)}</li>
                          ))}
                        </ul>
                        {slug && (
                          <a
                            className="more"
                            href={`#p/${slug}`}
                            onClick={() => {
                              setSubPageSlug(slug);
                              setView('page');
                            }}
                          >
                            {t('more')}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Nisr Assistant Section */}
          <section id="nasr">
            <div className="two">
              <div>
                <div className="lbl">{t('na_lbl')}</div>
                <h2>{t('na_h')}</h2>
                <p className="intro">{t('na_p')}</p>

                <div className="chips">
                  <span>{t('c1')}</span>
                  <span>{t('c2')}</span>
                  <span>{t('c3')}</span>
                </div>

                <div className="lbl" style={{ marginTop: '2rem' }}>
                  {t('na_l')}
                </div>
                <div className="chips">
                  <span>العربية</span>
                  <span>English</span>
                  <span>Français</span>
                  <span>Español</span>
                  <span>Português</span>
                </div>

                <div className="lbl" style={{ marginTop: '2rem' }}>
                  {t('na_d')}
                </div>
                <div className="stores">
                  <a
                    className="st"
                    href="https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="ic"><use href="#i-gp" /></svg>
                    <span>
                      <small>GET IT ON</small>
                      <b>Google Play</b>
                    </span>
                  </a>

                  <span className="st" role="link" aria-disabled="true">
                    <svg className="ic"><use href="#i-ap" /></svg>
                    <span>
                      <small>Download on the</small>
                      <b>App Store</b>
                    </span>
                    <em className="hq">{t('soon')}</em>
                  </span>
                </div>
              </div>

              <div className="ph">
                <img src="/assets/img/nisr-app-screen.jpg" alt={t('app_alt')} />
              </div>
            </div>
          </section>

          {/* Partner Clubs */}
          <section id="partners">
            <div className="lbl">{t('p_lbl')}</div>
            <h2>{t('p_h')}</h2>
            <div className="lg" id="lg">
              {Array.from({ length: 8 }).map((_, k) => {
                const pair = CREST_PALETTES[k % CREST_PALETTES.length];
                const emblemFn = CREST_EMBLEMS[(k * 3) % CREST_EMBLEMS.length];
                const shape = k % 3 === 2
                  ? '<circle cx="50" cy="55" r="46"'
                  : '<path d="M8 8H92V58C92 84 68 98 50 106C32 98 8 84 8 58Z"';
                const svgMarkup = `<svg viewBox="0 0 100 110" width="96" height="106" role="img" aria-label="${t('crest_alt')}">${shape} fill="${pair[0]}" stroke="${pair[1]}" stroke-width="4"/>${emblemFn(pair[1])}</svg>`;
                return (
                  <div
                    key={k}
                    className="cr"
                    style={{ ['--i' as any]: k }}
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                );
              })}
            </div>
          </section>

          {/* Offices Teaser Section */}
          <section id="off">
            <div className="lbl">{t('o_lbl')}</div>
            <h2>{t('o_h')}</h2>
            <p className="intro">{t('o_p')}</p>
            <a
              className="pill"
              href="#offices"
              style={{ color: 'var(--ink)', borderColor: 'var(--ink)' }}
              onClick={() => setView('offices')}
            >
              {t('o_btn')}
            </a>
          </section>

          {/* FAQ Section */}
          <section className="faq" id="faq">
            <div className="lbl">{t('f_lbl')}</div>
            <h2>{t('f_h')}</h2>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <details key={i}>
                <summary>{t(`q${i}`)}</summary>
                <p>{t(`a${i}`)}</p>
              </details>
            ))}
          </section>
        </main>
      )}

      {/* ─── View 2: Offices (Globe 3D) ─────────────────────────────────────── */}
      {view === 'offices' && (
        <main id="offices">
          <section className="of">
            <div className="of2">
              <div>
                <div className="lbl">{t('o_lbl')}</div>
                <h2>{t('o_h')}</h2>
                <p className="intro">{t('of_p')}</p>

                {/* Country Chips */}
                <div className="chs" id="chs">
                  {COUNTRIES.map(country => (
                    <button
                      key={country.id}
                      className="ch"
                      aria-pressed={selectedOffice.id === country.id}
                      onClick={() => handlePickCountry(country)}
                    >
                      <img src={COUNTRY_FLAGS[country.id]} alt="" width={22} style={{ display: 'block', height: 'auto' }} />
                      {t(`c_${country.id}`)}
                    </button>
                  ))}
                </div>

                {/* Country Info Panel */}
                <div id="pn" className="pn" aria-live="polite">
                  <div>
                    <img src={COUNTRY_FLAGS[selectedOffice.id]} alt="" width={72} style={{ display: 'block', height: 'auto' }} />
                  </div>
                  <h3>
                    {t(`c_${selectedOffice.id}`)}
                    {selectedOffice.hq === 1 && <em className="hq" style={{ marginInlineStart: '0.6rem' }}>{t('hqtag')}</em>}
                  </h3>
                  <p>{currentAddress}</p>
                  <a className="pill" href={`tel:+${currentPhone}`} style={{ marginInlineEnd: '0.5rem' }}>
                    {t('call')}
                  </a>
                  <a className="pill" href={`https://wa.me/${currentPhone}`} target="_blank" rel="noopener noreferrer">
                    <svg className="ic"><use href="#i-wa" /></svg>
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* 3D Canvas Globe */}
              <canvas ref={canvasRef} id="gl" role="img" aria-label={t('gl_a')} />
            </div>
          </section>
        </main>
      )}

      {/* ─── View 3: Sub-page (#p/[slug]) ────────────────────────────────────── */}
      {view === 'page' && (
        <main id="page">
          <section className="pg">
            <div className="lbl" id="pl1">{t('pg_l')}</div>
            <h2 id="pt">{t(PG_MAP[subPageSlug] || 'pt_about')}</h2>
            <p className="intro" id="pb">
              {t(subPageSlug === 'privacy' || subPageSlug === 'terms' ? 'pb_legal' : `pb_${subPageSlug}`, t('pb_about'))}
            </p>
            <div>
              <a
                className="pill"
                href="https://wa.me/97470542458"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginInlineEnd: '0.6rem' }}
              >
                <svg className="ic"><use href="#i-wa" /></svg>
                {t('pg_c')}
              </a>
              <a
                className="pill"
                href="#home"
                onClick={() => setView('home')}
              >
                {t('pg_b')}
              </a>
            </div>
          </section>
        </main>
      )}

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer id="ct">
        <span className="big">{t('ft_big')}</span>

        <div className="fg">
          <div>
            <a className="logo flg" href="#home" onClick={() => setView('home')}>
              <span className="lm">
                <img src="/assets/img/logo-emblem.png" alt="Logo" />
              </span>
              <span>{t('br')}</span>
            </a>
            <p className="fd">{t('s_p')}</p>

            <div className="stores">
              <a
                className="st"
                href="https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="ic"><use href="#i-gp" /></svg>
                <span>
                  <small>GET IT ON</small>
                  <b>Google Play</b>
                </span>
              </a>
              <span className="st" role="link" aria-disabled="true">
                <svg className="ic"><use href="#i-ap" /></svg>
                <span>
                  <small>Download on the</small>
                  <b>App Store</b>
                </span>
                <em className="hq">{t('soon')}</em>
              </span>
            </div>

            <div className="soc" id="soc">
              {SOCIAL_LINKS.map(s => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                >
                  <svg className="ic" style={{ color: s.color }}><use href={`#i-${s.id}`} /></svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>{t('ft_h1')}</h4>
            <a href="#p/opps" onClick={() => { setSubPageSlug('opps'); setView('page'); }}>{t('v1')}</a>
            <a href="#p/clubs" onClick={() => { setSubPageSlug('clubs'); setView('page'); }}>{t('v2')}</a>
            <a href="#p/academies" onClick={() => { setSubPageSlug('academies'); setView('page'); }}>{t('v3')}</a>
            <a href="#p/coaches" onClick={() => { setSubPageSlug('coaches'); setView('page'); }}>{t('v4')}</a>
            <a href="#p/agents" onClick={() => { setSubPageSlug('agents'); setView('page'); }}>{t('v5')}</a>
          </div>

          <div>
            <h4>{t('ft_h2')}</h4>
            <a href="#p/about" onClick={() => { setSubPageSlug('about'); setView('page'); }}>{t('pt_about')}</a>
            <a href="#offices" onClick={() => setView('offices')}>{t('n_off')}</a>
            <a href="#p/jobs" onClick={() => { setSubPageSlug('jobs'); setView('page'); }}>{t('pt_jobs')}</a>
            <a href="#faq" onClick={() => setView('home')}>{t('ft_faq')}</a>
            <a href="#p/privacy" onClick={() => { setSubPageSlug('privacy'); setView('page'); }}>{t('pt_priv')}</a>
            <a href="#p/terms" onClick={() => { setSubPageSlug('terms'); setView('page'); }}>{t('pt_terms')}</a>
          </div>

          <div>
            <h4>{t('ft_h3')}</h4>
            <a className="pill g" href="https://wa.me/97470542458" target="_blank" rel="noopener noreferrer">
              <svg className="ic"><use href="#i-wa" /></svg>
              <span>{t('wa_q')}</span>
            </a>
            <small>{t('avail')}</small>

            <a className="pill" href="https://wa.me/201017799580" target="_blank" rel="noopener noreferrer">
              <svg className="ic"><use href="#i-wa" /></svg>
              <span>{t('wa_e')}</span>
            </a>
            <small>{t('avail')}</small>

            <a className="pill" href="tel:+97470542458">
              {t('sponsor')}
            </a>
            <a id="ml" href="mailto:info@el7lm.com" style={{ marginTop: '1rem', display: 'block', color: '#d8d4f5' }}>
              info@el7lm.com
            </a>
          </div>
        </div>

        <div className="fb">
          <span>{t('copy')}</span>
          <span>{t('lic')}</span>
        </div>
      </footer>

      {/* ─── Download Modal Popup ────────────────────────────────────────────── */}
      <div id="pop" className={showPopup ? 'show' : ''} role="dialog" aria-modal="true" aria-labelledby="pop-t">
        <div className="pd">
          <button className="px" id="px" onClick={dismissPopup} aria-label={t('pop_x')}>
            ×
          </button>
          <img className="pl" src="/assets/img/logo-emblem.png" alt="Logo" />
          <h3 id="pop-t">{t('pop_t')}</h3>
          <p>{t('pop_p')}</p>
          <div className="stores">
            <a
              className="st"
              href="https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="ic"><use href="#i-gp" /></svg>
              <span>
                <small>GET IT ON</small>
                <b>Google Play</b>
              </span>
            </a>
            <span className="st" role="link" aria-disabled="true">
              <svg className="ic"><use href="#i-ap" /></svg>
              <span>
                <small>Download on the</small>
                <b>App Store</b>
              </span>
              <em className="hq">{t('soon')}</em>
            </span>
          </div>
          <button className="pn2" id="pn2" onClick={dismissPopup}>
            {t('pop_n')}
          </button>
        </div>
      </div>
    </div>
  );
}
