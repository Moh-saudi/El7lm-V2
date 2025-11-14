'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion, useAnimation, useInView } from 'framer-motion';
import {
    ArrowRight,
    Award,
    ChevronDown,
    Facebook,
    Globe,
    Heart,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    Menu,
    MessageCircle,
    Moon,
    Phone,
    Shield,
    Star,
    Sun,
    Target,
    TrendingUp,
    Trophy,
    UserCheck,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import nextDynamic from 'next/dynamic';

// Lazy load ad components to improve performance
const AdBanner = nextDynamic(() => import('@/components/ads/AdBanner'), { ssr: false });
const ProfessionalAdPopup = nextDynamic(() => import('@/components/ads/ProfessionalAdPopup'), { ssr: false });

// Force dynamic rendering to avoid SSR issues with browser APIs
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// import './styles.css';

// Language configurations
const languages = {
  ar: {
    code: 'ar',
    name: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl'
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr'
  },
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    dir: 'ltr'
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    dir: 'ltr'
  }
};

// Translations
const translations = {
  ar: {
    // Navigation
    nav: {
      home: 'الرئيسية',
      about: 'من نحن',
      features: 'المميزات',
      careers: 'الوظائف',
      team: 'الفريق',
      support: 'الدعم',
      platform: 'شرح المنصة',
      contact: 'اتصل بنا',
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب'
    },
    // Hero Section
    hero: {
      title: 'منصة الحلم اول متجر الكتروني لتسويق وبيع اللاعبين في الشرق الاوسط',
      subtitle: 'متخصصين في حوكمة الاندية الرياضية - من شركة ميسك القطرية',

      learnMore: 'تعرف علينا',
      startJourney: 'ابدأ رحلتك',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      forPlayers: 'للاعبين',
      forParents: 'لأولياء الأمور',
      forClubs: 'للأندية'
    },
    // Features
    features: {
      title: 'ما نقدمه لك',
      subtitle: 'نحن نخلق مستقبل اكتشاف المواهب الرياضية في المنطقة',
      centralDatabase: {
        title: 'قاعدة بيانات مركزية',
        description: 'نخلق قاعدة بيانات مركزية لاكتشاف المواهب وحوكمة القطاع الرياضي'
      },
      professionalCV: {
        title: 'سيرة ذاتية مهنية',
        description: 'إنشاء سيرة ذاتية مهنية للاعبين والمنظمات بمعايير عالمية'
      },
      privacyProtection: {
        title: 'حماية الخصوصية',
        description: 'الحفاظ على الخصوصية وحقوق اللاعبين والأندية ووكلاء اللاعبين'
      },
      asianMarketing: {
        title: 'التسويق الآسيوي',
        description: 'أول شركة متخصصة في التسويق لكل الدول الآسيوية والخليج'
      },
      globalConnections: {
        title: 'شبكة عالمية',
        description: 'ربط اللاعبين المستقلين بالأندية في الخليج وتركيا وأوروبا وآسيا'
      },
      qatariExcellence: {
        title: 'التميز القطري',
        description: 'شركة ميسك القطرية رائدة في مجال اكتشاف وتطوير المواهب الكروية'
      },
      dreamSchool: {
        title: 'مدرسة منصة الحلم',
        description: 'تعليم شامل للغات والعلوم والمهارات الحياتية والـ Life Coach والإعداد البدني والتكتيكات'
      },
      referralSystem: {
        title: 'نظام الإحالات',
        description: 'اربح دولار واحد لكل صديق تدعوه للانضمام للمنصة - Make Money بسهولة'
      }
    },
    // Stats
    stats: {
      players: 'لاعب نشط',
      clubs: 'نادي شريك',
      countries: 'دولة',
      success: 'قصة نجاح'
    },
    // Testimonials
    testimonials: {
      title: 'ماذا يقول عملاؤنا؟',
      subtitle: 'تجارب حقيقية من لاعبين وأندية حققوا نجاحات مع منصتنا'
    },
    // Contact
    contact: {
      title: 'ابدأ رحلتك معنا',
      subtitle: 'انضم إلى مجتمعنا الرياضي واكتشف إمكانياتك الحقيقية',
      liveChat: 'الدردشة المباشرة',
      liveChatDesc: 'تواصل معنا مباشرة',
      phone: 'الهاتف',
      phoneEgypt: 'مصر',
      phoneQatar: 'قطر',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      startNow: 'ابدأ الآن مجاناً'
    },
    // Footer
    footer: {
      description: 'منصة الحلم اول متجر الكتروني لتسويق وبيع اللاعبين في الشرق الاوسط - متخصصين في حوكمة الاندية الرياضية',
      services: 'الخدمات',
      company: 'الشركة',
      support: 'الدعم',
      rights: 'جميع الحقوق محفوظة - شركة ميسك القطرية'
    }
  },
  en: {
    // Navigation
    nav: {
      home: 'Home',
      about: 'About',
      features: 'Features',
      careers: 'Careers',
      team: 'Team',
      support: 'Support',
      platform: 'Platform Guide',
      contact: 'Contact',
      login: 'Login',
      signup: 'Sign Up'
    },
    // Hero Section
    hero: {
      title: 'Discover Your Athletic Talent',
      subtitle: 'Comprehensive platform for developing and managing sports talents. We connect players with global opportunities',

      learnMore: 'Learn More',
      login: 'Login',
      register: 'Sign Up',
      forPlayers: 'For Players',
      forParents: 'For Parents',
      forClubs: 'For Clubs'
    },
    // Features
    features: {
      title: 'Why Choose El7lm?',
      subtitle: 'We provide you with the best tools and services to develop your sports talents',
      centralDatabase: {
        title: 'Central Database',
        description: 'We create a central database for talent discovery and sports sector governance'
      },
      professionalCV: {
        title: 'Professional CV',
        description: 'Creating professional CVs for players and organizations with global standards'
      },
      privacyProtection: {
        title: 'Privacy Protection',
        description: 'Protecting privacy and rights of players, clubs and player agents'
      },
      asianMarketing: {
        title: 'Asian Marketing',
        description: 'First company specialized in marketing to all Asian countries and the Gulf'
      },
      globalConnections: {
        title: 'Global Connections',
        description: 'Connecting independent players with clubs in the Gulf, Turkey, Europe and Asia'
      },
      qatariExcellence: {
        title: 'Qatari Excellence',
        description: 'Mesk Qatar Company leading in football talent discovery and development'
      },
      dreamSchool: {
        title: 'Dream Platform School',
        description: 'Comprehensive education in languages, sciences, life skills, Life Coach, physical preparation and tactics'
      },
      referralSystem: {
        title: 'Referral System',
        description: 'Earn one dollar for every friend you invite to join the platform - Make Money easily'
      }
    },
    // Stats
    stats: {
      players: 'Active Players',
      clubs: 'Partner Clubs',
      countries: 'Countries',
      success: 'Success Stories'
    },
    // Testimonials
    testimonials: {
      title: 'What Our Clients Say?',
      subtitle: 'Real experiences from players and clubs who achieved success with our platform'
    },
    // Contact
    contact: {
      title: 'Start Your Journey With Us',
      subtitle: 'Join our sports community and discover your true potential',
      liveChat: 'Live Chat',
      liveChatDesc: 'Contact us directly',
      phone: 'Phone',
      email: 'Email',
      startNow: 'Start Now For Free'
    },
    // Footer
    footer: {
      description: 'Comprehensive platform for developing and managing sports talents',
      services: 'Services',
      company: 'Company',
      support: 'Support',
      rights: 'All rights reserved'
    }
  },
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      about: 'À propos',
      features: 'Fonctionnalités',
      careers: 'Carrières',
      team: 'Équipe',
      support: 'Support',
      platform: 'Guide de la plateforme',
      contact: 'Contact',
      login: 'Connexion',
      signup: 'S\'inscrire'
    },
    // Hero Section
    hero: {
      title: 'Découvrez Votre Talent Sportif',
      subtitle: 'Plateforme complète pour développer et gérer les talents sportifs. Nous connectons les joueurs aux opportunités mondiales',

      learnMore: 'En Savoir Plus',
      login: 'Connexion',
      register: 'S\'inscrire',
      forPlayers: 'Pour les Joueurs',
      forParents: 'Pour les Parents',
      forClubs: 'Pour les Clubs'
    },
    // Features
    features: {
      title: 'Pourquoi Choisir El7lm?',
      subtitle: 'Nous vous fournissons les meilleurs outils et services pour développer vos talents sportifs',
      centralDatabase: {
        title: 'Base de Données Centrale',
        description: 'Nous créons une base de données centrale pour la découverte des talents et la gouvernance du secteur sportif'
      },
      professionalCV: {
        title: 'CV Professionnel',
        description: 'Création de CV professionnels pour les joueurs et organisations avec des standards mondiaux'
      },
      privacyProtection: {
        title: 'Protection de la Vie Privée',
        description: 'Protection de la vie privée et des droits des joueurs, clubs et agents de joueurs'
      },
      asianMarketing: {
        title: 'Marketing Asiatique',
        description: 'Première entreprise spécialisée dans le marketing vers tous les pays asiatiques et du Golfe'
      },
      globalConnections: {
        title: 'Connexions Mondiales',
        description: 'Connecter les joueurs indépendants avec les clubs du Golfe, Turquie, Europe et Asie'
      },
      qatariExcellence: {
        title: 'Excellence Qatarie',
        description: 'Société Mesk Qatar leader dans la découverte et développement des talents footballistiques'
      },
      dreamSchool: {
        title: 'École de la Plateforme Rêve',
        description: 'Éducation complète en langues, sciences, compétences de vie, Life Coach, préparation physique et tactiques'
      },
      referralSystem: {
        title: 'Système de Parrainage',
        description: 'Gagnez un dollar pour chaque ami que vous invitez à rejoindre la plateforme - Gagnez de l\'argent facilement'
      }
    },
    // Stats
    stats: {
      players: 'Joueurs Actifs',
      clubs: 'Clubs Partenaires',
      countries: 'Pays',
      success: 'Histoires de Succès'
    },
    // Testimonials
    testimonials: {
      title: 'Que Disent Nos Clients?',
      subtitle: 'Expériences réelles de joueurs et clubs qui ont réussi avec notre plateforme'
    },
    // Contact
    contact: {
      title: 'Commencez Votre Voyage Avec Nous',
      subtitle: 'Rejoignez notre communauté sportive et découvrez votre vrai potentiel',
      liveChat: 'Chat en Direct',
      liveChatDesc: 'Contactez-nous directement',
      phone: 'Téléphone',
      email: 'Email',
      startNow: 'Commencer Maintenant Gratuitement'
    },
    // Footer
    footer: {
      description: 'Plateforme complète pour développer et gérer les talents sportifs',
      services: 'Services',
      company: 'Entreprise',
      support: 'Support',
      rights: 'Tous droits réservés'
    }
  },
  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      about: 'Acerca de',
      features: 'Características',
      careers: 'Carreras',
      team: 'Equipo',
      support: 'Soporte',
      platform: 'Guía de la Plataforma',
      contact: 'Contacto',
      login: 'Iniciar Sesión',
      signup: 'Registrarse'
    },
    // Hero Section
    hero: {
      title: 'Descubre Tu Talento Deportivo',
      subtitle: 'Plataforma integral para desarrollar y gestionar talentos deportivos. Conectamos jugadores con oportunidades globales',

      learnMore: 'Conocer Más',
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      forPlayers: 'Para Jugadores',
      forParents: 'Para Padres',
      forClubs: 'Para Clubes'
    },
    // Features
    features: {
      title: '¿Por Qué Elegir El7lm?',
      subtitle: 'Te proporcionamos las mejores herramientas y servicios para desarrollar tus talentos deportivos',
      centralDatabase: {
        title: 'Base de Datos Central',
        description: 'Creamos una base de datos central para el descubrimiento de talentos y la gobernanza del sector deportivo'
      },
      professionalCV: {
        title: 'CV Profesional',
        description: 'Creación de CV profesionales para jugadores y organizaciones con estándares globales'
      },
      privacyProtection: {
        title: 'Protección de Privacidad',
        description: 'Protección de la privacidad y derechos de jugadores, clubes y agentes de jugadores'
      },
      asianMarketing: {
        title: 'Marketing Asiático',
        description: 'Primera empresa especializada en marketing a todos los países asiáticos y del Golfo'
      },
      globalConnections: {
        title: 'Conexiones Globales',
        description: 'Conectar jugadores independientes con clubes del Golfo, Turquía, Europa y Asia'
      },
      qatariExcellence: {
        title: 'Excelencia Qatarí',
        description: 'Empresa Mesk Qatar líder en descubrimiento y desarrollo de talentos futbolísticos'
      },
      dreamSchool: {
        title: 'Escuela de la Plataforma Sueño',
        description: 'Educación integral en idiomas, ciencias, habilidades de vida, Life Coach, preparación física y tácticas'
      },
      referralSystem: {
        title: 'Sistema de Referencias',
        description: 'Gana un dólar por cada amigo que invites a unirse a la plataforma - Gana dinero fácilmente'
      }
    },
    // Stats
    stats: {
      players: 'Jugadores Activos',
      clubs: 'Clubes Socios',
      countries: 'Países',
      success: 'Historias de Éxito'
    },
    // Testimonials
    testimonials: {
      title: '¿Qué Dicen Nuestros Clientes?',
      subtitle: 'Experiencias reales de jugadores y clubes que lograron éxito con nuestra plataforma'
    },
    // Contact
    contact: {
      title: 'Comienza Tu Viaje Con Nosotros',
      subtitle: 'Únete a nuestra comunidad deportiva y descubre tu verdadero potencial',
      liveChat: 'Chat en Vivo',
      liveChatDesc: 'Contáctanos directamente',
      phone: 'Teléfono',
      email: 'Email',
      startNow: 'Comenzar Ahora Gratis'
    },
    // Footer
    footer: {
      description: 'Plataforma integral para desarrollar y gestionar talentos deportivos',
      services: 'Servicios',
      company: 'Empresa',
      support: 'Soporte',
      rights: 'Todos los derechos reservados'
    }
  }
};

