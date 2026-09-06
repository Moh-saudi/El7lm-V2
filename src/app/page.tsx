'use client';
import { useState, useEffect } from 'react';
import { getAds, AdItem } from '@/lib/content/ads-service';
import { getHomeImages, HomeImagesData } from '@/lib/content/home-images-service';
import { getPartners, PartnerItem } from '@/lib/content/partners-service';
import { getAiSection, AiSectionData } from '@/lib/content/ai-section-service';
import { getOppsSection, OppsSectionData } from '@/lib/content/opps-section-service';
import { getStoreSection, StoreSectionData } from '@/lib/content/store-section-service';
import { supabase } from '@/lib/supabase/config';
import { createClient } from '@supabase/supabase-js';
import { getExploreOpportunities } from '@/lib/firebase/opportunities';
import { Opportunity } from '@/types/opportunities';

import { useRouter } from 'next/navigation';
import { Target, Calendar, Eye, Home as HomeIcon, LayoutGrid, Cpu, MessageCircle, Info, Globe, ShoppingBag, CreditCard, WalletCards } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingDock } from "@/components/ui/floating-dock";
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import GooglePlayAppModal from '@/components/shared/GooglePlayAppModal';

type LandingStoreCategory =
  | 'equipment'
  | 'clothing'
  | 'accessories'
  | 'nutrition'
  | 'electronics'
  | 'other';

interface LandingStoreProduct {
  id: string;
  name: string;
  description: string;
  category: LandingStoreCategory;
  price: number;
  currency: string;
  brand?: string;
  model?: string;
  image?: string;
  images?: string[];
  stock: number;
  isAvailable: boolean;
  featured?: boolean;
}


const PLAYER_IMGS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkI3L0Mpa8_973I0Ox0HL-j62lTN_3ov_unRBls1Z1jaol8ZvAWESi9wE6sDsKK2wFg7mTnrLeyXGrnLsXPh0YBDuxjsIFSB9PSbv9sdSB4hSwtWkF6Ajv2wIjX4ST4dhI8oP0Ox03xJIMnAvhb8lsGtRMukryUyWDsVhxAlyFhR-PfoM9b2L48_6DCy5hvI7tE_InVXgrKUQO5BQ7I89AHeDG_i5WpV--EEDYYfxBfBnvVUJQWTYZc6TgI-7eTUDV3zEWT_D2dds',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB3ZDHDlZzwuUsxjVz7wq1t3xcQ9Xb5TbP3GUGsM0bXfZvCtkP1EzmxtKDQq74YF4aVjhhT6eWGkl-VxyrXs2DTyVOLrig7Fm-2kp_0WtuXBKTPyRQhfhJakA97kxzD1g9vh_auMsg0rluOCYjB6VD7o9vEn4MnrMq_F4D2uQQNLwyCRdHU_ZCAY-bMK1CgHfOdbDutBo7Jn_ryeBH4Xs_ubUFRUi0vRMinubLUYWQcOK-fd3NNWTIFTPXd45hhxeeiYk2POJCp00A',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC7pJ6T_fIPrBl66Do8SwqeB-Fx9cES7a71aJGZiyHbhp4mAd90TD9vogaKOwyeL5_SPf2RdnnIw73vCeFi1AWMfDioHk7UyaD3CJDroo9bPCSgqS5MfeXIt5IIYvpEFaEG3pc7GF2iEJE2GxkGRzp7Mi4U4SP5dHz02Di-073_IxIP6LRmUBx3y4gFplD2GQtjos7lwBoQ-sHB4_gwP04gqcgNTZd72LeWXj60MaWce2q-6RWuihXTyAhW_2Ef23GPBUfYVUc9vQA',
];
const TOUR_IMGS = [
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop', // Cairo Stadium View (Elite)
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop', // Football Turf/Action (Alamein)
  '/doha-medal.jpg'  // Doha Medal (Mesk El7lm)
];
const PLAYER_STATS = [
  [{l:'Pace',v:88},{l:'Shot',v:92},{l:'Pass',v:95}],
  [{l:'Pace',v:96},{l:'Shot',v:85},{l:'Drib',v:91}],
  [{l:'Pace',v:90},{l:'Shot',v:94},{l:'Phys',v:82}],
  [{l:'Def',v:93},{l:'Phys',v:95},{l:'Pass',v:84}],
];
const RATINGS = [94,89,91,87];
const PARTNERS = ['AL AHLI FC','ZAMALEK SC','PYRAMIDS FC','LIVERPOOL FC','NIKE FOOTBALL','ADIDAS','AL NASSR',
  'AL AHLI FC','ZAMALEK SC','PYRAMIDS FC','LIVERPOOL FC','NIKE FOOTBALL','ADIDAS','AL NASSR'];

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000', 
  'https://images.unsplash.com/photo-1511886929837-354d8276626d?auto=format&fit=crop&q=80&w=2000', 
  'https://images.unsplash.com/photo-1510051644266-b3b3c3c1be83?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1575361204480-aadea2d107ad?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=2000',
  'https://images.unsplash.com/photo-1431324155629-1a6eda1eedfa?auto=format&fit=crop&q=80&w=2000',
];

const PLAYER_MOCKUPS = [
  '/images/hero/hero_ai.png',
  '/images/hero/hero_action.png',
  '/images/hero/hero_signing.png',
];
 
const hov = (el: HTMLElement, on: Partial<CSSStyleDeclaration>, off: Partial<CSSStyleDeclaration>) => ({
  onMouseEnter: () => Object.assign(el.style, on),
  onMouseLeave: () => Object.assign(el.style, off),
});