export default function AdvancedLandingPage() {
  // States
  const [currentLanguage, setCurrentLanguage] = useState('ar');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [expandedAboutSection, setExpandedAboutSection] = useState<number | null>(0);
  const [currentTopSlide, setCurrentTopSlide] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const ensureSessionId = () => {
    try {
      const key = 'el7lm_session_id';
      let id = localStorage.getItem(key);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'anonymous';
    }
  };

  // Get current translations
  const t = translations[currentLanguage as keyof typeof translations];
  const currentLang = languages[currentLanguage as keyof typeof languages];

  // Animation controls
  const heroControls = useAnimation();
  const featuresControls = useAnimation();
  const statsControls = useAnimation();

  // Refs for intersection observer
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  // Intersection observers
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  // Animation effects
  useEffect(() => {
    if (heroInView) {
      heroControls.start('visible');
    }
  }, [heroControls, heroInView]);

  useEffect(() => {
    if (featuresInView) {
      featuresControls.start('visible');
    }
  }, [featuresControls, featuresInView]);

  useEffect(() => {
    if (statsInView) {
      statsControls.start('visible');
    }
  }, [statsControls, statsInView]);

  // Auto-slide testimonials - معطل مؤقتاً لتجنب التحديثات اللحظية
  // useEffect(() => {
  //   const testimonialInterval = setInterval(() => {
  //     setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  //   }, 5000); // Change every 5 seconds

  //   return () => clearInterval(testimonialInterval);
  // }, []);

  // حماية بسيطة من التحديثات المتكررة
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      // منع التحديث التلقائي للصفحة بطريقة آمنة
      const handleBeforeUnload = (e) => {
        // فقط منع التحديث إذا كان هناك تغييرات غير محفوظة
        // e.preventDefault();
        // e.returnValue = '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      setIsInitialized(true);

      // Cleanup function
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isInitialized]);

  // Auto-slide top banner - معطل مؤقتاً لتجنب التحديثات اللحظية
  // useEffect(() => {
  //   const topSlideInterval = setInterval(() => {
  //     setCurrentTopSlide(prev => (prev + 1) % 2); // 2 slides: referral and school
  //   }, 4000); // Change every 4 seconds

  //   return () => clearInterval(topSlideInterval);
  // }, []);

  // Record landing page visit (visitor analytics)
  useEffect(() => {
    try {
      const sid = ensureSessionId();
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'visit', route: '/', sessionId: sid })
      }).catch(() => {});
    } catch {}
  }, []);

  // Sample data - realistic numbers for a startup
  const stats = [
    { number: '150+', label: t.stats.players },
    { number: '25+', label: t.stats.clubs },
    { number: '8', label: t.stats.countries },
    { number: '45+', label: t.stats.success }
  ];

  const features = [
    {
      icon: <Trophy className="w-8 h-8" />,
      title: t.features.centralDatabase.title,
      description: t.features.centralDatabase.description,
      color: 'text-blue-500'
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: t.features.professionalCV.title,
      description: t.features.professionalCV.description,
      color: 'text-green-500'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: t.features.privacyProtection.title,
      description: t.features.privacyProtection.description,
      color: 'text-red-500'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: t.features.asianMarketing.title,
      description: t.features.asianMarketing.description,
      color: 'text-purple-500'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: t.features.globalConnections.title,
      description: t.features.globalConnections.description,
      color: 'text-orange-500'
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: t.features.qatariExcellence.title,
      description: t.features.qatariExcellence.description,
      color: 'text-yellow-500'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: t.features.dreamSchool.title,
      description: t.features.dreamSchool.description,
      color: 'text-indigo-500'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: t.features.referralSystem.title,
      description: t.features.referralSystem.description,
      color: 'text-emerald-500'
    }
  ];

  const testimonials = [
    {
      name: 'عبدالله الكعبي',
      role: 'لاعب كرة قدم - قطر',
      content: 'منصة الحلم ساعدتني في الوصول لنادي في تركيا. الفريق محترف جداً والخدمة ممتازة!',
      rating: 5,
      avatar: '⚽',
      flag: '🇶🇦'
    },
    {
      name: 'أحمد حسن',
      role: 'لاعب شاب - مصر',
      content: 'حلمي أصبح حقيقة بفضل شركة ميسك. وصلت لنادي في الخليج وأنا سعيد جداً',
      rating: 5,
      avatar: '🏃‍♂️',
      flag: '🇪🇬'
    },
    {
      name: 'فيصل المري',
      role: 'مدير نادي - الإمارات',
      content: 'اكتشفنا مواهب مذهلة من خلال المنصة. جودة اللاعبين والخدمة فاقت توقعاتنا',
      rating: 5,
      avatar: '👔',
      flag: '🇦🇪'
    },
    {
      name: 'محمد الأنصاري',
      role: 'وكيل لاعبين - السعودية',
      content: 'أفضل منصة للتواصل مع اللاعبين الموهوبين. سهلت علي عملي كثيراً',
      rating: 5,
      avatar: '🤝',
      flag: '🇸🇦'
    }
  ];

  // Ensure currentTestimonial is within bounds
  const safeCurrentTestimonial = Math.max(0, Math.min(currentTestimonial, testimonials.length - 1));

  // Top Banner Slides Data
  const topSlides = [
    {
      type: 'referral',
      title: 'نظام الإحالات - اربح المال',
      subtitle: 'احصل على دولار واحد لكل صديق تدعوه للمنصة',
      icon: '💰',
      bgColor: 'from-green-500 to-emerald-600',
      buttonText: 'ابدأ الإحالة',
      buttonAction: '/auth/register'
    },
    {
      type: 'school',
      title: 'مدرسة منصة الحلم',
      subtitle: 'تعلم اللغات، العلوم، المهارات الحياتية، Life Coach، الإعداد البدني والتكتيكات',
      icon: '🎓',
      bgColor: 'from-blue-500 to-indigo-600',
      buttonText: 'انضم للمدرسة',
      buttonAction: '/dashboard/dream-academy'
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white'
          : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900'
      }`}
      dir={currentLang.dir}
    >
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        className={`${
          isDarkMode
            ? 'bg-gray-900/90 border-gray-700'
            : 'bg-white/90 border-blue-100'
        } backdrop-blur-md border-b sticky top-0 z-50 transition-all duration-500`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center space-x-3 space-x-reverse"
            >
              <motion.div
                animate={floatingAnimation}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-bold text-lg">E</span>
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                El7lm
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8 space-x-reverse">
              {[
                { key: 'home', label: t.nav.home, href: '/' },
                { key: 'about', label: t.nav.about, href: '/about' },
                { key: 'features', label: t.nav.features, href: '#features' },
                { key: 'careers', label: t.nav.careers, href: '/careers' },
                { key: 'platform', label: t.nav.platform, href: '/platform' },
                { key: 'contact', label: t.nav.contact, href: '/contact' }
              ].map((item) => (
                <motion.a
                  key={item.key}
                  href={item.href}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`${
                    isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
                  } transition-colors font-medium`}
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>

            {/* Controls */}
            <div className="flex items-center space-x-4 space-x-reverse">
              {/* Language Switcher */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                  className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                  } transition-all`}
                >
                  <span>{currentLang.flag}</span>
                  <span className="text-sm font-medium">{currentLang.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </motion.button>

                <AnimatePresence>
                  {isLanguageDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`absolute top-full ${currentLang.dir === 'rtl' ? 'right-0' : 'left-0'} mt-2 w-40 ${
                        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } border rounded-lg shadow-lg overflow-hidden`}
                    >
                      {Object.entries(languages).map(([code, lang]) => (
                        <motion.button
                          key={code}
                          whileHover={{ backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }}
                          onClick={() => {
                            setCurrentLanguage(code);
                            setIsLanguageDropdownOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 text-sm ${
                            currentLanguage === code
                              ? isDarkMode ? 'bg-gray-700' : 'bg-blue-50 text-blue-600'
                              : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          } transition-colors`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-700'
                } transition-all`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>

              {/* Auth Buttons */}
              <div className="hidden md:flex items-center space-x-3 space-x-reverse">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/auth/login'}
                  className={`rounded-full ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.nav.login}
                </Button>
                <Button
                  onClick={() => window.location.href = '/auth/register'}
                  className={`rounded-full ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}>
                  {t.nav.signup}
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`lg:hidden ${
                isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              } border-t`}
            >
              <div className="px-4 py-6 space-y-4">
                {[
                  { key: 'home', label: t.nav.home, href: '/' },
                  { key: 'about', label: t.nav.about, href: '/about' },
                  { key: 'features', label: t.nav.features, href: '#features' },
                  { key: 'careers', label: t.nav.careers, href: '/careers' },
                  { key: 'platform', label: t.nav.platform, href: '/platform' },
                  { key: 'contact', label: t.nav.contact, href: '/contact' }
                ].map((item) => (
                  <motion.a
                    key={item.key}
                    href={item.href}
                    whileHover={{ x: currentLang.dir === 'rtl' ? -10 : 10 }}
                    className="block py-2 text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </motion.a>
                ))}
                <div className="flex flex-col space-y-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/auth/login';
                      setIsMenuOpen(false);
                    }}
                    className={`rounded-full ${
                      isDarkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t.nav.login}
                  </Button>
                  <Button
                    onClick={() => {
                      window.location.href = '/auth/register';
                      setIsMenuOpen(false);
                    }}
                    className={`rounded-full ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}>
                    {t.nav.signup}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Top Banner Slider */}
      {currentTopSlide >= 0 && (
        <section className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTopSlide}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`bg-gradient-to-r ${topSlides[currentTopSlide].bgColor} text-white py-4 relative overflow-hidden`}
            >
          {/* Background Animation */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                x: [-100, 100, -100],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-0 left-0 w-full h-full bg-white/10"
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Content */}
              <div className="flex items-center space-x-4 space-x-reverse">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-3xl"
                >
                  {topSlides[currentTopSlide].icon}
                </motion.div>
                <div className="text-center md:text-right">
                  <h3 className="text-lg md:text-xl font-bold mb-1">
                    {topSlides[currentTopSlide].title}
                  </h3>
                  <p className="text-sm md:text-base opacity-90">
                    {topSlides[currentTopSlide].subtitle}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => window.location.href = topSlides[currentTopSlide].buttonAction}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-6 py-2 rounded-full font-semibold transition-all duration-500 ease-out whitespace-nowrap"
              >
                {topSlides[currentTopSlide].buttonText}
              </motion.button>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => setCurrentTopSlide(-1)} // Hide banner
                className="text-white/70 hover:text-white transition-colors md:absolute md:right-4"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center mt-3 space-x-2 space-x-reverse">
              {topSlides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentTopSlide(index)}
                  whileHover={{ scale: 1.2 }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentTopSlide
                      ? 'bg-white'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )}

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className={`absolute -top-40 ${currentLang.dir === 'rtl' ? '-left-40' : '-right-40'} w-80 h-80 ${
              isDarkMode ? 'bg-blue-500/20' : 'bg-blue-200/50'
            } rounded-full blur-3xl`}
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className={`absolute -bottom-40 ${currentLang.dir === 'rtl' ? '-right-40' : '-left-40'} w-80 h-80 ${
              isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-200/50'
            } rounded-full blur-3xl`}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={heroControls}
            className="text-center"
          >
            {/* Floating Elements with Happy Emojis */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Happy Emojis */}
              <motion.div
                animate={{
                  y: [-20, 20, -20],
                  x: [-10, 10, -10],
                  rotate: [0, 360, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-20 left-10 text-4xl"
              >
                ⚽
              </motion.div>
              <motion.div
                animate={{
                  y: [20, -20, 20],
                  x: [10, -10, 10],
                  rotate: [0, -360, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-32 right-16 text-3xl"
              >
                🏆
              </motion.div>
              <motion.div
                animate={{
                  y: [-15, 15, -15],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-20 left-20 text-3xl"
              >
                🎯
              </motion.div>
              <motion.div
                animate={{
                  y: [10, -10, 10],
                  x: [-5, 5, -5],
                  rotate: [0, 180, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-1/2 right-10 text-3xl"
              >
                🌟
              </motion.div>
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  scale: [1, 1.3, 1]
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-32 right-32 text-2xl"
              >
                🎉
              </motion.div>
              <motion.div
                animate={{
                  y: [15, -15, 15],
                  x: [5, -5, 5],
                  rotate: [0, -180, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-40 left-1/3 text-3xl"
              >
                🚀
              </motion.div>
              <motion.div
                animate={{
                  y: [-25, 25, -25],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-40 left-1/2 text-2xl"
              >
                💫
              </motion.div>
            </div>

            {/* Main Content */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 leading-tight"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                <motion.span
                  animate={{
                    backgroundPosition: ['0%', '100%', '0%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent bg-[length:200%_auto]"
                >
                  {t.hero.title}
                </motion.span>
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className={`text-sm sm:text-base md:text-lg lg:text-xl ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                } max-w-4xl mx-auto leading-relaxed px-4 sm:px-0`}
              >
                {t.hero.subtitle}
              </motion.p>
            </motion.div>

            {/* Target Audience Badges */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {[
                { icon: <UserCheck className="w-4 h-4" />, text: t.hero.forPlayers, color: 'bg-blue-500' },
                { icon: <Heart className="w-4 h-4" />, text: t.hero.forParents, color: 'bg-green-500' },
                { icon: <Trophy className="w-4 h-4" />, text: t.hero.forClubs, color: 'bg-purple-500' }
              ].map((badge, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`flex items-center space-x-2 space-x-reverse ${badge.color} text-white px-4 py-2 rounded-full shadow-lg text-sm`}
                >
                  {badge.icon}
                  <span className="font-medium">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Animated Features Text */}
            <motion.div
              variants={itemVariants}
              className="max-w-4xl mx-auto mb-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-center">
                {[
                  { icon: '🗄️', text: 'قاعدة بيانات مركزية للمواهب' },
                  { icon: '📄', text: 'سيرة ذاتية مهنية للاعبين' },
                  { icon: '🔒', text: 'حماية خصوصية وحقوق اللاعبين' },
                  { icon: '🌏', text: 'تسويق متخصص للدول الآسيوية' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 1 + index * 0.3,
                      duration: 0.8,
                      type: "spring",
                      bounce: 0.4
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`${
                      isDarkMode ? 'bg-gray-800/80' : 'bg-white/80'
                    } backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg border border-blue-200/50`}
                  >
                    <motion.span
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.5
                      }}
                      className="text-xl inline-block mb-1"
                    >
                      {feature.icon}
                    </motion.span>
                    <p className="text-xs font-medium">{feature.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="
                cta-container
                flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4
                justify-center items-center
                px-4 sm:px-6 md:px-0
                max-w-2xl mx-auto
              "
            >

              <motion.a
                href="#about"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`
                  cta-button
                  border-2 rounded-full font-semibold transition-all duration-500 ease-out inline-flex items-center justify-center
                  /* Mobile: Full width, smaller padding */
                  w-full sm:w-auto px-4 py-3 text-sm
                  /* Tablet: Medium padding */
                  md:px-6 md:py-3 md:text-base
                  /* Desktop: Larger padding */
                  lg:px-8 lg:py-4 lg:text-lg
                  /* Colors - Light Mode */
                  ${!isDarkMode ?
                    'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-lg'
                    :
                    'border-blue-400 text-blue-400 hover:bg-blue-500 hover:border-blue-500 hover:text-white hover:shadow-blue-500/25'
                  }
                  /* Mobile specific improvements */
                  min-h-[44px] sm:min-h-[48px] lg:min-h-[52px]
                  /* Text alignment */
                  text-center
                `}
              >
                <span className="flex items-center space-x-2 space-x-reverse">
                  <span>{t.hero.learnMore}</span>
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.div>
                </span>
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = '/auth/register'}
                className={`
                  cta-button
                  bg-gradient-to-r rounded-full font-semibold shadow-xl transition-all duration-300 inline-flex items-center justify-center
                  /* Mobile: Full width, smaller padding */
                  w-full sm:w-auto px-4 py-3 text-sm
                  /* Tablet: Medium padding */
                  md:px-6 md:py-3 md:text-base
                  /* Desktop: Larger padding */
                  lg:px-8 lg:py-4 lg:text-lg
                  /* Colors */
                  ${isDarkMode
                    ? 'from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-green-500/25'
                    : 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25'
                  }
                  text-white
                  /* Mobile specific improvements */
                  min-h-[44px] sm:min-h-[48px] lg:min-h-[52px]
                `}
              >
                <span className="flex items-center space-x-2 space-x-reverse">
                  <span>{t.hero.startJourney}</span>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  </motion.div>
                </span>
              </motion.button>
            </motion.div>

            {/* Auth Buttons in Hero */}
            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0 max-w-lg mx-auto"
            >
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/auth/login'}
                className={`
                  w-full sm:w-auto px-6 py-3 rounded-full font-medium transition-all duration-300
                  ${isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }
                  shadow-lg hover:shadow-xl
                `}
              >
                {t.hero.login}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/auth/register'}
                className={`
                  w-full sm:w-auto px-6 py-3 rounded-full font-medium transition-all duration-300
                  ${isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                  shadow-lg hover:shadow-xl
                `}
              >
                {t.hero.register}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Ads Section - Display ads at the top of landing page (right after Hero) */}
      <section className="py-8 bg-gradient-to-br from-gray-50 to-blue-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdBanner location="landing" maxAds={3} className="mb-4" />
        </div>
      </section>

      {/* Stats Section */}
      <motion.section
        ref={statsRef}
        className={`py-20 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={statsControls}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center group"
              >
                <motion.div
                  className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                >
                  {stat.number}
                </motion.div>
                <div className={`${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                } font-medium text-lg group-hover:text-blue-600 transition-colors`}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section
        ref={featuresRef}
        id="features"
        className={`py-20 ${
          isDarkMode
            ? 'bg-gradient-to-br from-gray-900 to-gray-800'
            : 'bg-gradient-to-br from-blue-50 to-indigo-50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={featuresControls}
            className="text-center mb-16"
          >
            <motion.h2
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              {t.features.title}
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className={`text-xl ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              } max-w-3xl mx-auto`}
            >
              {t.features.subtitle}
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={featuresControls}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{
                  scale: 1.02,
                  y: -3,
                  rotateY: 2
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="group"
              >
                <Card className={`${
                  isDarkMode
                    ? 'bg-gray-800/80 border-gray-700'
                    : 'bg-white/90 border-gray-200'
                } backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-500 h-full overflow-hidden`}>
                  <CardContent className="p-8 text-center relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500" />

                    <motion.div
                      className={`mb-6 flex justify-center ${feature.color}`}
                      animate={{
                        rotateY: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: index * 0.5
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-xl font-bold mb-4 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className={`${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    } leading-relaxed`}>
                      {feature.description}
                    </p>

                    {/* Hover effect */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Sports Opportunities Section - Unified */}
      <section className={`py-20 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-600 to-indigo-700'
      } text-white relative overflow-hidden`}>
        {/* Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 right-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"
          />
          <motion.div
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-10 w-40 h-40 bg-green-400/10 rounded-full blur-2xl"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center items-center space-x-4 space-x-reverse mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                🏆
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl"
              >
                ⚽
              </motion.div>
              <motion.div
                animate={{ rotate: [0, -360] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                🌟
              </motion.div>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              الفرص الرياضية
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              بطولات، مباريات، ومعايشات لتطوير مواهبك الرياضية
            </p>
          </motion.div>

          {/* Opportunities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tournaments */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`${
                isDarkMode ? 'bg-gray-800/90' : 'bg-white/15'
              } backdrop-blur-sm rounded-2xl p-8 text-center`}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="text-5xl mb-6"
              >
                🏆
              </motion.div>
              <h3 className="text-2xl font-bold mb-4">البطولات الدولية</h3>
              <div className="space-y-3 mb-6">
                {[
                  { name: 'كأس الخليج', flag: '🇶🇦' },
                  { name: 'بطولة آسيا', flag: '🇹🇭' },
                  { name: 'دوري أوروبا', flag: '🇹🇷' }
                ].map((tournament, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="font-medium">{tournament.name}</span>
                    <span className="text-xl">{tournament.flag}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => window.location.href = '/auth/register'}
                className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-6 py-2 rounded-full font-semibold w-full"
              >
                شاهد البطولات
              </Button>
            </motion.div>

            {/* Experiences */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`${
                isDarkMode ? 'bg-gray-800/90' : 'bg-white/15'
              } backdrop-blur-sm rounded-2xl p-8 text-center`}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-5xl mb-6"
              >
                🌟
              </motion.div>
              <h3 className="text-2xl font-bold mb-4">المعايشات</h3>
              <div className="space-y-3 mb-6">
                <div className="bg-green-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">مجانية</span>
                    <span className="text-xl">🆓</span>
                  </div>
                  <p className="text-sm opacity-80 mt-1">تجارب أساسية</p>
                </div>
                <div className="bg-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">احترافية</span>
                    <span className="text-xl">💎</span>
                  </div>
                  <p className="text-sm opacity-80 mt-1">تجارب متقدمة</p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/auth/register'}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold w-full"
              >
                استكشف المعايشات
              </Button>
            </motion.div>

            {/* Training Matches */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`${
                isDarkMode ? 'bg-gray-800/90' : 'bg-white/15'
              } backdrop-blur-sm rounded-2xl p-8 text-center`}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-5xl mb-6"
              >
                ⚽
              </motion.div>
              <h3 className="text-2xl font-bold mb-4">المباريات التدريبية</h3>
              <div className="space-y-3 mb-6">
                <div className="bg-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">محلية</span>
                    <span className="text-xl">🏠</span>
                  </div>
                  <p className="text-sm opacity-80 mt-1">في الخليج</p>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">دولية</span>
                    <span className="text-xl">🌍</span>
                  </div>
                  <p className="text-sm opacity-80 mt-1">في آسيا وأوروبا</p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/auth/register'}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-semibold w-full"
              >
                انضم للمباريات
              </Button>
            </motion.div>
          </div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-16"
          >
            <div className={`${
              isDarkMode ? 'bg-gray-800/50' : 'bg-white/20'
            } backdrop-blur-sm rounded-2xl p-8`}>
              <h3 className="text-2xl font-bold text-center mb-8">ما نوفره لك</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { icon: '🏆', number: '8+', label: 'بطولات سنوياً' },
                  { icon: '⚽', number: '20+', label: 'مباراة شهرياً' },
                  { icon: '🌟', number: '15+', label: 'معايشة متاحة' },
                  { icon: '🎯', number: '100+', label: 'فرصة احترافية' }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl mb-2">{stat.icon}</div>
                    <div className="text-2xl font-bold mb-1">{stat.number}</div>
                    <div className="text-sm opacity-80">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className={`py-20 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 to-gray-800'
          : 'bg-gradient-to-br from-indigo-50 to-purple-50'
      } relative overflow-hidden`}>
        {/* Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              rotate: -360,
              scale: [1.1, 1, 1.1]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-indigo-200/20 to-blue-200/20 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              من نحن؟
            </h2>
            <p className={`text-xl ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            } max-w-4xl mx-auto leading-relaxed`}>
              منصة الحلم اول متجر الكتروني لتسويق وبيع اللاعبين في الشرق الاوسط - متخصصين في حوكمة الاندية الرياضية
            </p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-16 items-start">
            {/* Text Content - Expanded */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="xl:col-span-2"
            >
              <div className="space-y-4">
                {[
                  {
                    icon: '🇶🇦',
                    title: 'شركة قطرية رائدة',
                    content: 'منصة الحلم اول متجر الكتروني لتسويق وبيع اللاعبين في الشرق الاوسط. متخصصين في حوكمة الاندية الرياضية ونعمل على تطوير القطاع الرياضي في المنطقة من خلال حلول تقنية متقدمة.',
                    color: 'from-blue-500 to-indigo-600'
                  },
                  {
                    icon: '🌍',
                    title: 'شبكة عالمية واسعة',
                    content: 'نربط اللاعبين بالأندية في الخليج وتركيا وأوروبا وتايلاند وآسيا من خلال شبكتنا الواسعة من الشركاء. لدينا علاقات قوية مع أكثر من 100 نادي ووكيل في 15 دولة مختلفة.',
                    color: 'from-green-500 to-emerald-600'
                  },
                  {
                    icon: '🎯',
                    title: 'تخصص آسيوي فريد',
                    content: 'أول شركة متخصصة في التسويق لكل الدول الآسيوية والخليج مع فهم عميق للسوق المحلي. نفهم احتياجات كل منطقة ونقدم حلولاً مخصصة لكل سوق.',
                    color: 'from-purple-500 to-pink-600'
                  },
                  {
                    icon: '🔒',
                    title: 'الأمان والخصوصية',
                    content: 'نلتزم بأعلى معايير الحماية والخصوصية لبيانات اللاعبين والأندية. جميع المعلومات محمية بتشفير متقدم ونظام أمان متعدد المستويات.',
                    color: 'from-red-500 to-orange-600'
                  }
                ].map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`${
                      isDarkMode ? 'bg-gray-800/50' : 'bg-white/70'
                    } backdrop-blur-sm rounded-xl border ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    } overflow-hidden`}
                  >
                    <motion.button
                      onClick={() => setExpandedAboutSection(expandedAboutSection === index ? null : index)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full p-6 text-right transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <div className={`w-12 h-12 bg-gradient-to-r ${section.color} rounded-xl flex items-center justify-center shadow-lg`}>
                            <span className="text-2xl">{section.icon}</span>
                          </div>
                          <h3 className="text-xl font-bold">{section.title}</h3>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedAboutSection === index ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-6 h-6" />
                        </motion.div>
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {expandedAboutSection === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6">
                            <p className={`${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            } leading-relaxed text-lg`}>
                              {section.content}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Visual Content - Moved Right */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="xl:col-span-1 relative"
            >
              <div className={`${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-2xl p-8 shadow-2xl relative overflow-hidden`}>
                {/* Animated Background */}
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  />
                  <motion.div
                    animate={{
                      rotate: [360, 0],
                      scale: [1.2, 1, 1.2]
                    }}
                    transition={{
                      duration: 15,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-6xl mb-6"
                  >
                    ⚽
                  </motion.div>
                  <h3 className="text-xl font-bold mb-4">منصة الحلم</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 text-sm`}>
                    نحن نخلق قاعدة بيانات مركزية لاكتشاف المواهب وحوكمة القطاع الرياضي
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { number: '2024', label: 'تأسست' },
                      { number: '8+', label: 'دول' },
                      { number: '150+', label: 'لاعب' },
                      { number: '25+', label: 'نادي' }
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="text-center"
                      >
                        <div className="text-xl font-bold text-blue-600 mb-1">
                          {stat.number}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {stat.label}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mt-6"
                  >
                    <Button
                      onClick={() => window.location.href = '/auth/register'}
                      className={`w-full ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white py-3 rounded-xl font-semibold`}
                    >
                      انضم للمنصة
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  rotate: [0, 360, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-6 -right-6 text-3xl"
              >
                🏆
              </motion.div>
              <motion.div
                animate={{
                  y: [10, -10, 10],
                  rotate: [0, -360, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -bottom-6 -left-6 text-3xl"
              >
                🌟
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>





      {/* Testimonials Section - Interactive Slider */}
      <section className={`py-20 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2760%27%20height=%2760%27%20viewBox=%270%200%2060%2060%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg%20fill=%27none%27%20fill-rule=%27evenodd%27%3E%3Cg%20fill=%27%23000%27%20fill-opacity=%270.1%27%3E%3Ccircle%20cx=%2730%27%20cy=%2730%27%20r=%272%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              {t.testimonials.title}
            </h2>
            <p className={`text-xl ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            } max-w-3xl mx-auto`}>
              {t.testimonials.subtitle}
            </p>
          </motion.div>

          {/* Testimonials Slider */}
          <div className="relative max-w-4xl mx-auto">
            <motion.div
              key={safeCurrentTestimonial}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Card className={`${
                isDarkMode
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-gray-200'
              } border-0 shadow-2xl overflow-hidden`}>
                <CardContent className="p-12 text-center">
                  {/* Stars */}
                  <div className="flex justify-center mb-6">
                    {[...Array(testimonials[safeCurrentTestimonial]?.rating || 5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                      >
                        <Star className="w-6 h-6 text-yellow-400 fill-current mx-1" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Quote */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-8 leading-relaxed text-xl italic font-medium`}
                  >
                    "{testimonials[safeCurrentTestimonial]?.content || ''}"
                  </motion.p>

                  {/* Author Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-center space-x-4 space-x-reverse"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="text-5xl">{testimonials[safeCurrentTestimonial]?.avatar || '👤'}</span>
                      <span className="text-2xl">{testimonials[safeCurrentTestimonial]?.flag || '🏳️'}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-blue-600">
                        {testimonials[safeCurrentTestimonial]?.name || 'مستخدم'}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {testimonials[safeCurrentTestimonial]?.role || 'مستخدم'}
                      </div>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Navigation Dots */}
            <div className="flex justify-center space-x-3 space-x-reverse">
              {testimonials.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === safeCurrentTestimonial
                      ? 'bg-blue-600 shadow-lg'
                      : isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-500'
                        : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <motion.button
              onClick={() => setCurrentTestimonial(prev => prev === 0 ? Math.max(0, testimonials.length - 1) : prev - 1)}
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              className={`absolute top-1/2 transform -translate-y-1/2 ${
                currentLang.dir === 'rtl' ? 'right-4' : 'left-4'
              } p-3 rounded-full ${
                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              } shadow-lg hover:shadow-xl transition-all`}
            >
              <ArrowRight className={`w-6 h-6 ${currentLang.dir === 'rtl' ? '' : 'rotate-180'}`} />
            </motion.button>

            <motion.button
              onClick={() => setCurrentTestimonial(prev => testimonials.length > 0 ? (prev + 1) % testimonials.length : 0)}
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              className={`absolute top-1/2 transform -translate-y-1/2 ${
                currentLang.dir === 'rtl' ? 'left-4' : 'right-4'
              } p-3 rounded-full ${
                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              } shadow-lg hover:shadow-xl transition-all`}
            >
              <ArrowRight className={`w-6 h-6 ${currentLang.dir === 'rtl' ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>

          {/* Additional Floating Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                y: [-10, 10, -10],
                rotate: [0, 360, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-20 left-10 text-2xl opacity-30"
            >
              💬
            </motion.div>
            <motion.div
              animate={{
                y: [10, -10, 10],
                rotate: [0, -360, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute bottom-20 right-10 text-2xl opacity-30"
            >
              ❤️
            </motion.div>
            <motion.div
              animate={{
                y: [-15, 15, -15],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/3 right-20 text-2xl opacity-30"
            >
              👏
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className={`py-20 ${
          isDarkMode
            ? 'bg-gradient-to-br from-blue-900 to-indigo-900'
            : 'bg-gradient-to-br from-blue-600 to-indigo-700'
        } text-white relative overflow-hidden`}
      >
        {/* Background Animation */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 left-0 w-full h-full opacity-10"
          >
            <div className="w-96 h-96 bg-white rounded-full absolute top-10 left-10" />
            <div className="w-64 h-64 bg-white rounded-full absolute bottom-20 right-20" />
            <div className="w-32 h-32 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6">
              {t.contact.title}
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              {t.contact.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          >
            {[
              {
                icon: MessageCircle,
                title: t.contact.liveChat,
                desc: t.contact.liveChatDesc,
                action: 'chat'
              },
              {
                icon: Phone,
                title: `${t.contact.phone} - ${t.contact.phoneQatar}`,
                desc: '+974 72053188',
                action: 'whatsapp',
                link: 'https://wa.me/97472053188'
              },
              {
                icon: Phone,
                title: `${t.contact.phone} - ${t.contact.phoneEgypt}`,
                desc: '+20 101 779 9580',
                action: 'whatsapp',
                link: 'https://wa.me/201017799580'
              },
              {
                icon: Mail,
                title: t.contact.email,
                desc: 'info@el7lm.com',
                action: 'email',
                link: 'mailto:info@el7lm.com'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center group"
              >
                <motion.button
                  onClick={() => {
                    if (item.action === 'whatsapp' && item.link) {
                      window.open(item.link, '_blank');
                    } else if (item.action === 'email' && item.link) {
                      window.open(item.link);
                    }
                  }}
                  className="w-full cursor-pointer"
                >
                  <motion.div
                    animate={{
                      y: [-5, 5, -5],
                      rotate: [0, 5, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                    className="mx-auto mb-4 p-4 bg-white/20 rounded-full w-fit group-hover:bg-white/30 transition-colors"
                  >
                    <item.icon className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="opacity-80">{item.desc}</p>
                  {item.action === 'whatsapp' && (
                    <div className="mt-2 text-sm opacity-70">
                      انقر للمراسلة عبر واتساب
                    </div>
                  )}
                  {item.action === 'email' && (
                    <div className="mt-2 text-sm opacity-70">
                      انقر لإرسال إيميل
                    </div>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>

          {/* Address Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12"
          >
            {/* Qatar Address */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`${
                isDarkMode ? 'bg-gray-800/50' : 'bg-white/20'
              } backdrop-blur-sm rounded-2xl p-6 text-center`}
            >
              <div className="text-3xl mb-4">🇶🇦</div>
              <h3 className="text-xl font-semibold mb-3">مكتب قطر</h3>
              <div className="flex items-start space-x-2 space-x-reverse mb-2">
                <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                <p className="text-sm opacity-90 leading-relaxed">
                  98 برج مركز قطر للمال<br />
                  الدوحة - قطر
                </p>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse justify-center">
                <Phone className="w-4 h-4" />
                <a
                  href="https://wa.me/97472053188"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm opacity-90 hover:opacity-100 transition-opacity underline"
                >
                  +974 72053188
                </a>
              </div>
            </motion.div>

            {/* Egypt Address */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`${
                isDarkMode ? 'bg-gray-800/50' : 'bg-white/20'
              } backdrop-blur-sm rounded-2xl p-6 text-center`}
            >
              <div className="text-3xl mb-4">🇪🇬</div>
              <h3 className="text-xl font-semibold mb-3">مكتب مصر</h3>
              <div className="flex items-start space-x-2 space-x-reverse mb-2">
                <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                <p className="text-sm opacity-90 leading-relaxed">
                  60 شارع هشام لبيب - مصطفى النحاس<br />
                  مدينة نصر - القاهرة - مصر
                </p>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse justify-center">
                <Phone className="w-4 h-4" />
                <a
                  href="https://wa.me/201017799580"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm opacity-90 hover:opacity-100 transition-opacity underline"
                >
                  +20 101 779 9580
                </a>
              </div>
            </motion.div>
          </motion.div>

          {/* Social Media Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mb-12"
          >
            <h3 className="text-2xl font-bold mb-6">تابعنا على</h3>
            <div className="flex justify-center items-center space-x-6 space-x-reverse">
              {[
                {
                  name: 'TikTok',
                  icon: (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.43Z"/>
                    </svg>
                  ),
                  url: 'https://www.tiktok.com/@meskel7lm',
                  color: 'hover:bg-black/20',
                  bgColor: 'bg-black/10'
                },
                {
                  name: 'Instagram',
                  icon: <Instagram className="w-6 h-6" />,
                  url: 'https://www.instagram.com/hagzzel7lm/',
                  color: 'hover:bg-pink-500/20',
                  bgColor: 'bg-pink-500/10'
                },
                {
                  name: 'Facebook',
                  icon: <Facebook className="w-6 h-6" />,
                  url: 'https://www.facebook.com/profile.php?id=61577797509887',
                  color: 'hover:bg-blue-500/20',
                  bgColor: 'bg-blue-500/10'
                },
                {
                  name: 'LinkedIn',
                  icon: <Linkedin className="w-6 h-6" />,
                  url: 'https://www.linkedin.com/showcase/el7lm/',
                  color: 'hover:bg-blue-600/20',
                  bgColor: 'bg-blue-600/10'
                }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{
                    scale: 1.2,
                    y: -5,
                    rotate: [0, -10, 10, 0]
                  }}
                  whileTap={{ scale: 0.9 }}
                  className={`
                    w-16 h-16 rounded-full backdrop-blur-sm border border-white/30
                    flex items-center justify-center transition-all duration-300
                    ${social.color} ${social.bgColor}
                    group relative
                  `}
                >
                  <div className="group-hover:scale-105 transition-transform duration-500 ease-out">
                    {social.icon}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {social.name}
                  </div>
                </motion.a>
              ))}
            </div>
            <p className="text-sm opacity-70 mt-4">
              انضم لمجتمعنا على منصات التواصل الاجتماعي
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center"
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                y: -2,
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/auth/register'}
              className={`${
                isDarkMode
                  ? 'bg-white text-blue-600 hover:bg-gray-100'
                  : 'bg-white text-blue-600 hover:bg-gray-100'
              } px-8 sm:px-10 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-bold shadow-xl transform transition-all inline-flex items-center space-x-3 space-x-reverse w-full sm:w-auto justify-center`}
            >
              <span>{t.contact.startNow}</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Professional Ad Popup - Shows popup ads */}
      <ProfessionalAdPopup location="landing" />

      {/* Footer */}
      <footer className={`${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-900'
      } text-white py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-3 space-x-reverse mb-6">
                <motion.div
                  animate={floatingAnimation}
                  className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <span className="text-white font-bold text-lg">E</span>
                </motion.div>
                <span className="text-2xl font-bold">El7lm</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                {t.footer.description}
              </p>
            </motion.div>

            {[
              {
                title: 'الخدمات',
                items: [
                  { name: 'اكتشاف المواهب', link: '/dashboard/player' },
                  { name: 'مدرسة الحلم', link: '/dashboard/dream-academy' },
                  { name: 'نظام الإحالات', link: '/dashboard/player/referrals' },
                  { name: 'التدريب الاحترافي', link: '/dashboard/trainer' }
                ]
              },
              {
                title: 'الشركة',
                items: [
                  { name: 'من نحن', link: '/about' },
                  { name: 'فريق العمل', link: '#about' },
                  { name: 'الوظائف', link: '/careers' },
                  { name: 'شرح المنصة', link: '/platform' }
                ]
              },
              {
                title: 'الدعم',
                items: [
                  { name: 'مركز المساعدة', link: '/support' },
                  { name: 'اتصل بنا', link: '#contact' },
                  { name: 'سياسة الخصوصية', link: '/privacy' },
                  { name: 'الأسئلة الشائعة', link: '/support' }
                ]
              },
              {
                title: 'لوحات التحكم',
                items: [
                  { name: 'لاعب', link: '/dashboard/player' },
                  { name: 'نادي', link: '/dashboard/club' },
                  { name: 'أكاديمية', link: '/dashboard/academy' },
                  { name: 'وكيل', link: '/dashboard/agent' }
                ]
              }
            ].map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <h3 className="font-semibold text-lg mb-6">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <motion.li key={itemIndex}>
                      <motion.a
                        href={item.link}
                        whileHover={{ x: currentLang.dir === 'rtl' ? -5 : 5 }}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer inline-block"
                      >
                        {item.name}
                      </motion.a>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="border-t border-gray-800 pt-8 text-center"
          >
            <p className="text-gray-400">
              &copy; 2024 El7lm. {t.footer.rights}
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