// Auto-advance helper for ads carousel
function AutoAdvance({ intervalMs, onTick }: { intervalMs: number; onTick: () => void }) {
  useEffect(() => {
    const timer = setInterval(onTick, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, onTick]);
  return null;
}

export default function Home() {
  const { locale, isRTL, getTranslations } = useTranslation();
  const { copy: t, ui, extra } = getTranslations<any>('homePage');
  const [dark, setDark] = useState(false); 
  const [ads, setAds] = useState<AdItem[]>([]);
  const [homeImages, setHomeImages] = useState<HomeImagesData | null>(null);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [aiSection, setAiSection] = useState<AiSectionData | null>(null);
  const [oppsSection, setOppsSection] = useState<OppsSectionData | null>(null);
  const [storeSection, setStoreSection] = useState<StoreSectionData | null>(null);
  const [storeProducts, setStoreProducts] = useState<LandingStoreProduct[]>([]);
  const [storeCategoryFilter, setStoreCategoryFilter] = useState<'all' | LandingStoreCategory>('all');
  const [playersSection, setPlayersSection] = useState<any | null>(null);
  const [featuredPlayers, setFeaturedPlayers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [adSlide, setAdSlide] = useState(0);
  const [motivationIndex, setMotivationIndex] = useState(0);
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMotivationIndex((prev) => (prev + 1) % t.motivation.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [locale]);

  // Removed reveal observer logic for stability and immediate visibility
  useEffect(() => {
    getAds().then(data => setAds(data.filter(ad => ad.active)));
    getHomeImages().then(data => setHomeImages(data));
    getPartners().then(data => setPartners(data));
    getAiSection().then(data => setAiSection(data));
    getStoreSection().then(data => setStoreSection(data));

    const fetchData = async () => {
      try {
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(24);

        const normalizedProducts = (inventoryData || [])
          .map((item: any): LandingStoreProduct | null => {
            if (!item?.id || !item?.name) return null;

            const category = (
              ['equipment', 'clothing', 'accessories', 'nutrition', 'electronics', 'other'].includes(item.category || '')
                ? item.category
                : 'other'
            ) as LandingStoreCategory;

            const stock = Number(item.stock || 0);
            const images = Array.isArray(item.images)
              ? item.images.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
              : [];
            const primaryImage = item.image || images[0] || undefined;

            return {
              id: item.id,
              name: item.name,
              description:
                item.description ||
                extra.defaultProduct,
              category,
              price: Number(item.price || 0),
              currency: item.currency || 'SAR',
              brand: item.brand || undefined,
              model: item.model || undefined,
              image: primaryImage,
              images,
              stock,
              isAvailable: stock > 0 && item.status !== 'discontinued',
              featured: Boolean(item.featured),
            };
          })
          .filter((item): item is LandingStoreProduct => Boolean(item));

        setStoreProducts(normalizedProducts);

        const oppsConfig = await getOppsSection();
        setOppsSection(oppsConfig);

        const opps = await getExploreOpportunities();
        if (opps && oppsConfig.selectedOpportunityIds && oppsConfig.selectedOpportunityIds.length > 0) {
          const selectedOpps = opps.filter(o => oppsConfig.selectedOpportunityIds!.includes(o.id));
          setOpportunities(selectedOpps);
        } else if (opps && opps.length > 0) {
          setOpportunities(opps.slice(0, 4));
        }

        const { getPlayersSection } = await import('@/lib/content/players-section-service');
        const playersConfig = await getPlayersSection();
        setPlayersSection(playersConfig);

        if (playersConfig.selectedPlayerIds && playersConfig.selectedPlayerIds.length > 0) {
          const { supabase } = await import('@/lib/supabase/config');
          const { data: playersData } = await supabase.from('players').select('*').in('id', playersConfig.selectedPlayerIds);
          const { data: usersData } = await supabase.from('users').select('*').in('id', playersConfig.selectedPlayerIds);

          const playersMap = new Map<string, any>();
          (playersData || []).forEach(p => { if (!p.isDeleted) playersMap.set(p.id, p); });
          (usersData || []).forEach(p => { if (!p.isDeleted && !playersMap.has(p.id)) playersMap.set(p.id, p); });

          const finalFeatured = playersConfig.selectedPlayerIds
            .map((id: string) => playersMap.get(id))
            .filter(Boolean);

          setFeaturedPlayers(finalFeatured);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabaseAnon
      .from('tournament_new')
      .select('id,slug,name,status,type,city,logo_url,start_date,end_date,max_teams')
      .eq('is_public', true)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setLiveTournaments(data || []));
  }, []);

  const activeHeroImages = (homeImages?.heroImages && homeImages.heroImages.length > 0) ? homeImages.heroImages : HERO_IMAGES;
  const activeMockups = (homeImages?.heroMockups && homeImages.heroMockups.filter(Boolean).length > 0) ? homeImages.heroMockups.filter(Boolean) : PLAYER_MOCKUPS;
  const pImgs = homeImages?.playerImages || PLAYER_IMGS;
  const tImgs = homeImages?.tourImages || TOUR_IMGS;
  const hImg = activeHeroImages[motivationIndex % activeHeroImages.length];
  const hMockup = activeMockups[motivationIndex % activeMockups.length];
  const vBg = homeImages?.aboutVideoBg || "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ5x1hv6Yam_5ctQ4gx21HoD0cLmcyMGjnTG_mD1y2_udS_zdljaoqjjjXXShqMnicuomYEtzH3K_4y02JyBl-wCZSaJ2UvTGRZGt-0UwH76FMh2qFKUaltOd8j2sStd0KujZvsuPgNilFZW66OVgBolg29jtT9X-IldBUvMFme_xwhaB0olsmX7MqVc5OJuAGY1aCiY2VtNwLAbhTH1kvyHQJ0N7eelQPe3Pwgj0nJFQskg_GJun1toVf1az0XCvoig9hIrwUtvY";

  const defaultPartners = PARTNERS.map((name, i) => ({ id: String(i), name, logoUrl: '' }));
  const partnerList = partners.length > 0 ? partners : defaultPartners;
  const paddedList = [...partnerList, ...partnerList, ...partnerList, ...partnerList, ...partnerList];
  const duplicatedPartners = [...paddedList, ...paddedList];


  const theme = {
    bg: dark ? '#0d1225' : '#f8fafc',
    text: dark ? '#dde1fc' : '#1e293b',
    subText: dark ? '#c6c5cf' : '#64748b',
    navText: dark ? '#46464e' : '#94a3b8',
    cardBg: dark ? 'rgba(36,41,61,0.5)' : '#ffffff',
    border: dark ? 'rgba(70,70,78,.2)' : 'rgba(226,232,240,.8)',
    headerBg: dark ? 'rgba(13,18,37,0.92)' : 'rgba(255,255,255,0.92)',
    heroOverlay: dark ? 'linear-gradient(to top,#0d1225 30%,rgba(13,18,37,.6) 60%,transparent)' : 'linear-gradient(to top,#f8fafc 30%,rgba(248,250,252,.6) 60%,transparent)',
    panelBg: dark ? '#2f3448' : '#ffffff',
    glow: dark ? 'rgba(16,185,129,.2)' : 'rgba(16,185,129,.1)',
    overlay: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.3)',
    accent: '#10b981',
    primary: '#10b981',
    btnGradient: 'linear-gradient(135deg,#10b981,#059669)',
    btnText: '#ffffff'
  };

  const storeEnabled = storeSection?.isEnabled ?? true;
  const localeSuffix = { ar: 'Ar', en: 'En', es: 'Es', pt: 'Pt' }[locale] as 'Ar' | 'En' | 'Es' | 'Pt';
  const getLocalizedField = <T,>(source: Record<string, any> | null, field: string, fallback: T): T =>
    (source?.[`${field}${localeSuffix}`] || fallback) as T;
  const storeBadge = getLocalizedField(storeSection, 'badge', t.storeBadge);
  const storeTitle = getLocalizedField(storeSection, 'title', t.storeTitle);
  const storeSub = getLocalizedField(storeSection, 'sub', t.storeSub);
  const storeCta = getLocalizedField(storeSection, 'cta', t.storeCta);
  const storeSecondary = getLocalizedField(storeSection, 'secondary', t.storeSecondary);
  const storeHighlights = getLocalizedField(storeSection, 'highlights', t.storeHighlights as { title: string; desc: string }[]);
  const localizedAiSection = aiSection?.[locale];
  const configuredStoreProductIds = storeSection?.selectedProductIds || [];
  const storeItemsLimit = Math.max(1, Math.min(8, storeSection?.maxItems || 6));
  const storeCategoryLabels: Record<'all' | LandingStoreCategory, string> = {
    all: extra.categories[0], equipment: extra.categories[1], clothing: extra.categories[2],
    accessories: extra.categories[3], nutrition: extra.categories[4], electronics: extra.categories[5], other: extra.categories[6],
  };
  const availableStoreProducts = storeProducts.filter((product) => product.isAvailable);
  const featuredStoreProducts = availableStoreProducts.filter((product) => product.featured);
  const storeCategories = [
    'all',
    ...Array.from(new Set(availableStoreProducts.map((product) => product.category))),
  ] as Array<'all' | LandingStoreCategory>;
  const preferredStoreProducts =
    configuredStoreProductIds.length > 0
      ? configuredStoreProductIds
          .map((productId) => availableStoreProducts.find((product) => product.id === productId))
          .filter((product): product is LandingStoreProduct => Boolean(product))
      : featuredStoreProducts.length > 0
        ? featuredStoreProducts
        : availableStoreProducts;
  const visibleStoreProducts = (
    storeCategoryFilter === 'all'
      ? preferredStoreProducts
      : preferredStoreProducts.filter((product) => product.category === storeCategoryFilter)
  ).slice(0, storeItemsLimit);
  const formatLandingStorePrice = (amount: number, currency: string) =>
    new Intl.NumberFormat({ ar: 'ar-QA', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' }[locale], {
      style: 'currency',
      currency: currency || 'SAR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  const landingNavItems = ['#top','#features','#partners','#opportunities','#store','#tournaments','#contact']
    .map((href, index) => ({ label: extra.nav[index], href }));

  return (
    <div id="top" dir={t.dir} lang={t.lang}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter','IBM Plex Sans Arabic',sans-serif;background:${theme.bg};color:${theme.text};overflow-x:hidden;transition:background 0.3s, color 0.3s}
        .hl{font-family:'Space Grotesk','IBM Plex Sans Arabic',sans-serif}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;display:inline-block;line-height:1;text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;direction:ltr}
        .gp{background:rgba(47,52,72,0.4);backdrop-filter:blur(20px)}
        @keyframes scroll-left{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}
        @keyframes scroll-right{0%{transform:translate3d(-50%,0,0)}100%{transform:translate3d(0,0,0)}}
        .scroll-left{display:flex!important;width:max-content;flex-shrink:0;animation:scroll-left 30s linear infinite}
        .scroll-right{display:flex!important;width:max-content;flex-shrink:0;animation:scroll-right 30s linear infinite}
        @keyframes pulse{50%{opacity:.5}}.ap{animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite}
        .fm{-webkit-mask-image:linear-gradient(to right,transparent,black 10%,black 90%,transparent);mask-image:linear-gradient(to right,transparent,black 10%,black 90%,transparent)}
        .ad-card-v2:hover img { transform: scale(1.08); }
        .ad-card-v2:hover { transform: translateY(-8px); box-shadow: 0 25px 60px rgba(0,0,0,0.2) !important; border-color: ${theme.primary} !important; }
        .tc, .tc2, .tc3, .tc4, .tc5, .tc6, .tc7 { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .inp{background:#161b2e;border:1px solid rgba(70,70,78,.3);border-radius:2px;padding:1rem;color:#dde1fc;width:100%;font-size:1rem;outline:none;text-align:${isRTL?'right':'left'}}
        .inp:focus{border-color:${theme.primary};box-shadow: 0 0 0 4px ${theme.glow}}
        section{padding:6rem 0; background: ${theme.bg}; color: ${theme.text}; transition: background 0.3s, color 0.3s;}
        .ct{max-width:1280px;margin:0 auto;padding:0 2rem}
        .st{font-family:'Space Grotesk','IBM Plex Sans Arabic',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em}
        .wa{position:fixed;bottom:1.5rem;${isRTL?'left':'right'}:1.5rem;z-index:100;background:#25D366;color:white;border-radius:50%;width:3.5rem;height:3.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.4);text-decoration:none}
        .partner-item{height:100px;min-width:180px;object-fit:contain;border-radius:24px;background:${dark?'rgba(255,255,255,0.03)':'#ffffff'};border:1px solid ${theme.border};transition:all 0.3s}
        .modal-overlay { backdrop-filter: blur(8px); animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-content { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .reveal { opacity: 1; transform: none; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .floating { animation: float 6s ease-in-out infinite; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1.2fr; width: 100%; max-width: 800px; border-radius: 24px; overflow: hidden; position: relative; }
        .modal-image-area { height: 500px; position: relative; }
        @media(max-width: 900px) {
          .g2, .g3, .g4, .fc { grid-template-columns: 1fr 1fr !important; }
          .htxt { font-size: 3rem !important; }
          .partner-item { height: 60px !important; min-width: 120px !important; }
          .modal-grid { grid-template-columns: 1fr; max-height: 90vh; overflow-y: auto; }
          .modal-image-area { height: 250px; }
          .hm { display: none !important; }
        }
        @media(max-width:640px){
          .g2, .g3, .g4, .fc{grid-template-columns:1fr!important}
          .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; text-align: center !important; margin-top: 1rem !important; }
          .hero-grid > div { text-align: center !important; margin: 0 auto !important; }
          .hero-badge-mob { justify-content: center !important; margin-bottom: 1rem !important; }
          .htxt { height: auto !important; font-size: 2.5rem !important; line-height: 1.3 !important; }
          .hero-desc-mob { margin: 0 auto 2rem auto !important; font-size: 1.1rem !important; }
          .hero-btns-mob { justify-content: center !important; flex-wrap: wrap !important; }
          .hero-img-mob { display: block !important; order: -1 !important; margin-bottom: 2.5rem !important; transform: scale(0.9); }
          .ct{padding:0 1rem}
          .st{font-size:1.75rem!important}
          section{padding:3rem 0}
          .htxt{font-size:2rem!important}
          .founder-card{padding:2rem 1.5rem!important; border-radius:32px!important}
          .founder-img{width:100%!important; height:auto!important; aspect-ratio:4/5!important; max-width:280px!important}
          .partner-card { height: 60px !important; min-width: 130px !important; padding: 0.5rem 1rem !important; border-radius: 12px !important; }
          .partner-logo { height: 32px !important; }
          .scroll-left { gap: 1.5rem !important; }
          
          /* Mobile specific adjustments */
          .circular-process-wrapper { max-width: 100% !important; height: auto !important; margin: 3rem auto !important; display: flex !important; flex-direction: column !important; gap: 2rem !important; }
          .orbit-card { position: relative !important; width: 100% !important; max-width: 340px !important; transform: none !important; margin: 0 auto !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; }
          .orbit-center, .how-svg-ring { display: none !important; }
          .partner-card { min-width: 120px !important; }
          .partner-logo { height: 35px !important; }
          .card-pos-0 { top: -20px !important; }
          .card-pos-1 { right: -30px !important; }
          .card-pos-2 { bottom: -20px !important; }
          .card-pos-3 { left: -30px !important; }
        }
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .partner-track { 
          display: flex;
          width: max-content;
          animation: marquee-scroll 30s linear infinite;
          gap: 2rem;
          align-items: center;
        }
        .partner-track:hover { animation-play-state: paused; }
        .partner-card { 
          flex-shrink: 0;
          height: 120px; 
          min-width: 260px;
          max-width: 300px;
          padding: 1.25rem 2.25rem; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: ${dark ? 'rgba(255,255,255,0.05)' : '#ffffff'};
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          border-radius: 20px;
          border: 1px solid ${theme.border};
          transition: all 0.3s ease;
          cursor: default;
        }
        .partner-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 36px rgba(16,185,129,0.18);
          border-color: ${theme.primary}55;
        }
        .partner-logo { 
          height: 60px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          filter: ${dark ? 'brightness(1.3) grayscale(0.2)' : 'grayscale(0.3) opacity(0.85)'};
          transition: filter 0.3s;
        }
        .partner-card:hover .partner-logo {
          filter: none;
        }
        .partner-name-text {
          font-weight: 900;
          font-size: 1rem;
          color: ${theme.subText};
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
          transition: color 0.3s;
        }
        .partner-card:hover .partner-name-text {
          color: ${theme.primary};
        }
        @media(max-width: 900px) {
          .partner-card { height: 90px !important; min-width: 180px !important; padding: 1rem 1.5rem !important; border-radius: 14px !important; }
          .partner-logo { height: 44px !important; max-width: 150px !important; }
          .partner-name-text { font-size: 0.85rem !important; }
          .partner-track { gap: 1.5rem !important; animation-duration: 25s !important; }
        }
        @media(max-width: 640px) {
          .partner-card { height: 70px !important; min-width: 140px !important; padding: 0.75rem 1.25rem !important; border-radius: 12px !important; }
          .partner-logo { height: 34px !important; max-width: 110px !important; }
          .partner-name-text { font-size: 0.75rem !important; }
          .partner-track { gap: 1.25rem !important; animation-duration: 20s !important; }
        }
        .reveal{opacity:1;transform:none}
      `} </style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Space+Grotesk:wght@300;500;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

      {/* HEADER */}
      <header style={{position:'fixed',top:0,left:0,width:'100%',zIndex:200,display:'flex',justifyContent:'space-between',alignItems:'center',padding: scrolled ? '0 2rem' : '0 3rem',height: scrolled ? '4rem' : '6rem',background:theme.headerBg,backdropFilter:'blur(24px)',borderBottom: scrolled ? `1px solid ${theme.border}` : '1px solid transparent',transition:'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'3rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            {/* Logo Image */}
            <div style={{height: scrolled ? '2.5rem' : '2.8rem', width: scrolled ? '2.5rem' : '2.8rem', position:'relative', transition: 'all 0.4s'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/el7lm-logo.png" alt="Logo" style={{width:'100%',height:'100%',objectFit:'contain'}} 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuDYisGk25r4m6K2o21yV3_S9X_X4X-Xo_LzWkP6_A2h9S-k4r5M6z7_N8W9X0"; // Fallback URL
                }}/>
            </div>
            
          </div>
          <nav className="hm" style={{display:'flex',gap:'2rem'}}>
            {landingNavItems.map((item,i)=>(
              <a key={item.href} href={item.href} className="hl" style={{fontWeight:700,textTransform:isRTL?'none':'uppercase',letterSpacing:isRTL?'0':'-0.025em',textDecoration:'none',color:i===0?(dark?'#bdc4ef':'#4f46e5'):theme.subText,borderBottom:i===0?`2px solid ${dark?'#bdc4ef':'#4f46e5'}`:'none',paddingBottom:i===0?'2px':'0',transition:'color .2s'}}
                onMouseEnter={e=>{if(i!==0)(e.currentTarget as HTMLAnchorElement).style.color=(dark?'#bdc4ef':'#4f46e5')}}
                onMouseLeave={e=>{if(i!==0)(e.currentTarget as HTMLAnchorElement).style.color=theme.subText}}>{item.label}</a>
            ))}
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
          <LanguageSwitcher />
          <div style={{display:'flex',alignItems:'center',gap:'.5rem',color:theme.text,borderRight:`1px solid ${theme.border}`,paddingRight:'1rem',marginRight:'.5rem',direction:'ltr'}}>
            {/* Theme Toggle */}
            <span onClick={()=>setDark(!dark)} className="tc" style={{cursor:'pointer',padding:'.5rem',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=dark?'rgba(189,196,239,.1)':'rgba(0,0,0,.05)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
              {dark ? 
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                : 
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              }
            </span>
            {/* Notification SVG */}
            <span className="tc hm" style={{cursor:'pointer',padding:'.5rem',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=dark?'rgba(189,196,239,.1)':'rgba(0,0,0,.05)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </span>
            {/* User Account SVG */}
            <span className="tc hm" style={{cursor:'pointer',padding:'.5rem',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=dark?'rgba(189,196,239,.1)':'rgba(0,0,0,.05)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </span>
          </div>
          <a href="/auth/register" className="hl hm" style={{padding:'.5rem 1.5rem',borderRadius:'2px',background: theme.btnGradient,color: theme.btnText,fontWeight:900,fontSize:'.875rem',textDecoration:'none',transition:'filter .2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.filter='brightness(1.1)'}
            onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.filter='none'}>{t.joinBtn}</a>
        </div>
      </header>

      <main style={{paddingTop:'5rem'}}>
        {/* HERO */}
        <section id="hero" className="reveal" style={{minHeight:'90vh',display:'flex',alignItems:'center',overflow:'hidden',position:'relative',padding:0}}>
          <div style={{position:'absolute',inset:0,zIndex:0}}>
            <AnimatePresence mode="wait">
              <motion.img 
                key={motivationIndex % HERO_IMAGES.length}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                src={hImg} 
                alt="soccer-background" 
                style={{width:'100%',height:'100%',objectFit:'cover',opacity: dark ? .3 : .15}}
              />
            </AnimatePresence>
            <div style={{position:'absolute',inset:0,background: theme.heroOverlay}}></div>
          </div>
          <div className="ct hero-grid" style={{position:'relative',zIndex:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3rem',alignItems:'center'}}>
            <div style={{textAlign:isRTL?'right':'left',order:isRTL?1:2}}>
              <div className="hero-badge-mob" style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem', justifyContent: isRTL ? 'flex-start' : 'flex-start', flexDirection: isRTL ? 'row' : 'row'}}>
                <span className={`ap hl`} style={{display:'inline-flex', alignItems:'center', gap:'0.5rem', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', backdropFilter:'blur(12px)', border: `1px solid ${theme.border}`, color: theme.text, padding:'.4rem 1.25rem',borderRadius:'9999px',fontSize:'.875rem',fontWeight:800,letterSpacing:isRTL?'0':'.1em',textTransform:'uppercase'}}>
                  <img src="/el7lm-logo.png" alt="Logo" className="logo-16" style={{width:'16px', height:'16px', objectFit:'contain', filter: dark ? 'brightness(2)' : 'none'}} />
                  {t.badge}
                </span>
              </div>
              <h1 className="hl htxt" style={{fontSize:'5rem',fontWeight:900,lineHeight:1.1,marginBottom:'1.5rem',color: theme.text, height: '11.5rem', overflow:'hidden', position: 'relative'}}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={motivationIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{ position: 'absolute', width: '100%' }}
                  >
                    {t.motivation[motivationIndex].a}<br/>
                    <span style={{color:'#bdc4ef',fontStyle:'italic', display:'inline-block'}}>{t.motivation[motivationIndex].b}</span>
                  </motion.div>
                </AnimatePresence>
              </h1>
              <p className="hero-desc-mob" style={{fontSize:'1.25rem',color: theme.subText,maxWidth:'36rem',marginLeft:isRTL?'auto':'0',marginRight:isRTL?'0':'auto',marginBottom:'2.5rem',lineHeight:1.625}}>{t.heroSub}</p>
              <div className="hero-btns-mob" style={{display:'flex',flexDirection:isRTL?'row-reverse':'row',gap:'1rem'}}>
                <a href="/auth/register" className="hl" style={{padding:'1.25rem 3rem',borderRadius:'2px',background: theme.btnGradient,color: theme.btnText,fontWeight:900,fontSize:'1.25rem',textDecoration:'none',display:'inline-block',transition:'filter .2s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.filter='brightness(1.1)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.filter='none'}>{t.startFree}</a>
                <a href="/auth/login" className="hl" style={{padding:'1.25rem 3rem',borderRadius:'2px',background:'transparent',border:`1px solid ${theme.primary}`,color: theme.primary,fontWeight:700,fontSize:'1.25rem',textDecoration:'none',display:'inline-block',transition:'background .2s'}}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement; el.style.background=theme.primary; el.style.color=theme.btnText;}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement; el.style.background='transparent'; el.style.color=theme.primary;}}>{t.login}</a>
              </div>
            </div>

            <div className="hero-img-mob" style={{position:'relative',order:isRTL?2:1}}>
              <div style={{position:'absolute',inset:'-2.5rem',background: theme.glow,filter:'blur(100px)',borderRadius:'50%'}}></div>
              <div style={{position:'relative', transform:'rotate(2deg)'}}>
                <div className="gp tc7" style={{borderRadius:'8px',padding:0,border:'1px solid rgba(70,70,78,.3)',position:'relative',overflow:'hidden', maxWidth: '380px', margin: '0 auto'}}>
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={motivationIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      src={hMockup} 
                      alt="player" 
                      style={{width:'100%', height:'auto', display:'block', objectFit: 'cover', minHeight: '480px'}}
                    />
                  </AnimatePresence>
                </div>
                
                {/* Floating Performance Panel - Outside the clipped container */}
                <div style={{position:'absolute',bottom:'-2rem',left:'-2rem',background: theme.panelBg,padding:'1.25rem 1.5rem',borderRadius:'12px',border:`1px solid ${theme.border}`,backdropFilter:'blur(16px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 12}}>
                  <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                    <div style={{width:'3rem',height:'3rem',borderRadius:'50%',background: theme.primary,display:'flex',alignItems:'center',justifyContent:'center',color: theme.btnText, boxShadow: `0 0 20px ${theme.primary}44`}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                    </div>
                    <div style={{minWidth: '140px'}}>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={motivationIndex % t.stats.length}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p style={{fontSize:'9px',color: theme.subText,fontWeight:800,textTransform:'uppercase', letterSpacing: '0.05em', marginBottom: '4px'}}>
                            {t.stats[motivationIndex % t.stats.length].label}
                          </p>
                          <p className="hl" style={{fontSize:'1.5rem',fontWeight:900,color: theme.primary,lineHeight:1}}>
                            {t.stats[motivationIndex % t.stats.length].value}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>




        {/* PARTNERS */}
        <section id="partners" className="reveal" style={{padding:'3.5rem 0',background: dark ? '#0a1025' : '#f8fafc',borderTop:`1px solid ${theme.border}`,borderBottom:`1px solid ${theme.border}`,overflow:'hidden'}}>
          {/* Section Header */}
          <div className="ct" style={{marginBottom:'2.5rem', textAlign:'center'}}>
            <span style={{
              display: 'inline-block',
              background: `${theme.primary}15`,
              color: theme.primary,
              padding: '0.3rem 1.2rem',
              borderRadius: '50px',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '0.75rem'
            }}> {ui.partners}</span>
            <h2 className="hl" style={{fontSize:'clamp(1.4rem, 3vw, 2.2rem)', fontWeight:900, color: theme.text, margin:0}}>
              {t.partnerLabel}
            </h2>
          </div>

          {/* Marquee wrapper  faded edges */}
          <div style={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            direction: 'ltr',
            maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)'
          }}>
            <div className="partner-track">
              {/* Double the list for seamless loop */}
              {[...(partners.length > 0 ? partners : defaultPartners), ...(partners.length > 0 ? partners : defaultPartners)].map((p, i) => (
                <div key={i} className="partner-card">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.name}
                      className="partner-logo"
                    />
                  ) : (
                    <span className="partner-name-text">{p.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNERS -> OPPORTUNITIES VISUAL BRIDGE */}
        <section
          aria-hidden="true"
          style={{
            position: 'relative',
            padding: '1.25rem 0 1.75rem',
            background: `linear-gradient(180deg, ${dark ? '#0a1025' : '#f8fafc'} 0%, ${theme.cardBg} 100%)`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 0%, ${theme.glow} 0%, transparent 60%)`,
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />
          <div className="ct" style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  height: '1px',
                  flex: 1,
                  maxWidth: '220px',
                  background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, transparent 0%, ${theme.primary} 100%)`,
                  opacity: 0.6,
                }}
              />
              <div
                className="hl"
                style={{
                  padding: '.95rem 1.9rem',
                  borderRadius: '999px',
                  border: `1px solid ${theme.border}`,
                  background: dark ? 'rgba(11,17,32,0.82)' : 'rgba(255,255,255,0.82)',
                  backdropFilter: 'blur(10px)',
                  color: theme.primary,
                  fontSize: '1rem',
                  fontWeight: 900,
                  letterSpacing: isRTL ? '.02em' : '.12em',
                  textTransform: isRTL ? 'none' : 'uppercase',
                  boxShadow: `0 12px 30px ${theme.glow}`,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {ui.partnersLead}
              </div>
              <div
                style={{
                  height: '1px',
                  flex: 1,
                  maxWidth: '220px',
                  background: `linear-gradient(${isRTL ? '90deg' : '270deg'}, transparent 0%, ${theme.primary} 100%)`,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        </section>

        {/* OPPORTUNITIES (DYNAMIC SECTION) */}
        {(oppsSection === null || oppsSection.isEnabled) && (() => {
          const displayedOpps = opportunities.filter(o => {
            if (activeTab === 'all') return true;
            if (activeTab === 'trials') return o.opportunityType === 'trial' || o.opportunityType === 'tryout';
            if (activeTab === 'pro') return o.opportunityType === 'job' || o.opportunityType === 'intl';
            if (activeTab === 'camps') return o.opportunityType === 'camp';
            if (activeTab === 'training') return o.opportunityType === 'training';
            return true;
          }) || [];

          const sectionTitle = getLocalizedField(oppsSection, 'title', t.oppsTitle);
          const sectionSub = getLocalizedField(oppsSection, 'sub', t.oppsSub);

          if (opportunities.length === 0 && oppsSection !== null) {
              return null; // hide completely if no opps selected and data has loaded
          }

          const tabs = [
            { id: 'all', label: t.all },
            { id: 'trials', label: t.trials },
            { id: 'pro', label: t.pro },
            { id: 'camps', label: t.camps },
            { id: 'training', label: t.training },
          ];

          return (
            <section id="opportunities" className="reveal" style={{background: theme.cardBg, borderTop:'1px solid rgba(70,70,78,.1)'}}>
            <div className="ct">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'4rem',flexWrap:'wrap',gap:'1rem'}}>
                <div style={{textAlign:isRTL?'right':'left'}}>
                  <h2 className="st" style={{fontSize:'2.25rem', color: theme.text}}>{sectionTitle || t.oppsTitle}</h2>
                  <p style={{color: theme.subText,marginTop:'.5rem'}}>{sectionSub || t.oppsSub}</p>
                </div>
                <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap', justifyContent:isRTL?'flex-end':'flex-start'}}>
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="hl" style={{padding:'0.5rem 1.25rem', borderRadius:'99px', fontSize:'0.875rem', fontWeight:700, border:`1px solid ${activeTab === tab.id ? theme.primary : theme.border}`, background: activeTab === tab.id ? theme.primary : 'transparent', color: activeTab === tab.id ? theme.btnText : theme.subText, cursor:'pointer', transition:'all 0.2s'}}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <a href="/auth/login" className="tc" style={{color: theme.primary,fontWeight:700,display:'flex',alignItems:'center',gap:'.5rem',textDecoration:'none'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform=isRTL?'translateX(-8px)':'translateX(8px)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='none'}>
                  {t.viewOpps}
                  {isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                  {!isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                </a>
              </div>
              
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'1.5rem'}}>
                {displayedOpps.map((opp, idx) => (
                  <div key={opp.id} onClick={() => router.push('/auth/login')} className={`tc5 reveal reveal-delay-${(idx % 3) + 1}`} style={{background: theme.bg,borderRadius:'16px',overflow:'hidden',border:`1px solid ${theme.border}`,cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor=theme.primary;el.style.transform='translateY(-10px) scale(1.01)'; el.style.boxShadow=`0 10px 40px ${theme.glow}`;}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor=theme.border;el.style.transform='none'; el.style.boxShadow='0 4px 20px rgba(0,0,0,0.05)';}}>
                    <div style={{height:'6px', width:'100%', backgroundColor: '#4f46e5'}} />
                    {opp.coverImage ? (
                      <div style={{height:'220px',overflow:'hidden',background:'#eef2ff'}}>
                        <img src={opp.coverImage} alt={opp.title} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      </div>
                    ) : opp.promoVideo ? (
                      <div style={{height:'220px',overflow:'hidden',background:'#020617'}}>
                        <video src={opp.promoVideo} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline preload="metadata" />
                      </div>
                    ) : null}
                    <div style={{padding:'1.5rem'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1rem'}}>
                        <span style={{backgroundColor:'#4f46e5', color:'#fff', padding:'0.25rem 0.75rem', borderRadius:'999px', fontSize:'0.75rem', fontWeight:'bold'}}>
                          {opp.opportunityType}
                        </span>
                        {opp.applicationDeadline && (
                          <span style={{fontSize:'0.75rem', color:'#909099', display:'flex', alignItems:'center', gap:'0.25rem', marginRight:'auto'}}>
                            <Calendar size={12} />
                            {new Date(opp.applicationDeadline).toLocaleDateString({ ar: 'ar-QA', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' }[locale])}
                          </span>
                        )}
                      </div>
                      <h3 style={{fontSize:'1.125rem', fontWeight:'bold', color: theme.text, marginBottom:'0.5rem'}}>{opp.title}</h3>
                      <p style={{fontSize:'0.875rem', color: theme.subText, marginBottom:'1rem'}}>{opp.organizerName}</p>
                      
                      <div style={{display:'flex', width:'100%', marginTop:'1rem'}}>
                        <button style={{width:'100%', padding:'0.75rem', backgroundColor: theme.panelBg, color: theme.primary, borderRadius:'12px', fontSize:'0.875rem', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', border:`1px solid ${theme.border}`, cursor:'pointer'}}
                          onMouseEnter={e=>{const el=e.currentTarget as HTMLButtonElement; el.style.backgroundColor=theme.primary; el.style.color=theme.btnText;}}
                          onMouseLeave={e=>{const el=e.currentTarget as HTMLButtonElement; el.style.backgroundColor=theme.panelBg; el.style.color=theme.primary;}}>
                          <Eye size={16} />   
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          );
        })()}

                {/* ADS SECTION - AUTO CAROUSEL */}
        {ads.length > 0 && (() => {
          const activeAds = ads.slice(0, 5);
          const current = adSlide % activeAds.length;
          const goTo = (idx: number) => setAdSlide((idx + activeAds.length) % activeAds.length);

          return (
            <section id="ads-section" style={{
              padding: '3rem 0',
              background: dark ? '#080d1a' : '#f1f5f9',
              borderBottom: `1px solid ${theme.border}`,
            }}>
              <AutoAdvance intervalMs={1500} onTick={() => setAdSlide(prev => (prev + 1) % activeAds.length)} />
              <div className="ct">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <span style={{
                    display: 'inline-block',
                    background: `${theme.primary}20`,
                    color: theme.primary,
                    padding: '0.35rem 1.25rem',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>🔥 {ui.featured}</span>
                </div>

                {/* Slider Container */}
                <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', boxShadow: dark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.1)' }}>

                  {/* Slides */}
                  <div style={{ position: 'relative', height: '340px', overflow: 'hidden' }}>
                    {activeAds.map((ad, i) => (
                      <a
                        key={i}
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'block',
                          opacity: i === current ? 1 : 0,
                          transform: i === current ? 'scale(1)' : 'scale(1.02)',
                          transition: 'opacity 0.7s ease, transform 0.7s ease',
                          pointerEvents: i === current ? 'auto' : 'none',
                          textDecoration: 'none'
                        }}
                      >
                        {/* Background Image */}
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Gradient Overlay */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
                        }} />

                        {/* Badges */}
                        <div style={{
                          position: 'absolute',
                          top: '1.25rem',
                          [isRTL ? 'right' : 'left']: '1.5rem',
                          display: 'flex',
                          gap: '0.5rem',
                          zIndex: 2
                        }}>
                          <span style={{
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            padding: '0.3rem 0.9rem',
                            borderRadius: '50px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            border: '1px solid rgba(255,255,255,0.15)'
                          }}>{extra.ad}</span>
                          {ad.category && (
                            <span style={{
                              background: theme.primary,
                              color: '#fff',
                              padding: '0.3rem 0.9rem',
                              borderRadius: '50px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>{ad.category}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '2rem 2.5rem',
                          textAlign: isRTL ? 'right' : 'left',
                          zIndex: 2
                        }}>
                          <h3 className="hl" style={{
                            color: '#ffffff',
                            fontSize: '1.75rem',
                            fontWeight: 800,
                            marginBottom: '0.5rem',
                            lineHeight: 1.2
                          }}>{ad.title}</h3>
                          {ad.description && (
                            <p style={{
                              color: 'rgba(255,255,255,0.8)',
                              fontSize: '0.95rem',
                              margin: '0 0 1rem',
                              lineHeight: 1.5,
                              maxWidth: '600px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>{ad.description}</p>
                          )}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: theme.primary,
                            color: '#fff',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '50px',
                            fontSize: '0.85rem',
                            fontWeight: 700
                          }}>
                            {ui.learnMore}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Prev Button */}
                  {activeAds.length > 1 && (
                    <button
                      onClick={(e) => { e.preventDefault(); goTo(current - 1); }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        [isRTL ? 'right' : 'left']: '1.5rem',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.primary)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
                    >
                      {isRTL ? '' : ''}
                    </button>
                  )}

                  {/* Next Button */}
                  {activeAds.length > 1 && (
                    <button
                      onClick={(e) => { e.preventDefault(); goTo(current + 1); }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        [isRTL ? 'left' : 'right']: '1.5rem',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.primary)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
                    >
                      {isRTL ? '' : ''}
                    </button>
                  )}

                  {/* Dots */}
                  <div style={{
                    position: 'absolute',
                    bottom: '1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '0.6rem',
                    zIndex: 10
                  }}>
                    {activeAds.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.preventDefault(); goTo(i); }}
                        style={{
                          width: i === current ? '30px' : '10px',
                          height: '10px',
                          borderRadius: '5px',
                          background: i === current ? theme.primary : 'rgba(255,255,255,0.3)',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      />
                    ))}
                  </div>

                </div>
              </div>
          </section>
          );
        })()}
        <section id="features" className="reveal" style={{background: theme.bg, padding: '8rem 0'}}>
          <div className="ct">
            <div style={{textAlign:'center',marginBottom:'5rem'}}>
              <h2 className="st" style={{fontSize:'3.5rem',marginBottom:'1rem', fontWeight: 900}}>{t.featuresTitle}</h2>
              <div style={{width:'6rem',height:'8px',background: theme.primary,margin:'0 auto',borderRadius:'9999px', opacity: 0.8}}></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2.5rem'}} className="fc">
              {t.features.map((f,i)=>{
                const colors=['#10b981','#3b82f6','#f59e0b'];
                return (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -10 }}
                    style={{
                      background: theme.cardBg,
                      borderRadius:'24px',
                      padding:'3.5rem 2.5rem',
                      position:'relative',
                      overflow:'hidden',
                      border:`1px solid ${theme.border}`,
                      boxShadow: dark ? '0 20px 40px rgba(0,0,0,0.2)' : '0 15px 35px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{
                      width: '70px',
                      height: '70px',
                      background: `${colors[i]}15`,
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '2rem',
                      color: colors[i]
                    }}>
                       {i === 0 && <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>}
                       {i === 1 && <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                       {i === 2 && <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>}
                    </div>
                    <h3 style={{fontSize:'1.65rem',fontWeight:800,marginBottom:'1.2rem',color: theme.text}}>{f.title}</h3>
                    <p style={{color: theme.subText,lineHeight:1.7, fontSize: '1.05rem'}}>{f.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW TO USE THE PLATFORM - Redesigned Interactive Flow */}
        <section id="how-to-use" className="reveal" style={{
          background: dark ? '#0b1120' : '#ffffff',
          padding: '8rem 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Grid Background */}
          <div style={{
            position: 'absolute', inset: 0, 
            backgroundImage: `linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            opacity: dark ? 0.05 : 0.4,
            pointerEvents: 'none'
          }}></div>
          
          <div className="ct" style={{position:'relative', zIndex:10}}>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:'6rem'}}>
               <span style={{display:'inline-flex',alignItems:'center',gap:'.75rem',background:`${theme.primary}10`,color:theme.primary,padding:'.5rem 1.5rem',borderRadius:'9999px',fontSize:'.85rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'1.5rem', border: `1px solid ${theme.primary}20`}}>
                <Globe size={18} />
                {ui.smartGuide}
              </span>
              <h2 className="st" style={{fontSize:'3.5rem',marginBottom:'1.5rem',color:theme.text, fontWeight: 900, letterSpacing: '-0.02em'}}>{t.howTitle}</h2>
              <p style={{color:theme.subText,fontSize:'1.2rem',maxWidth:'45rem',margin:'0 auto',lineHeight:1.8}}>{t.howSub}</p>
            </div>

            {/* Redesigned Flow Steps */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2.5rem',
              maxWidth: '900px',
              margin: '0 auto',
              position: 'relative'
            }}>
              {/* Connecting Line */}
              <div style={{
                position: 'absolute',
                top: '50px',
                bottom: '50px',
                [isRTL ? 'right' : 'left']: '50px',
                width: '2px',
                background: `linear-gradient(to bottom, transparent, ${theme.primary}50, transparent)`,
                zIndex: 0
              }} className="hm"></div>

              {(t.howSteps || []).map((step: any, idx: number) => {
                const getIcon = (i: number) => {
                  if(i === 0) return <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>;
                  if(i === 1) return <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>;
                  if(i === 2) return <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>;
                  return <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>;
                };
                
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2.5rem',
                    position: 'relative',
                    zIndex: 2,
                  }} className="step-row">
                    {/* Number Circle */}
                    <div className="step-num" style={{
                      width: '100px', height: '100px', borderRadius: '50%',
                      background: theme.cardBg, border: `2px solid ${step.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '2.2rem', fontWeight: 900,
                      color: step.color, boxShadow: `0 0 30px ${step.color}20`,
                      position: 'relative'
                    }}>
                       <div style={{position:'absolute', inset: -6, borderRadius:'50%', border: `1px dashed ${step.color}50`, animation: 'fw-spin 15s linear infinite'}}></div>
                       {step.num}
                    </div>

                    {/* Content Card */}
                    <div 
                      className="group"
                      style={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '24px',
                        padding: '2.5rem',
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = isRTL ? 'translateX(-10px)' : 'translateX(10px)';
                        e.currentTarget.style.borderColor = step.color;
                        e.currentTarget.style.boxShadow = `0 20px 40px ${step.color}15`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = theme.border;
                        e.currentTarget.style.boxShadow = dark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0, [isRTL ? 'right' : 'left']: 0,
                        width: '4px', background: step.color
                      }} />
                      
                      <div style={{display:'flex', alignItems:'flex-start', gap: '1.5rem'}} className="step-content">
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '18px',
                          background: `${step.color}15`,
                          color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {getIcon(idx)}
                          </svg>
                        </div>
                        <div style={{textAlign: isRTL ? 'right' : 'left'}}>
                          <h3 className="hl" style={{ color: theme.text, marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 800 }}>{step.title}</h3>
                          <p style={{ fontSize: '1.1rem', color: theme.subText, lineHeight: 1.6 }}>{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Call to Action */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginTop: '6rem'}}>
              <div 
                style={{
                  background: `linear-gradient(135deg, ${theme.cardBg}, ${dark ? '#111827' : '#ffffff'})`,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '32px',
                  padding: '4rem 3rem',
                  maxWidth: '800px',
                  width: '100%',
                  textAlign: 'center',
                  boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.3)' : '0 20px 50px rgba(0,0,0,0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{position:'absolute', top:0, left:0, bottom:0, width:'6px', background: 'linear-gradient(to bottom, #fdba45, #10b981)'}}></div>
                <h3 className="hl" style={{fontSize: '2.2rem', fontWeight: 900, marginBottom: '1.25rem', color: theme.text}}>
                  {ui.discover}
                </h3>
                <p style={{color: theme.subText, fontSize: '1.25rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto 2.5rem'}}>
                  {ui.discoverDesc}
                </p>
                <a 
                  href="/auth/register" 
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                    padding: '1.25rem 3.5rem', borderRadius: '16px', background: theme.btnGradient,
                    color: 'white', fontWeight: 800, fontSize: '1.25rem', textDecoration: 'none',
                    boxShadow: `0 10px 30px ${theme.glow}`, transition: 'transform 0.2s', border: 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {ui.startAthlete}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform: isRTL ? 'rotate(180deg)' : 'none'}}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              </div>
            </div>

            <style>{`
              @media(max-width: 768px) {
                .step-row { flex-direction: column !important; align-items: stretch !important; gap: 0 !important; text-align: center !important; }
                .step-num { margin: 0 auto -2rem auto !important; width: 64px !important; height: 64px !important; font-size: 1.25rem !important; z-index: 10 !important; background: ${theme.cardBg} !important; border-width: 3px !important; }
                .step-content { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 1rem !important; }
                .step-content > div:last-child { text-align: center !important; }
                .step-row > div:last-child { padding: 3rem 1.5rem 2rem !important; border-radius: 20px !important; }
              }
            `}</style>
          </div>
        </section>

        {/* FOR WHOM SECTION */}
        <section className="reveal" style={{background: dark ? '#0a0f1e' : '#ffffff', position:'relative', overflow:'hidden'}}>
          {/* bg glows */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
            <div style={{position:'absolute',top:'-8rem',left:'-8rem',width:'28rem',height:'28rem',background:'rgba(132,217,147,.06)',borderRadius:'50%',filter:'blur(70px)'}}></div>
            <div style={{position:'absolute',bottom:'-8rem',right:'-8rem',width:'28rem',height:'28rem',background:'rgba(189,196,239,.06)',borderRadius:'50%',filter:'blur(70px)'}}></div>
          </div>
          <style>{`
            @keyframes fw-card{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
            @keyframes fw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
            @keyframes fw-bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}60%{transform:translateY(-3px)}}
            @keyframes fw-draw{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
            @keyframes fw-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
            @keyframes fw-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
            @keyframes fw-pls{0%{transform:translate(-50%,-50%) scale(1);opacity:.5}100%{transform:translate(-50%,-50%) scale(1.8);opacity:0}}
            .fwc0{animation:fw-card .6s .05s both}.fwc1{animation:fw-card .6s .2s both}
            .fwc2{animation:fw-card .6s .35s both}.fwc3{animation:fw-card .6s .5s both}
          `}</style>

          <div className="ct" style={{position:'relative',zIndex:10}}>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:'4rem'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(132,217,147,.1)',color:'#84d993',padding:'.4rem 1.25rem',borderRadius:'9999px',fontSize:'.8rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'1.5rem'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#84d993" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'fw-spin 4s linear infinite'}}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                </svg>
                {ui.audience}
              </span>
              <h2 className="st" style={{fontSize:'2.6rem',marginBottom:'1rem',color:theme.text}}>{t.forWhomTitle}</h2>
              <p style={{color:theme.subText,fontSize:'1.05rem',maxWidth:'44rem',margin:'0 auto',lineHeight:1.75}}>{t.forWhomSub}</p>
              <div style={{width:'5rem',height:'5px',background:'linear-gradient(to right,#84d993,#10b981)',margin:'1.5rem auto 0',borderRadius:'9999px'}}></div>
            </div>

            {/* Cards Grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'1.75rem'}} className="fw-grid">
              <style>{`.fw-grid{grid-template-columns:repeat(2,1fr)}@media(max-width:640px){.fw-grid{grid-template-columns:1fr; gap:1.25rem!important;} .fwc0,.fwc1,.fwc2,.fwc3{padding:1.5rem!important;}}`}</style>

              {(t.forWhom as {num:string;title:string;desc:string;btn:string;href:string;color:string}[]).map((item, i) => {
                const svgs = [
                  /* 01 Athlete - running person */
                  <svg key="s1" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13" cy="4" r="2" strokeDasharray="14" strokeDashoffset="14" style={{animation:'fw-draw .5s .3s forwards'}}/>
                    <path d="m7 21 2-7 2 2 2-4 3 5" strokeDasharray="40" strokeDashoffset="40" style={{animation:'fw-draw 1s .6s forwards'}}/>
                    <path d="m6 11 2-2 4 1 3-3" strokeDasharray="30" strokeDashoffset="30" style={{animation:'fw-draw .8s .9s forwards'}}/>
                  </svg>,
                  /* 02 Academy - graduation cap */
                  <svg key="s2" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeDasharray="60" strokeDashoffset="60" style={{animation:'fw-draw 1s .3s forwards'}}/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5" strokeDasharray="40" strokeDashoffset="40" style={{animation:'fw-draw .8s .9s forwards'}}/>
                  </svg>,
                  /* 03 Club/Scout - eye + target */
                  <svg key="s3" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeDasharray="60" strokeDashoffset="60" style={{animation:'fw-draw 1s .3s forwards'}}/>
                    <circle cx="12" cy="12" r="3" strokeDasharray="20" strokeDashoffset="20" style={{animation:'fw-draw .6s .9s forwards'}}/>
                    <circle cx="12" cy="12" r="1" fill={item.color} strokeWidth="0" style={{opacity:0,animation:'fw-card .4s 1.2s both'}}/>
                  </svg>,
                  /* 04 Partners - handshake */
                  <svg key="s4" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78 7.65 7.65 7.65-7.65.78-.78a5.4 5.4 0 0 0 0-7.65Z" strokeDasharray="80" strokeDashoffset="80" style={{animation:'fw-draw 1.2s .3s forwards'}}/>
                  </svg>,
                ];
                const iconAnims = [
                  'fw-bounce 2s ease-in-out infinite',
                  'fw-float 3s .3s ease-in-out infinite',
                  'fw-shake 2.5s .6s ease-in-out infinite',
                  'fw-float 3.5s .9s ease-in-out infinite',
                ];
                const cardClass = `fwc${i}`;
                return (
                  <div key={i} className={`${cardClass}`} style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '20px',
                    padding: '2.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    transition: 'all .35s cubic-bezier(.4,0,.2,1)',
                    cursor: 'default',
                  }}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.transform='translateY(-6px)';el.style.borderColor=item.color;el.style.boxShadow=`0 20px 50px ${item.color}20`;}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.transform='none';el.style.borderColor=theme.border;el.style.boxShadow='none';}}
                  >
                    {/* Colored top accent bar */}
                    <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(to ${isRTL?'left':'right'},${item.color},${item.color}55)`}}></div>

                    {/* Subtle number watermark */}
                    <div style={{position:'absolute',bottom:'-1rem',right:'1.5rem',fontSize:'6rem',fontWeight:900,color:`${item.color}08`,lineHeight:1,userSelect:'none',fontFamily:'Space Grotesk,sans-serif'}}>{item.num}</div>

                    {/* Pulse ring + Icon */}
                    <div style={{position:'relative',width:'5rem',height:'5rem'}}>
                      <div style={{position:'absolute',top:'50%',left:'50%',width:'5rem',height:'5rem',borderRadius:'50%',border:`2px solid ${item.color}`,opacity:0,animation:`fw-pls 2.5s ${i*0.8}s ease-out infinite`}}></div>
                      <div style={{width:'5rem',height:'5rem',borderRadius:'50%',background:`${item.color}15`,border:`2px solid ${item.color}35`,display:'flex',alignItems:'center',justifyContent:'center',animation:iconAnims[i]}}>
                        {svgs[i]}
                      </div>
                    </div>

                    {/* Number badge */}
                    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'2.2rem',height:'2.2rem',borderRadius:'50%',background:`${item.color}20`,color:item.color,fontWeight:900,fontSize:'.8rem',fontFamily:'Space Grotesk,sans-serif',border:`1.5px solid ${item.color}50`}}>{item.num}</span>

                    {/* Text */}
                    <div>
                      <h3 className="hl" style={{fontSize:'1.3rem',fontWeight:800,color:theme.text,marginBottom:'.6rem',lineHeight:1.3}}>{item.title}</h3>
                      <p style={{color:theme.subText,fontSize:'.9rem',lineHeight:1.7}}>{item.desc}</p>
                    </div>

                    {/* CTA Link */}
                    <a href={item.href} style={{
                      display:'inline-flex',alignItems:'center',gap:'.5rem',
                      color:item.color,fontWeight:700,fontSize:'.875rem',
                      textDecoration:'none',borderBottom:`1px dashed ${item.color}60`,
                      paddingBottom:'.15rem',width:'fit-content',
                      transition:'gap .2s,border-color .2s'
                    }}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.gap='.75rem';el.style.borderBottomColor=item.color;}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.gap='.5rem';el.style.borderBottomColor=`${item.color}60`;}}
                    >
                      {item.btn}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform:isRTL?'rotate(180deg)':'none'}}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* STORE SECTION */}
        {storeEnabled && <section
          id="store"
          className="reveal"
          style={{
            background: dark ? '#08111f' : 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
            position: 'relative',
            overflow: 'hidden',
            padding: '7rem 0',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div
              style={{
                position: 'absolute',
                top: '-6rem',
                [isRTL ? 'right' : 'left']: '-8rem',
                width: '24rem',
                height: '24rem',
                borderRadius: '50%',
                background: 'rgba(59,130,246,.10)',
                filter: 'blur(80px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-6rem',
                [isRTL ? 'left' : 'right']: '-8rem',
                width: '22rem',
                height: '22rem',
                borderRadius: '50%',
                background: 'rgba(16,185,129,.10)',
                filter: 'blur(80px)',
              }}
            />
          </div>

          <div className="ct" style={{ position: 'relative', zIndex: 5 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.1fr) minmax(320px,.9fr)',
                gap: '2rem',
                alignItems: 'stretch',
              }}
              className="store-grid"
            >
              <div
                style={{
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '30px',
                  padding: '2.5rem',
                  boxShadow: dark ? '0 24px 60px rgba(0,0,0,.22)' : '0 20px 45px rgba(15,23,42,.06)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.6rem',
                    background: 'rgba(37,99,235,.10)',
                    color: '#2563eb',
                    padding: '.55rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '.85rem',
                    fontWeight: 800,
                    marginBottom: '1.25rem',
                  }}
                >
                  <ShoppingBag size={16} />
                  {storeBadge}
                </span>

                <h2
                  className="st"
                  style={{
                    fontSize: '3rem',
                    lineHeight: 1.15,
                    marginBottom: '1rem',
                    color: theme.text,
                    fontWeight: 900,
                  }}
                >
                  {storeTitle}
                </h2>

                <p
                  style={{
                    color: theme.subText,
                    fontSize: '1.08rem',
                    lineHeight: 1.9,
                    maxWidth: '46rem',
                    marginBottom: '2rem',
                  }}
                >
                  {storeSub}
                </p>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                  {storeHighlights.map((item, idx) => {
                    const Icon = idx === 0 ? ShoppingBag : idx === 1 ? CreditCard : WalletCards;
                    const iconColor = idx === 0 ? '#2563eb' : idx === 1 ? '#10b981' : '#7c3aed';

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'flex-start',
                          background: dark ? 'rgba(15,23,42,.55)' : '#ffffff',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '20px',
                          padding: '1rem 1.1rem',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: `${iconColor}15`,
                            color: iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <div>
                          <div
                            className="hl"
                            style={{ color: theme.text, fontWeight: 800, fontSize: '1.05rem', marginBottom: '.35rem' }}
                          >
                            {item.title}
                          </div>
                          <div style={{ color: theme.subText, lineHeight: 1.75, fontSize: '.95rem' }}>{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.85rem' }}>
                  <a
                    href="/dashboard/shared/store"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem 1.7rem',
                      borderRadius: '16px',
                      background: theme.btnGradient,
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 800,
                      boxShadow: `0 12px 30px ${theme.glow}`,
                    }}
                  >
                    {storeCta}
                  </a>
                  <a
                    href="/dashboard/admin/pricing-management"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem 1.4rem',
                      borderRadius: '16px',
                      background: dark ? 'rgba(255,255,255,.04)' : '#fff',
                      color: theme.text,
                      textDecoration: 'none',
                      fontWeight: 700,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {storeSecondary}
                  </a>
                </div>
              </div>

              <div
                style={{
                  background: dark ? 'linear-gradient(180deg, rgba(15,23,42,.94), rgba(30,41,59,.88))' : 'linear-gradient(180deg, #ffffff, #f8fafc)',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '30px',
                  padding: '2rem',
                  boxShadow: dark ? '0 24px 60px rgba(0,0,0,.22)' : '0 20px 45px rgba(15,23,42,.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.5rem',
                        background: 'rgba(124,58,237,.10)',
                        color: '#7c3aed',
                        padding: '.45rem .85rem',
                        borderRadius: '9999px',
                        fontSize: '.8rem',
                        fontWeight: 800,
                        marginBottom: '1rem',
                      }}
                    >
                      <WalletCards size={15} />
                      {ui.selectedProducts}
                    </div>

                    <h3 className="hl" style={{ color: theme.text, fontSize: '1.8rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '.5rem' }}>
                      {ui.managedProducts}
                    </h3>

                    <p style={{ color: theme.subText, lineHeight: 1.8, fontSize: '.95rem' }}>
                      {configuredStoreProductIds.length > 0
                        ? ui.selectedNote
                        : ui.autoNote}
                    </p>
                  </div>

                  <a
                    href="/dashboard/shared/store"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '.85rem 1.2rem',
                      borderRadius: '14px',
                      background: dark ? 'rgba(255,255,255,.04)' : '#fff',
                      color: theme.text,
                      textDecoration: 'none',
                      fontWeight: 800,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {ui.openStore}
                  </a>
                </div>

                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                  {storeCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setStoreCategoryFilter(category)}
                      style={{
                        padding: '.65rem 1rem',
                        borderRadius: '9999px',
                        border: `1px solid ${storeCategoryFilter === category ? 'transparent' : theme.border}`,
                        background: storeCategoryFilter === category ? theme.btnGradient : (dark ? 'rgba(255,255,255,.03)' : '#fff'),
                        color: storeCategoryFilter === category ? '#fff' : theme.text,
                        fontWeight: 800,
                        fontSize: '.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      {storeCategoryLabels[category]}
                    </button>
                  ))}
                </div>

                {visibleStoreProducts.length === 0 ? (
                  <div
                    style={{
                      borderRadius: '22px',
                      border: `1px dashed ${theme.border}`,
                      padding: '2rem',
                      textAlign: 'center',
                      color: theme.subText,
                      background: dark ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.75)',
                    }}
                  >
                    {ui.noProducts}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {visibleStoreProducts.map((product) => {
                      const productImage = product.image || product.images?.[0];
                      const productLabel = [product.brand, product.model].filter(Boolean).join(' • ');

                      return (
                        <a
                          key={product.id}
                          href="/dashboard/shared/store"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '112px minmax(0,1fr)',
                            gap: '1rem',
                            alignItems: 'center',
                            padding: '1rem',
                            borderRadius: '22px',
                            background: dark ? 'rgba(255,255,255,.03)' : '#fff',
                            border: `1px solid ${theme.border}`,
                            textDecoration: 'none',
                          }}
                        >
                          <div
                            style={{
                              height: '112px',
                              borderRadius: '18px',
                              overflow: 'hidden',
                              background: dark ? 'rgba(255,255,255,.04)' : '#f8fafc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {productImage ? (
                              <img src={productImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ShoppingBag size={28} color={dark ? '#94a3b8' : '#64748b'} />
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '.75rem', marginBottom: '.45rem' }}>
                              <h4 className="hl" style={{ color: theme.text, fontSize: '1.1rem', fontWeight: 900, lineHeight: 1.3 }}>
                                {product.name}
                              </h4>
                              <span
                                style={{
                                  whiteSpace: 'nowrap',
                                  borderRadius: '9999px',
                                  padding: '.35rem .7rem',
                                  background: 'rgba(16,185,129,.10)',
                                  color: '#059669',
                                  fontWeight: 900,
                                  fontSize: '.82rem',
                                }}
                              >
                                {formatLandingStorePrice(product.price, product.currency)}
                              </span>
                            </div>

                            {productLabel ? (
                              <div style={{ color: theme.subText, fontSize: '.85rem', marginBottom: '.35rem' }}>{productLabel}</div>
                            ) : null}

                            <div style={{ color: theme.subText, fontSize: '.84rem', lineHeight: 1.7, marginBottom: '.6rem' }}>
                              {product.description || ui.productDesc}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                              <span style={{ borderRadius: '9999px', background: dark ? 'rgba(59,130,246,.14)' : 'rgba(59,130,246,.10)', color: '#2563eb', padding: '.28rem .65rem', fontSize: '.75rem', fontWeight: 800 }}>
                                {storeCategoryLabels[product.category]}
                              </span>
                              <span style={{ borderRadius: '9999px', background: dark ? 'rgba(124,58,237,.14)' : 'rgba(124,58,237,.10)', color: '#7c3aed', padding: '.28rem .65rem', fontSize: '.75rem', fontWeight: 800 }}>
                                {ui.installment}
                              </span>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <style>{`
              @media(max-width: 980px){
                .store-grid{grid-template-columns:1fr !important;}
              }
            `}</style>
          </div>
        </section>}

        {/* AI VIDEO ANALYSIS */}
        <section id="ai-analysis" className="reveal" style={{background: theme.cardBg,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:.1}}>
            <div style={{position:'absolute',top:0,right:0,width:'500px',height:'500px',background:'#bdc4ef',filter:'blur(120px)',borderRadius:'50%'}}></div>
            <div style={{position:'absolute',bottom:0,left:0,width:'500px',height:'500px',background:'#84d993',filter:'blur(120px)',borderRadius:'50%'}}></div>
          </div>
          <div className="ct" style={{position:'relative',zIndex:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4rem',alignItems:'center'}} className="g2">
              {/* Text Side */}
              <div style={{textAlign:isRTL?'right':'left',order:isRTL?1:2}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(189,196,239,.1)',color:'#bdc4ef',padding:'.25rem 1rem',borderRadius:'9999px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'1.5rem'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.5-1 1-4c2 0 3 .5 3 .5s.5 1 .5 3.5Z"></path><path d="M12 15v5s1 .5 4 1c0-2-.5-3-.5-3s-1-.5-3.5-.5Z"></path></svg>
                  {localizedAiSection?.badge || t.aiVideoBadge}
                </div>
                <h2 className="hl" style={{fontSize:'3rem',fontWeight:900,letterSpacing:'-0.05em',marginBottom:'1.5rem', color: theme.text}}>{localizedAiSection?.title || t.aiVideoTitle}</h2>
                <p style={{fontSize:'1.125rem',color: theme.subText,marginBottom:'3rem',lineHeight:1.625,maxWidth:'36rem',marginLeft:isRTL?'auto':'0'}}>{localizedAiSection?.desc || t.aiVideoDesc}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
                  {(localizedAiSection?.features || t.aiVideoFeatures).map((f: any,i: number)=>(
                    <div key={i} style={{display:'flex',flexDirection:isRTL?'row-reverse':'row',alignItems:'flex-start',gap:'1.5rem'}}>
                      <div className="tc" style={{width:'3.5rem',height:'3.5rem',flexShrink:0,borderRadius:'12px',background: dark ? '#24293d' : '#ffffff',border:'1px solid rgba(70,70,78,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.borderColor=f.color}
                        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.borderColor='rgba(70,70,78,.3)'}>
                        <div style={{color:f.color}}>
                          {i===0 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.5-1 1-4c2 0 3 .5 3 .5s.5 1 .5 3.5Z"></path><path d="M12 15v5s1 .5 4 1c0-2-.5-3-.5-3s-1-.5-3.5-.5Z"></path></svg>}
                          {i===1 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>}
                          {i===2 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>}
                          {i===3 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>}
                        </div>
                      </div>
                      <div style={{textAlign:isRTL?'right':'left'}}>
                        <h4 className="hl" style={{fontSize:'1.125rem',fontWeight:700,marginBottom:'.5rem', color: theme.text}}>{f.title}</h4>
                        <p style={{color: theme.subText,fontSize:'.875rem',lineHeight:1.625}}>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Video Mockup Side */}
              <div className="hm" style={{position:'relative',order:isRTL?2:1}}>
                <div style={{position:'absolute',inset:'-1rem',background:'linear-gradient(135deg,rgba(189,196,239,.3),rgba(132,217,147,.3))',filter:'blur(3rem)',borderRadius:'2rem',opacity:.5}}></div>
                <div style={{position:'relative',background:'#000',borderRadius:'1rem',border:'1px solid rgba(70,70,78,.3)',overflow:'hidden',aspectRatio:'16/9'}}>
                  {/* Video BG */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vBg} alt="AI Video Analysis" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity: dark ? .7 : .4}}/>
                  <div style={{position:'absolute',inset:0,background: theme.overlay}}></div>
                  {/* Tracking Badge */}
                  <div className="ap gp" style={{position:'absolute',top:'2.5rem',left:'2.5rem',padding:'1rem',border:`1px solid ${theme.primary}`,borderRadius:'8px', background: theme.panelBg, backdropFilter: 'blur(10px)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <div className="ap" style={{width:'12px',height:'12px',background: theme.primary,borderRadius:'50%'}}></div>
                      <span className="hl" style={{fontSize:'10px',fontWeight:700,letterSpacing:'.1em',color: theme.primary,textTransform:'uppercase'}}>{extra.tracking}</span>
                    </div>
                    <p className="hl" style={{fontSize:'1.5rem',fontWeight:900,marginTop:'.5rem', color: theme.text}}>32.4 km/h</p>
                    <p style={{fontSize:'8px',color: theme.subText,textTransform:'uppercase'}}>{extra.currentSpeed}</p>
                  </div>
                  {/* Stats Panel */}
                  <div style={{position:'absolute',bottom:'2.5rem',right:'2.5rem',padding:'1.5rem',background: theme.headerBg,backdropFilter:'blur(12px)',border:`1px solid ${theme.border}`,borderRadius:'12px'}}>
                    <div style={{display:'flex',gap:'1rem'}}>
                      {[{label:'Precision',val:'92%',color:'#84d993'},{label:'Stamina',val:'88%',color:'#bdc4ef'}].map((s,i)=>(
                        <div key={i} style={{textAlign:'center'}}>
                          <div style={{width:'3rem',height:'3rem',borderRadius:'50%',border:`3px solid ${s.color}`,borderTopColor:'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'.5rem'}}>
                            <span style={{fontSize:'10px',fontWeight:700, color: theme.text}}>{s.val}</span>
                          </div>
                          <p style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',color: theme.subText}}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Spin indicator */}
                  <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
                    <div style={{width:'8rem',height:'8rem',border:'2px dashed rgba(255,255,255,.4)',borderRadius:'50%',animation:'spin 10s linear infinite'}}></div>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:'1rem',height:'1rem',background:'white',borderRadius:'50%',boxShadow:'0 0 20px white'}}></div>
                    </div>
                    <div style={{position:'absolute',top:0,right:0,background: theme.primary,color: theme.btnText,padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:900,textTransform:'uppercase'}}>PLAYER_01</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
 
        {/* FOUNDER MESSAGE */}
        <section className="founder-section-mob" style={{ padding: '8rem 0', background: dark ? '#0d1225' : '#f8fafc', position: 'relative' }}>
          <style>{`
            @media(max-width: 768px) {
              .founder-section-mob { padding: 4rem 1rem !important; }
              .founder-card { padding: 2rem 1.5rem !important; border-radius: 24px !important; }
              .founder-card .g2 { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
              .founder-img { width: 100% !important; max-width: 300px !important; height: 350px !important; }
              .founder-quote { font-size: 1.25rem !important; margin-bottom: 2rem !important; text-align: center !important; }
            }
          `}</style>
          <div className="ct">
            <div className="reveal founder-card" style={{ 
              maxWidth: '1100px', 
              margin: '0 auto', 
              background: theme.cardBg, 
              padding: '5rem 4rem', 
              borderRadius: '40px', 
              border: `1px solid ${theme.border}`, 
              position: 'relative',
              boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.3)' : '0 20px 50px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              {/* Decorative elements */}
              <div style={{ position: 'absolute', top: '-5rem', right: '-5rem', width: '15rem', height: '15rem', background: theme.primary, opacity: 0.03, borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', bottom: '-2rem', left: '-2rem', width: '8rem', height: '8rem', background: '#84d993', opacity: 0.05, borderRadius: '50%' }}></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem', alignItems: 'center' }} className="g2">
                {/* Photo Side */}
                <div style={{ textAlign: 'center' }}>
                  <div className="founder-img" style={{ 
                    position: 'relative',
                    width: '320px',
                    height: '400px',
                    margin: '0 auto',
                    borderRadius: '32px',
                    overflow: 'hidden',
                    border: `1px solid ${theme.border}`,
                    boxShadow: `0 15px 35px ${theme.glow}`
                  }}>
                    <img src="/images/team/founder.jpg" alt="Founder" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}></div>
                  </div>
                </div>

                {/* Text Side */}
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: isRTL ? 'flex-start' : 'flex-start' }}>
                      <div style={{ padding: '0.4rem', borderRadius: '8px', background: `${theme.primary}10`, border: `1px solid ${theme.primary}20` }}>
                        <img src="/el7lm-logo.png" alt="Logo" className="logo-16" style={{ width:'16px', height:'16px', objectFit: 'contain', filter: dark ? 'brightness(1.1)' : 'none' }} />
                      </div>
                      <span className="hl" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: theme.primary, textTransform: 'uppercase' }}>
                         {ui.founder}
                      </span>
                   </div>
                   
                   <p className="founder-quote" style={{ 
                     fontSize: '1.85rem', 
                     lineHeight: 1.6, 
                     fontWeight: 600, 
                     marginBottom: '2.5rem', 
                     color: theme.text,
                     fontStyle: 'italic',
                     position: 'relative',
                     maxWidth: '600px',
                     marginLeft: isRTL ? 'auto' : '0'
                   }}>
                     <span style={{ fontSize: '5rem', position: 'absolute', top: '-1.5rem', [isRTL ? 'right' : 'left']: '-2.5rem', opacity: 0.07, color: theme.primary }}>"</span>
                     {extra.founderQuote}
                   </p>

                   <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', justifyContent: isRTL ? 'flex-start' : 'flex-start' }}>
                       <img src="/el7lm-logo.png" alt="Logo" className="logo-16" style={{ width:'16px', height:'16px', objectFit: 'contain', filter: dark ? 'brightness(1.1)' : 'none' }} />
                       <h3 className="hl" style={{ fontSize: '1.5rem', fontWeight: 800, color: theme.text, marginBottom: 0 }}>
                          {ui.founderName}
                       </h3>
                    </div>
                    <p style={{ color: theme.subText, fontSize: '1.125rem', fontWeight: 500, paddingRight: isRTL ? '2.25rem' : '0', paddingLeft: isRTL ? '0' : '2.25rem' }}>
                       {ui.founderRole}
                    </p>
                      <div style={{ marginTop: '2rem' }}>
                         
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE TOURNAMENTS FROM DB */}
        {liveTournaments.length > 0 && (
          <section id="live-tournaments" style={{ background: dark ? '#0a0f1e' : '#fff', padding: '72px 0' }}>
            <div className="ct">
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#d97706', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
                    🏆 {ui.tournaments}
                  </div>
                  <h2 className="st" style={{ fontSize:'2rem', color: theme.text, margin:0 }}>
                    {ui.upcoming}
                  </h2>
                  <p style={{ color: theme.subText, marginTop:'.5rem', fontSize:15 }}>
                    {ui.tournamentDesc}
                  </p>
                </div>
                <a href="/tournaments" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#d97706', fontWeight:700, fontSize:14, textDecoration:'none', flexShrink:0, border:'1.5px solid #d97706', borderRadius:10, padding:'9px 18px', transition:'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(217,119,6,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'}>
                  {ui.viewAll}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>

              {/* Cards grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
                {liveTournaments.map((t: any) => {
                  const statusCfg: Record<string,{lbl:string;color:string}> = {
                    open:      { lbl: ui.statuses[0], color:'#16a34a' },
                    ongoing:   { lbl: ui.statuses[1], color:'#2563eb' },
                    closed:    { lbl: ui.statuses[2], color:'#64748b' },
                    completed: { lbl: ui.statuses[3], color:'#8b5cf6' },
                    cancelled: { lbl: ui.statuses[4], color:'#ef4444' },
                  };
                  const cfg = statusCfg[t.status] || statusCfg.closed;
                  const typeLbl: Record<string,string> = { knockout: extra.tournamentTypes[0], league: extra.tournamentTypes[1], groups_knockout: extra.tournamentTypes[2] };

                  return (
                    <a key={t.id} href={`/tournaments/${t.slug}`} style={{ textDecoration:'none', display:'block', background: dark ? '#131929' : '#f8fafc', border: `1px solid ${dark?'rgba(255,255,255,0.07)':'#e2e8f0'}`, borderRadius:16, overflow:'hidden', transition:'transform 0.2s, box-shadow 0.2s', cursor:'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform='translateY(-4px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow='0 12px 32px rgba(0,0,0,0.15)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform='none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow='none'; }}>

                      {/* Top colored bar */}
                      <div style={{ height:4, background:`linear-gradient(90deg,#d97706,${cfg.color})` }} />

                      <div style={{ padding:'16px 16px 14px' }}>
                        {/* Logo + name */}
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                          <div style={{ width:44, height:44, borderRadius:12, overflow:'hidden', background: dark?'rgba(255,255,255,0.06)':'#e2e8f0', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                            {t.logo_url
                              ? <img src={t.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                              : '🏆'}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:800, color: dark?'#e8eaf0':'#0f172a', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                            {t.city && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>📍 {t.city}</div>}
                          </div>
                        </div>

                        {/* Meta row */}
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:`${cfg.color}18`, border:`1px solid ${cfg.color}30`, borderRadius:6, padding:'2px 8px' }}>{cfg.lbl}</span>
                          {t.type && <span style={{ fontSize:11, fontWeight:600, color: dark?'#94a3b8':'#64748b', background: dark?'rgba(255,255,255,0.06)':'#e2e8f0', borderRadius:6, padding:'2px 8px' }}>{typeLbl[t.type] || t.type}</span>}
                          {t.max_teams && <span style={{ fontSize:11, color:'#64748b', borderRadius:6, padding:'2px 8px', background: dark?'rgba(255,255,255,0.04)':'#f1f5f9' }}>👥 {t.max_teams} {extra.team}</span>}
                        </div>

                        {/* Dates */}
                        {(t.start_date || t.end_date) && (
                          <div style={{ fontSize:12, color:'#64748b', display:'flex', alignItems:'center', gap:4 }}>
                            📅 {t.start_date ? new Date(t.start_date).toLocaleDateString(isRTL?'ar-SA':'en-US',{month:'short',day:'numeric'}) : ''}
                            {t.start_date && t.end_date && ' — '}
                            {t.end_date ? new Date(t.end_date).toLocaleDateString(isRTL?'ar-SA':'en-US',{month:'short',day:'numeric',year:'numeric'}) : ''}
                          </div>
                        )}

                        {/* CTA */}
                        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${dark?'rgba(255,255,255,0.05)':'#f1f5f9'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'#d97706', fontWeight:700 }}>
                            {t.status === 'open' ? extra.register : extra.details}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* TOURNAMENTS */}
        <section id="tournaments" style={{background: dark ? '#080d20' : '#f1f5f9'}}>
          <div className="ct">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4rem',flexWrap:'wrap',gap:'1rem'}}>
              <div style={{textAlign:isRTL?'right':'left'}}>
                <h2 className="st" style={{fontSize:'2.25rem', color: theme.text}}>{t.tourTitle}</h2>
                <p style={{color: theme.subText,marginTop:'.5rem'}}>{t.tourSub}</p>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem'
            }}>
              {t.tournaments.map((tour, i) => (
                <div key={i} style={{ 
                  position: 'relative', 
                  borderRadius: '24px', 
                  overflow: 'hidden', 
                  height: '450px', 
                  cursor: 'pointer', 
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
                  onMouseEnter={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1)' }}>
                  <img src={tImgs[i] || TOUR_IMGS[i]} alt={tour.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', opacity: 0.8 }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem', textAlign: isRTL ? 'right' : 'left' }}>
                    <h4 className="hl" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '.75rem' }}>{tour.title}</h4>
                    <p style={{ color: '#d1d5db', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.6 }}>{tour.desc}</p>
                    <a href="https://www.instagram.com/hagzzel7lm/" target="_blank" rel="noopener noreferrer" className="tc hl" style={{ background: 'white', color: 'black', padding: '.7rem 1.5rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', display: 'inline-block', fontSize: '0.9rem' }}>
                      {tour.btn}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TALENTS */}
        {(playersSection === null || playersSection.isEnabled) && (() => {
          const displayedPlayers = featuredPlayers.length > 0 ? featuredPlayers : null;
          const sectionTitle = getLocalizedField(playersSection, 'title', t.talentsTitle);
          const sectionSub = getLocalizedField(playersSection, 'sub', t.talentsSub);

          if (!displayedPlayers && playersSection !== null) return null;

          return (
            <section style={{background: theme.bg}}>
              <div className="ct">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'4rem',flexWrap:'wrap',gap:'1rem'}}>
                    <div style={{textAlign:isRTL?'right':'left', flex: 1}}>
                    <h2 className="st" style={{fontSize:'2.25rem', color: theme.text}}>{sectionTitle}</h2>
                    <p style={{color: theme.subText,marginTop:'.5rem'}}>{sectionSub}</p>
                  </div>
                  <a href="/auth/register" className="tc" style={{color: theme.primary,fontWeight:700,display:'flex',alignItems:'center',gap:'.5rem',textDecoration:'none'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform=isRTL?'translateX(-8px)':'translateX(8px)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='none'}>
                    {isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                    {t.viewAll}
                    {!isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                  </a>
                </div>
                <div>
                  {(() => {
                    const players = (displayedPlayers || t.players).slice(0, 8);
                    
                    const renderPlayerCard = (p: any, i: number) => {
                      const isReal = !!p.id;
                      const name = isReal ? p.full_name || p.displayName : p.name;
                      const pos = isReal ? p.primary_position || p.position : p.pos;
                      const getImageUrl = (img: any): string => {
                        if (!img) return '';
                        let url = '';
                        if (typeof img === 'string') url = img;
                        else if (Array.isArray(img) && img.length > 0) return getImageUrl(img[0]);
                        else if (typeof img === 'object') url = img.url || img.path || img.src || '';
                        if (url && url.includes('supabase.co/storage/v1/object/public/')) {
                          const parts = url.split('supabase.co/storage/v1/object/public/');
                          if (parts.length === 2) {
                            const r2Url = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev';
                            url = `${r2Url}/${parts[1]}`;
                          }
                        } else if (url && url.includes('ekyerljzfokqimbabzxm.supabase.co')) {
                          url = url.replace('https://ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/', 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev/');
                        }
                        return url;
                      };
                      const realImageStr = getImageUrl(p.profile_image) || getImageUrl(p.avatar);
                      const currentImage = isReal ? realImageStr || PLAYER_IMGS[i % PLAYER_IMGS.length] : (pImgs[i % pImgs.length] || PLAYER_IMGS[i % PLAYER_IMGS.length]);
                      const badge = isReal ? p.country : p.badge;
                      const rating = RATINGS[i % RATINGS.length];
                      
                      return (
                        <div key={i} className={`tc5`} style={{ 
                          background: theme.cardBg, 
                          borderRadius: '20px', 
                          overflow: 'hidden', 
                          border: `1px solid ${theme.border}`, 
                          cursor: 'pointer', 
                          position: 'relative', 
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.05)' 
                        }}
                          onClick={() => setSelectedPlayer({ ...p, currentImage, name, pos, isReal, badge })}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = theme.primary; el.style.transform = 'translateY(-5px)'; el.style.boxShadow = `0 15px 35px ${theme.glow}`; const img = el.querySelector('.pi') as HTMLImageElement; if (img) img.style.transform = 'scale(1.08)'; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = theme.border; el.style.transform = 'none'; el.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)'; const img = el.querySelector('.pi') as HTMLImageElement; if (img) img.style.transform = 'scale(1)'; }}>
                          <div style={{ height: '14rem', position: 'relative', overflow: 'hidden' }}>
                            <img className="pi tc7" src={currentImage} alt={name || 'Player'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {badge && <div className="hl" style={{ position: 'absolute', top: '1rem', right: isRTL ? '1rem' : 'auto', left: isRTL ? 'auto' : '1rem', background: theme.primary, color: theme.btnText, padding: '.3rem .8rem', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', borderRadius: '6px', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{badge}</div>}
                          </div>
                          <div style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                              <div style={{ textAlign: isRTL ? 'right' : 'left', flex: 1, minWidth: 0 }}>
                                <h4 className="hl" style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text, marginBottom: '0.15rem' }}>{name}</h4>
                                <p style={{ fontSize: '.7rem', color: theme.subText, textTransform: 'uppercase', fontWeight: 600 }}>{pos || 'Player'}</p>
                              </div>
                              <div style={{ background: theme.panelBg, padding: '.3rem .6rem', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                                <span className="hl" style={{ color: theme.primary, fontWeight: 900, fontSize: '0.9rem' }}>{rating}</span>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem' }}>
                              {(PLAYER_STATS[i % PLAYER_STATS.length]).map((s, j) => (
                                <div key={j} style={{ background: theme.bg, padding: '.5rem .2rem', borderRadius: '10px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                                  <p style={{ fontSize: '8px', fontWeight: 700, color: theme.subText, textTransform: 'uppercase', marginBottom: '2px' }}>{s.l}</p>
                                  <span style={{ color: theme.text, fontSize: '0.85rem', fontWeight: 800 }}>{s.v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="talents-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '2rem' 
                      }}>
                        {players.map((p, i) => renderPlayerCard(p, i))}
                      </div>
                    );
                  })()}
                </div>
                
                <style>{`
                  .talentsTickerSwiper {
                    padding: 20px 0 40px 0 !important;
                  }
                  .talentsTickerSwiper .swiper-slide {
                    transition: transform 0.3s ease;
                  }
                `}</style>
              </div>
          </section>
          );
        })()}

        {/* CONTACT */}
        <section id="contact" className="reveal" style={{background: dark ? '#161b2e' : '#e2e8f0',borderTop:'1px solid rgba(70,70,78,.1)',borderBottom:'1px solid rgba(70,70,78,.1)'}}>
          <div className="ct">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4rem',alignItems:'center'}} className="g2">
              <div style={{textAlign:isRTL?'right':'left',order:isRTL?1:2}}>
                <h2 className="hl" style={{fontSize:'2.25rem',fontWeight:900,marginBottom:'1.5rem', color: theme.text}}>{t.contactTitle}</h2>
                <p style={{color: theme.subText,marginBottom:'2.5rem',fontSize:'1.125rem'}}>{t.contactSub}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                  {t.contacts.map((c,i)=>(
                    <a key={i} href={c.href} className="tc" style={{display:'flex',flexDirection:isRTL?'row-reverse':'row',alignItems:'center',gap:'1.5rem',padding:'1rem',borderRadius:'12px',textDecoration:'none',border:'1px solid transparent',color:'inherit'}}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.background=c.bg;el.style.borderColor=c.hb;el.style.boxShadow=`0 10px 30px ${c.bg}`;}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.background='transparent';el.style.borderColor='transparent';el.style.boxShadow='none';}}>
                      <div style={{width:'3.5rem',height:'3.5rem',background:c.bg,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {i===0 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                        {i===1 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 1.11L7.82 9.11a15 15 0 0 0 6 6l1.27-1.27a2 2 0 0 1 1.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>}
                        {i===2 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}
                      </div>
                      <div style={{textAlign:isRTL?'right':'left'}}>
                        <h4 className="hl" style={{fontWeight:700,fontSize:'1.25rem', color: theme.text}}>{c.title}</h4>
                        <p style={{color: theme.subText}} dir="ltr">{c.sub}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div style={{background: theme.cardBg,padding:'3rem',borderRadius:'16px',border:'1px solid rgba(70,70,78,.2)',order:isRTL?2:1}}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const email = formData.get('email') || '';
                    const name = formData.get('name') || '';
                    const subject = formData.get('subject') || (isRTL ? '  ' : 'Platform Inquiry');
                    const message = formData.get('message') || '';
                    
                    const bodyText = `${isRTL ? '' : 'Name'}: ${name}\n${isRTL ? '' : 'Email'}: ${email}\n\n${isRTL ? '' : 'Message'}:\n${message}`;
                    const targetUrl = `mailto:info@el7lm.com,mo.saudi19@gmail.com?subject=${encodeURIComponent(subject as string)}&body=${encodeURIComponent(bodyText)}`;
                    
                    try {
                      // alert to inform the user what is happening so they don't think it's broken
                      alert(isRTL ? "    ä«º  (Gmail/Outlook). Ñº      Ñ»     ." : "Opening your default email client. If nothing happens, please ensure you have a default mail app configured.");
                      
                      const link = document.createElement('a');
                      link.href = targetUrl;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch(err) {
                      console.error(err);
                    }
                  }}
                  style={{display:'flex',flexDirection:'column',gap:'1.5rem',textAlign:isRTL?'right':'left'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
                    {[{lbl:t.emailLbl,ph:t.emailPh,type:'email',name:'email'},{lbl:t.nameLbl,ph:t.namePh,type:'text',name:'name'}].map((f,i)=>(
                      <div key={i}>
                        <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color: theme.subText}}>{f.lbl}</label>
                        <input name={f.name} required className="inp" type={f.type} placeholder={f.ph} style={{width:'100%', padding:'1rem', background: theme.panelBg, border:`1px solid ${theme.border}`, color: theme.text, borderRadius:'4px'}}/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color: theme.subText}}>{t.subjectLbl}</label>
                    <input name="subject" required className="inp" type="text" placeholder={t.subjectPh} style={{width:'100%', padding:'1rem', background: theme.panelBg, border:`1px solid ${theme.border}`, color: theme.text, borderRadius:'4px'}}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color: theme.subText}}>{t.msgLbl}</label>
                    <textarea name="message" required className="inp" placeholder={t.msgPh} rows={4} style={{resize:'vertical', background: theme.panelBg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '1rem'}}></textarea>
                  </div>
                  <button type="submit" className="hl" style={{width:'100%',padding:'1rem',borderRadius:'2px',background: theme.btnGradient,color: theme.btnText,fontWeight:900,fontSize:'1rem',letterSpacing:'.1em',textTransform:'uppercase',border:'none',cursor:'pointer',transition:'filter .2s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.filter='brightness(1.1)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.filter='none'}>{t.sendBtn}</button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="reveal" style={{position:'relative',overflow:'hidden',background: theme.bg}}>
          <div style={{position:'absolute',inset:0,background:'rgba(189,196,239,.05)'}}></div>
          <div style={{position:'absolute',inset:0,background: theme.heroOverlay, opacity: 0.5}}></div>
          <div className="ct" style={{position:'relative',zIndex:10,textAlign:'center'}}>
            <h2 className="hl" style={{fontSize:'4rem',fontWeight:900,marginBottom:'2rem',lineHeight:1.25, color: theme.text}}>{t.ctaTitle}</h2>
            <p style={{fontSize:'1.25rem',color: theme.subText,marginBottom:'3rem',maxWidth:'42rem',margin:'0 auto 3rem'}}>{t.ctaSub}</p>
            <a href="/auth/register" className="hl tc" style={{background: theme.primary,color: theme.btnText,padding:'1.5rem 3rem',borderRadius:'2px',fontWeight:900,fontSize:'1.5rem',textDecoration:'none',display:'inline-block',boxShadow: dark ? '0 25px 50px rgba(189,196,239,.2)' : '0 25px 50px rgba(79,70,229,.3)'}}
              onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1.05)'}
              onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1)'}>{t.ctaBtn}</a>
          </div>
        </section>
      </main>

      <footer style={{background: dark ? '#080d20' : '#f1f5f9',borderTop:'1px solid rgba(70,70,78,.1)'}}>
        <div className="ct" style={{paddingTop:'5rem',paddingBottom:'2.5rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'3rem',marginBottom:'5rem',textAlign:isRTL?'right':'left'}} className="fc">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',justifyContent:isRTL?'flex-end':'flex-start',marginBottom:'1.5rem'}}>
                <img src="/el7lm-logo.png" alt="EL7LM" className="logo-16" style={{width:'16px', height:'16px', objectFit:'contain'}}/>
                <span className="hl" style={{fontSize:'1.5rem',fontWeight:900,color: dark ? '#bdc4ef' : '#4f46e5',textTransform:'uppercase',letterSpacing:'-0.05em'}}>EL7LM</span>
              </div>
              <p style={{color: theme.subText,fontSize:'.875rem',lineHeight:1.75,marginBottom:'1.5rem'}}>{t.footerDesc}</p>
              <div style={{display:'flex',gap:'.75rem',justifyContent:isRTL?'flex-end':'flex-start',flexWrap:'wrap'}}>
                {[
                  { id: 'fb', url: 'https://www.facebook.com/profile.php?id=61577797509887', icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path> },
                  { id: 'tt', url: 'https://www.tiktok.com/@meskel7lm', icon: <path d="M21 8V1c-2.4 0-4.8 1.4-5.4 3.6C14.8 6.4 15.5 8.7 17 10h-2c-3.1 0-5.6 2.5-5.6 5.6 0 2.2 1.3 4.1 3.2 5 1 .5 2.1.8 3.3.8 3.8 0 6.9-3.1 6.9-6.9 0-.4 0-.8-.1-1.2l-.1-.4C22.2 11.1 21.8 9.5 21 8z"></path> },
                  { id: 'yt', url: 'https://www.youtube.com/@el7lm25', icon: <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.46-5.58z M9.75 15.02V8.98L15.45 12z"></path> },
                  { id: 'ig', url: 'https://www.instagram.com/hagzzel7lm/', icon: <path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5z M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01"></path> },
                  { id: 'li', url: 'https://www.linkedin.com/showcase/108259352', icon: <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z"></path> }
                ].map((s, idx) => (
                  <a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="tc" style={{width:'2.5rem',height:'2.5rem',borderRadius:'50%',background:dark?'#1a1f32':'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',color:theme.subText,textDecoration:'none',border:`1px solid ${theme.border}`}}
                    onMouseEnter={e=>{const a=e.currentTarget as HTMLAnchorElement;a.style.background='#84d993';a.style.color='#003916';a.style.transform='translateY(-3px)'}}
                    onMouseLeave={e=>{const a=e.currentTarget as HTMLAnchorElement;a.style.background=dark?'#1a1f32':'#f1f5f9';a.style.color=theme.subText;a.style.transform='none'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {s.icon}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            {t.footerCols.map((col,i)=>(
              <div key={i}>
                <h4 className="hl" style={{color: theme.text,fontWeight:700,marginBottom:'2rem',fontSize:'1.25rem'}}>{col.title}</h4>
                <nav style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                  {col.links.map((lk,j)=>(
                    <a key={j} href={lk.h} className="tc" style={{color: theme.subText,fontSize:'.875rem',textDecoration:'none'}}
                      onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.color=(dark?'#bdc4ef':'#4f46e5')}
                      onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.color=theme.subText}>{lk.l}</a>
                  ))}
                </nav>
              </div>
            ))}
          </div>
          <div style={{paddingTop:'2rem',borderTop:`1px solid ${theme.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
            <p style={{fontSize:'.75rem',color: theme.subText,fontWeight:500,letterSpacing:'.025em'}}>{t.copyright}</p>
            <div style={{display:'flex',alignItems:'center',gap:'1.5rem'}}>
              <div style={{textAlign:isRTL?'right':'left'}}>
                <span style={{fontSize:'.75rem',color: theme.subText,display:'block'}}>{t.designedFor}</span>
                <span className="hl" style={{fontSize:'.875rem',color: theme.primary,fontWeight:900,letterSpacing:'.05em'}}>Mesk llc Qatar</span>
              </div>
                <div style={{width:'3.5rem',height:'3.5rem',borderRadius:'12px',background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',border:`1px solid ${theme.primary}`,display:'flex',alignItems:'center',justifyContent:'center',color: theme.primary,boxShadow: '0 10px 20px rgba(16,185,129,0.1)'}} className="ap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a href="https://wa.me/97470542458" target="_blank" rel="noopener noreferrer" className="wa tc"
        onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1.1)'}
        onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='none'}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.63 1.438h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${theme.bg}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.primary}; }
      ` }} />

      {/* PLAYER MODAL */}
      {selectedPlayer && (
        <div className="modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}} onClick={() => setSelectedPlayer(null)}>
          <div className="modal-content modal-grid" style={{background: theme.panelBg, border: `1px solid ${theme.border}`}} onClick={e => e.stopPropagation()}>
            <button style={{position:'absolute',top:'1.5rem',right:isRTL?'auto':'1.5rem',left:isRTL?'1.5rem':'auto',background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:'40px',height:'40px',cursor:'pointer',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setSelectedPlayer(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <div className="modal-image-area">
              <img src={selectedPlayer.currentImage} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
              <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'2rem',background:'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'}}>
                <h2 className="hl" style={{color:'white',fontSize:'2rem',margin:0}}>{selectedPlayer.name}</h2>
                <p style={{color: theme.primary, fontWeight:700, margin:'.25rem 0'}}>{selectedPlayer.pos}</p>
              </div>
            </div>

            <div style={{padding:'2.5rem', display:'flex', flexDirection:'column', justifyContent:'center'}}>
              <div style={{display:'flex',gap:'1rem',marginBottom:'2rem'}}>
                {selectedPlayer.badge && <span style={{background: theme.glow, color: theme.primary, padding:'.5rem 1rem', borderRadius:'8px', fontSize:'.875rem', fontWeight:700}}>{selectedPlayer.badge}</span>}
                <span style={{background: 'rgba(132,217,147,.1)', color: '#84d993', padding:'.5rem 1rem', borderRadius:'8px', fontSize:'.875rem', fontWeight:700}}>{extra.verified}</span>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem', marginBottom:'2.5rem'}}>
                {[
                  {label: extra.metrics[0], value: selectedPlayer.pace || 85},
                  {label: extra.metrics[1], value: selectedPlayer.shooting || 82},
                  {label: extra.metrics[2], value: selectedPlayer.passing || 78},
                  {label: extra.metrics[3], value: selectedPlayer.dribbling || 88}
                ].map((s,i)=>(
                  <div key={i}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
                      <span style={{color: theme.subText, fontSize:'.875rem'}}>{s.label}</span>
                      <span style={{color: theme.text, fontWeight:900}}>{s.value}</span>
                    </div>
                    <div style={{height:'6px', background: theme.border, borderRadius:'3px', overflow:'hidden'}}>
                      <div style={{height:'100%', width:`${s.value}%`, background: theme.primary, borderRadius:'3px'}} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="tc" style={{width:'100%', padding:'1.25rem', background: theme.primary, color: theme.btnText, border:'none', borderRadius:'12px', fontSize:'1.125rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'.75rem'}} onClick={() => window.location.href='/auth/login'}>
                {t.viewAll}
                {isRTL ? <svg style={{transform:'rotate(180deg)'}} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Play App Download Modal Popup */}
      <GooglePlayAppModal />

      {/* Floating Navigation Dock */}
      <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FloatingDock
            items={[
              { title: ui.dock[0], icon: <HomeIcon className="h-full w-full" />, href: '#hero' },
              { title: ui.dock[1], icon: <Info className="h-full w-full" />, href: '#how-to-use' },
              { title: ui.dock[2], icon: <LayoutGrid className="h-full w-full" />, href: '#features' },
              { title: ui.dock[3], icon: <Cpu className="h-full w-full" />, href: '#ai-analysis' },
              { title: ui.dock[4], icon: <MessageCircle className="h-full w-full" />, href: 'https://wa.me/966500000000' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

