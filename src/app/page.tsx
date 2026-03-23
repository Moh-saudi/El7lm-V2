'use client';
import { useState, useEffect } from 'react';

const TR = {
  ar: {
    dir:'rtl', lang:'ar',
    joinBtn:'انضم الآن',
    nav:['الرئيسية','تطبيق حجز','الأكاديمية','الأندية','البطولات'],
    badge:'EL7LM platform with V Lab Ai.',
    h1a:'لا تؤجل حلمك،',
    h1b:'واجعل البداية اليوم.',
    heroSub:'أكبر منصة لاكتشاف المواهب الكروية في الشرق الأوسط. نستخدم الذكاء الاصطناعي لتحليل أدائك وربطك مباشرة مع أفضل الكشافين والأندية العالمية.',
    startFree:'ابدأ رحلتك مجاناً',
    login:'تسجيل الدخول',
    partnerLabel:'شركاء موثوقون من أفضل المؤسسات',
    featuresTitle:'أدوات النجاح الرقمية',
    features:[
      {icon:'analytics',title:'تحليل المهارات بالذكاء الاصطناعي',desc:'نستخدم أحدث تقنيات الرؤية الحاسوبية لتحليل فيديوهات أدائك واستخراج إحصائيات دقيقة حول السرعة، التمرير، ودقة التسديد.'},
      {icon:'visibility',title:'الظهور أمام الكشافين',desc:'ملفك الشخصي يظهر مباشرة في لوحة تحكم الكشافين المعتمدين محلياً ودولياً، مما يزيد فرصك في الحصول على تجربة أداء.'},
      {icon:'hub',title:'تواصل مباشر مع الأندية',desc:'نظام مراسلة آمن يربطك بمدراء الأكاديميات والمدربين مباشرة عند اهتمامهم بمهاراتك المسجلة على المنصة.'},
    ],
    aiVideoTitle:'تحليل الفيديو الذكي',
    aiVideoBadge:'تقنية الجيل القادم',
    aiVideoDesc:'حول لقطاتك إلى بيانات احترافية. تقنياتنا تحلل كل حركة، تمريرة، وتسديدة لتعطيك تقييماً دقيقاً مبنياً على معايير الأندية العالمية.',
    aiVideoFeatures:[
      {icon:'label_important',color:'#84d993',title:'وسم تلقائي للأهداف والمراوغات',desc:'يقوم الذكاء الاصطناعي بتحديد أفضل لحظاتك وتقسيمها إلى مقاطع فيديو جاهزة للمشاركة مع الكشافين.'},
      {icon:'map',color:'#bdc4ef',title:'خرائط حرارية لتحركاتك',desc:'تتبع دقيق لموقعك في الملعب طوال المباراة لفهم توزيع مجهودك البدني وذكائك التكتيكي.'},
      {icon:'leaderboard',color:'#fdba45',title:'مقاييس أداء متقدمة',desc:'إحصائيات فورية عن سرعة الجري، دقة التمرير، وقوة التسديد مدمجة مباشرة فوق لقطات الفيديو الخاصة بك.'},
    ],
    tourTitle:'البطولات والمنافسات',
    tourSub:'شارك في أقوى الفعاليات لرفع تقييمك الرقمي',
    tournaments:[
      {title:'بطولة النخبة - القاهرة',desc:'مباريات دولية وبطولات رسمية بحضور أفضل الكشافين في مصر.',btn:'شاهد على إنستغرام'},
      {title:'بطولة العلمين الدولية',desc:'بطولات رسمية ومباريات في مدينة العلمين الجديدة بمشاركة كبار الكشافين.',btn:'شاهد على إنستغرام'},
      {title:'بطولة الحلم العربي - الدوحة',desc:'اختبارات أداء فنية تحت إشراف مدربي الدوري القطري.',btn:'شاهد على إنستغرام'},
    ],
    talentsTitle:'مواهب صاعدة',
    talentsSub:'الأكثر بحثاً وتفاعلاً من قبل الأندية هذا الأسبوع',
    viewAll:'عرض جميع اللاعبين',
    players:[
      {name:'أحمد كريم',pos:'وسط • 19 سنة',badge:'نخبة'},
      {name:'ياسين عمر',pos:'مهاجم • 17 سنة',badge:null},
      {name:'مريم حسن',pos:'مهاجمة • 18 سنة',badge:'اختيار الكشاف'},
      {name:'زياد علي',pos:'مدافع • 20 سنة',badge:null},
    ],
    contactTitle:'تواصل معنا',
    contactSub:'فريق الدعم الفني وخدمة العملاء متاح للإجابة على جميع استفساراتكم حول المنصة والاشتراكات.',
    contacts:[
      {href:'https://wa.me/97470542458',icon:'chat',color:'#84d993',bg:'rgba(132,217,147,.1)',hb:'rgba(132,217,147,.5)',title:'واتساب',sub:'+974 7054 2458'},
      {href:'tel:+97470542458',icon:'call',color:'#bdc4ef',bg:'rgba(189,196,239,.1)',hb:'rgba(189,196,239,.5)',title:'اتصل بنا',sub:'+974 7054 2458'},
      {href:'mailto:info@el7lm.com',icon:'mail',color:'#fdba45',bg:'rgba(253,186,69,.1)',hb:'rgba(253,186,69,.5)',title:'البريد الإلكتروني',sub:'info@el7lm.com'},
    ],
    emailLbl:'البريد الإلكتروني', nameLbl:'الاسم الكامل', subjectLbl:'الموضوع', msgLbl:'الرسالة',
    emailPh:'example@mail.com', namePh:'أدخل اسمك هنا', subjectPh:'كيف يمكننا مساعدتك؟', msgPh:'اكتب تفاصيل استفسارك هنا...',
    sendBtn:'إرسال الرسالة',
    ctaTitle:'جاهز لتكون النجم القادم؟',
    ctaSub:'انضم إلى آلاف اللاعبين الذين بدأوا مسيرتهم الاحترافية من خلال EL7LM platform with V Lab Ai.',
    ctaBtn:'أنشئ ملفك المجاني الآن',
    footerDesc:'منصة رائدة تهدف إلى تمكين المواهب الكروية العربية باستخدام التكنولوجيا الحديثة والذكاء الاصطناعي للوصول إلى العالمية.',
    footerCols:[
      {title:'روابط سريعة',links:[{l:'البحث عن المواهب',h:'#'},{l:'تقارير الأداء',h:'#'},{l:'الأكاديمية الرقمية',h:'#'},{l:'جدول المباريات',h:'#'},{l:'أخبار النجوم',h:'#'}]},
      {title:'الشركة',links:[{l:'من نحن',h:'/about'},{l:'الوظائف',h:'/careers'},{l:'شركاء النجاح',h:'/success-stories'},{l:'اتصل بنا',h:'/contact'}]},
      {title:'الدعم القانوني',links:[{l:'سياسة الخصوصية',h:'/privacy'},{l:'الشروط والأحكام',h:'/terms'},{l:'معايير الكشافة',h:'#'},{l:'الدعم الفني',h:'/support'}]},
    ],
    copyright:'© 2024 EL7LM platform with V Lab Ai. جميع الحقوق محفوظة.',
    designedFor:'صُمِّم للأبطال',
  },
  en: {
    dir:'ltr', lang:'en',
    joinBtn:'Join Now',
    nav:['Home','Hagzz App','Academy','Clubs','Tournaments'],
    badge:'EL7LM platform with V Lab Ai.',
    h1a:"Don't delay your dream,",
    h1b:'Make today the beginning.',
    heroSub:'The largest football talent discovery platform in the Middle East. We use AI to analyze your performance and connect you directly with top scouts and international clubs.',
    startFree:'Start for Free',
    login:'Login',
    partnerLabel:'Trusted By Professional Partners',
    featuresTitle:'Digital Success Tools',
    features:[
      {icon:'analytics',title:'AI Skill Analysis',desc:'We use the latest computer vision technology to analyze your performance videos and extract precise statistics on speed, passing, and shooting accuracy.'},
      {icon:'visibility',title:'Scout Visibility',desc:'Your profile appears directly on the dashboards of certified scouts locally and internationally, increasing your chances of getting a performance trial.'},
      {icon:'hub',title:'Club Direct Contact',desc:'A secure messaging system that connects you with academy directors and coaches directly when they show interest in your recorded skills on the platform.'},
    ],
    aiVideoTitle:'AI Video Analysis',
    aiVideoBadge:'Next-Gen Technology',
    aiVideoDesc:'Transform your footage into professional data. Our technology analyzes every move, pass, and shot to give you an accurate assessment based on international club standards.',
    aiVideoFeatures:[
      {icon:'label_important',color:'#84d993',title:'Auto-tag Goals & Dribbles',desc:'AI identifies your best moments and splits them into video clips ready to share with scouts.'},
      {icon:'map',color:'#bdc4ef',title:'Heat Maps of Your Movement',desc:'Precise tracking of your position on the pitch throughout the match to understand your physical effort and tactical intelligence.'},
      {icon:'leaderboard',color:'#fdba45',title:'Advanced Performance Metrics',desc:'Real-time stats on running speed, passing accuracy, and shot power overlaid directly on your video footage.'},
    ],
    tourTitle:'Tournaments & Competitions',
    tourSub:'Participate in the strongest events to boost your digital ranking',
    tournaments:[
      {title:'Elite Tournament - Cairo',desc:'International matches and official tournaments with Egypt\'s top scouts.',btn:'View on Instagram'},
      {title:'Al Alamein International',desc:'Official tournaments in the new Al Alamein city with elite scouting.',btn:'View on Instagram'},
      {title:'Arab Dream Cup - Doha',desc:'Technical performance tests under the supervision of Qatar League coaches.',btn:'View on Instagram'},
    ],
    talentsTitle:'Rising Talents',
    talentsSub:'Most searched and engaged by clubs this week',
    viewAll:'View All Players',
    players:[
      {name:'Ahmed Kareem',pos:'Midfielder • 19 yrs',badge:'Elite Rank'},
      {name:'Yassine Omar',pos:'Forward • 17 yrs',badge:null},
      {name:'Mariam Hassan',pos:'Striker • 18 yrs',badge:'Scout Choice'},
      {name:'Ziad Ali',pos:'Defender • 20 yrs',badge:null},
    ],
    contactTitle:'Contact Us',
    contactSub:'Our technical support and customer service team is available to answer all your inquiries about the platform and subscriptions.',
    contacts:[
      {href:'https://wa.me/97470542458',icon:'chat',color:'#84d993',bg:'rgba(132,217,147,.1)',hb:'rgba(132,217,147,.5)',title:'WhatsApp',sub:'+974 7054 2458'},
      {href:'tel:+97470542458',icon:'call',color:'#bdc4ef',bg:'rgba(189,196,239,.1)',hb:'rgba(189,196,239,.5)',title:'Call Us',sub:'+974 7054 2458'},
      {href:'mailto:info@el7lm.com',icon:'mail',color:'#fdba45',bg:'rgba(253,186,69,.1)',hb:'rgba(253,186,69,.5)',title:'Email Us',sub:'info@el7lm.com'},
    ],
    emailLbl:'Email Address', nameLbl:'Full Name', subjectLbl:'Subject', msgLbl:'Message',
    emailPh:'example@mail.com', namePh:'Enter your name', subjectPh:'How can we help you?', msgPh:'Write your inquiry details here...',
    sendBtn:'Send Message',
    ctaTitle:'Ready to be the next star?',
    ctaSub:'Join thousands of players who started their professional journey through EL7LM platform with V Lab Ai.',
    ctaBtn:'Create Your Free Profile Now',
    footerDesc:'A leading platform aiming to empower Arab football talents using modern technology and artificial intelligence to reach global recognition.',
    footerCols:[
      {title:'Quick Links',links:[{l:'Talent Search',h:'#'},{l:'Performance Reports',h:'#'},{l:'Digital Academy',h:'#'},{l:'Match Schedule',h:'#'},{l:'Star News',h:'#'}]},
      {title:'Company',links:[{l:'About Us',h:'/about'},{l:'Careers',h:'/careers'},{l:'Success Stories',h:'/success-stories'},{l:'Contact',h:'/contact'}]},
      {title:'Legal',links:[{l:'Privacy Policy',h:'/privacy'},{l:'Terms & Conditions',h:'/terms'},{l:'Scouting Standards',h:'#'},{l:'Technical Support',h:'/support'}]},
    ],
    copyright:'© 2024 EL7LM platform with V Lab Ai. ALL RIGHTS RESERVED.',
    designedFor:'Designed for Champions',
  },
};

const PLAYER_IMGS = [
  '/images/player-1.jpg',
  '/images/player-2.jpg',
  '/images/player-3.jpg',
  '/images/player-4.jpg',
];
const TOUR_IMGS = [
  '/images/stadium-pro.jpg',
  '/images/stadium-pro.jpg',
  '/images/arab-dream-cup.jpg' 
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

export default function Home() {
  const [langAr, setLangAr] = useState(true);
  const [dark, setDark] = useState(true);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePlayerIdx((prev) => (prev + 1) % PLAYER_IMGS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []); 
  const t = TR[langAr ? 'ar' : 'en'];
  const isRTL = langAr;

  const theme = {
    bg: dark ? '#0d1225' : '#f8fafc',
    text: dark ? '#dde1fc' : '#1e293b',
    subText: dark ? '#c6c5cf' : '#64748b',
    navText: dark ? '#46464e' : '#94a3b8',
    cardBg: dark ? 'rgba(36,41,61,0.5)' : '#ffffff',
    border: dark ? 'rgba(70,70,78,.2)' : 'rgba(226,232,240,.8)',
    headerBg: dark ? 'rgba(13,18,37,0.92)' : 'rgba(255,255,255,0.92)',
    accent: '#bdc4ef'
  };

  const hov = (el: HTMLElement, on: Partial<CSSStyleDeclaration>, off: Partial<CSSStyleDeclaration>) => ({
    onMouseEnter: () => Object.assign(el.style, on),
    onMouseLeave: () => Object.assign(el.style, off),
  });

  return (
    <div dir={t.dir} lang={t.lang}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Tajawal',sans-serif;background:${theme.bg};color:${theme.text};overflow-x:hidden;transition:background 0.3s, color 0.3s}
        .hl{font-family:'Tajawal',sans-serif}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;display:inline-block;line-height:1;text-transform:none;letter-spacing:normal;word-wrap:normal;white-space:nowrap;direction:ltr}
        .gp{background:rgba(47,52,72,0.4);backdrop-filter:blur(20px)}
        @keyframes scroll-rtl{0%{transform:translateX(0)}100%{transform:translateX(calc(250px * 7))}}
        @keyframes scroll-ltr{0%{transform:translateX(0)}100%{transform:translateX(calc(-250px * 7))}}
        .rtl-scroll{animation:scroll-rtl 40s linear infinite}
        .ltr-scroll{animation:scroll-ltr 40s linear infinite}
        @keyframes pulse{50%{opacity:.5}}.ap{animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite}
        @keyframes float {
          0% { transform: rotate(2deg) translateY(0px); }
          50% { transform: rotate(2.5deg) translateY(-10px); }
          100% { transform: rotate(2deg) translateY(0px); }
        }
        .hero-card-tilt { animation: float 6s ease-in-out infinite; }
        .fm{-webkit-mask-image:linear-gradient(to left,transparent,black 10%,black 90%,transparent);mask-image:linear-gradient(to left,transparent,black 10%,black 90%,transparent)}
        .tc{transition:all .2s}.tc5{transition:all .5s}.tc7{transition:all .7s}
        .inp{background:#161b2e;border:1px solid rgba(70,70,78,.3);border-radius:2px;padding:1rem;color:#dde1fc;width:100%;font-size:1rem;outline:none;text-align:${isRTL?'right':'left'}}
        .inp:focus{border-color:#bdc4ef}
        section{padding:6rem 0; background: ${theme.bg}; color: ${theme.text}; transition: background 0.3s, color 0.3s;}
        .ct{max-width:1280px;margin:0 auto;padding:0 2rem}
        .st{font-family:'Tajawal',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em}
        .wa{position:fixed;bottom:1.5rem;${isRTL?'left':'right'}:1.5rem;z-index:100;background:#25D366;color:white;border-radius:50%;width:3.5rem;height:3.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.4);text-decoration:none}
        @media(max-width:900px){
          .hm{display:none!important}
          .g2, .g3{grid-template-columns:1fr!important}
          .g4{grid-template-columns:1fr 1fr!important}
          .htxt{font-size:3rem!important; text-align: center!important;}
          .fc{grid-template-columns:1fr!important}
          header{padding: 0 1rem!important; height: 3.5rem!important;}
          main{padding-top: 3.5rem!important;}
          .h-logo-txt{display:none!important;}
          .h-lang-toggle{padding: 0.25rem!important; font-size: 0.7rem!important; transform: scale(0.8); transform-origin: right;}
          .h-theme-toggle{transform: scale(0.7);}
          .h-join-btn{padding: 0.35rem 0.7rem!important; font-size: 0.65rem!important;}
          .hero-grid{gap: 1rem!important; padding: 0 1rem!important; margin-top: 0.5rem!important;}
          .hero-grid > div:first-child { flex-direction: row!important; display: flex!important; align-items: center!important; justify-content: space-between!important; width: 100%!important; gap: 0.75rem!important; }
          .hero-img-container{width: 45%!important; min-height: 140px!important; order: 2!important; margin-top: 0!important;}
          .htxt-container{flex: 1!important; order: 1!important; text-align: right!important; min-width: 0!important; display: flex!important; flexDirection: column!important; align-items: flex-start!important;}
          .hero-btns{justify-content: flex-end!important; flex-direction: row!important; gap: 0.5rem!important; display: flex!important; width: 100%; margin-top: 1.5rem!important;}
          .hero-btns a{width: auto!important; font-size: 0.8rem!important; padding: 0.6rem 0.8rem!important; flex: 1!important; min-width: 90px!important; text-align: center!important;}
          .hero-title{font-size: 3rem!important; line-height: 1.1!important; margin-bottom: 0!important; width: 100%!important;}
          .hero-sub{font-size: 0.9rem!important; margin: 1rem 0 1.5rem 0!important; line-height: 1.5!important; text-align: right!important; width: 100%!important;}
          .hero-badge{font-size: 1rem!important; padding: 0.4rem 0.8rem!important; white-space: nowrap!important; margin-bottom: 0.8rem!important; align-self: flex-start!important;}
          .score-card{transform: scale(0.85) !important; bottom: -0.5rem!important; right: -0.75rem!important; left: auto!important; position: absolute!important;}
          .hero-section{align-items: flex-start!important; padding-top: 1.5rem!important; min-height: auto!important;}
        }
        @media(min-width:901px){
          .hero-img-container{max-width: 450px!important;}
        }
      `}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />

      {/* HEADER */}
      <header style={{position:'fixed',top:0,left:0,width:'100%',zIndex:50,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 3rem',height:'5rem',background:theme.headerBg,backdropFilter:'blur(24px)',borderBottom:`1px solid ${theme.border}`,transition:'background 0.3s'}}>
        <div style={{display:'flex',alignItems:'center',gap:'3rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
            {/* Logo Image */}
            <div style={{height:'3.5rem',width:'3.5rem',position:'relative'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/el7lm-logo.png" alt="Logo" style={{width:'100%',height:'100%',objectFit:'contain'}} 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuDYisGk25r4m6K2o21yV3_S9X_X4X-Xo_LzWkP6_A2h9S-k4r5M6z7_N8W9X0"; // Fallback URL
                }}/>
            </div>
            <span className="hl hm h-logo-txt" style={{fontSize:'1.5rem',fontWeight:900,color:'#bdc4ef',textTransform:'uppercase',letterSpacing:'-0.05em'}}>EL7LM</span>
          </div>
          <nav className="hm" style={{display:'flex',gap:'2rem'}}>
            {t.nav.map((item,i)=>(
              <a key={i} href="#" className="hl" style={{fontWeight:700,textTransform:'uppercase',letterSpacing:'-0.025em',textDecoration:'none',color:i===0?'#bdc4ef':'#46464e',borderBottom:i===0?'2px solid #bdc4ef':'none',paddingBottom:i===0?'2px':'0',transition:'color .2s'}}
                onMouseEnter={e=>{if(i!==0)(e.currentTarget as HTMLAnchorElement).style.color='#bdc4ef'}}
                onMouseLeave={e=>{if(i!==0)(e.currentTarget as HTMLAnchorElement).style.color='#46464e'}}>{item}</a>
            ))}
          </nav>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
          <div className="h-lang-toggle" style={{display:'flex',alignItems:'center',background:'#24293d',borderRadius:'12px',padding:'4px',border:'1px solid rgba(70,70,78,.3)'}}>
            {['AR','EN'].map((l,i)=>{
              const active=(i===0&&langAr)||(i===1&&!langAr);
              return <button key={l} onClick={()=>setLangAr(i===0)} className="hl" style={{padding:'4px 12px',borderRadius:'8px',fontSize:'.75rem',fontWeight:700,background:active?'#bdc4ef':'transparent',color:active?'#272e50':'#c6c5cf',border:'none',cursor:'pointer',transition:'all .2s'}}>{l}</button>;
            })}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'.5rem',color:theme.text,borderRight:`1px solid ${theme.border}`,paddingRight:'0.5rem',marginRight:'.5rem',direction:'ltr'}}>
            {/* Theme Toggle */}
            <span onClick={()=>setDark(!dark)} className="tc h-theme-toggle" style={{cursor:'pointer',padding:'.5rem',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}
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
          </div>
          <a href="/auth/register" className="hl h-join-btn" style={{padding:'.5rem 1.5rem',borderRadius:'2px',background:'#84d993',color:'#0d1225',fontWeight:900,fontSize:'.875rem',textDecoration:'none',transition:'filter .2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.filter='brightness(1.1)'}
            onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.filter='none'}>{t.joinBtn}</a>
        </div>
      </header>

      <main style={{paddingTop:'5rem'}}>
        {/* HERO */}
        <section className="hero-section" style={{minHeight:'90vh',display:'flex',alignItems:'center',overflow:'hidden',position:'relative',padding:0}}>
          <div style={{position:'absolute',inset:0,zIndex:0, pointerEvents:'none'}}>
            <img src="/images/hero-bg.png" alt="stadium" style={{width:'100%',height:'100%',objectFit:'cover',opacity:.3}} 
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop"; }}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,#0d1225 30%,rgba(13,18,37,.6) 60%,transparent)'}}></div>
          </div>
          <div className="ct hero-grid" style={{position:'relative',zIndex:10,display:'flex',flexDirection:'column',gap:'2rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'2rem',flexWrap:'wrap'}}>
              {/* IMAGE PART */}
              <div className="hero-img-container" style={{position:'relative',order:isRTL?2:1, minHeight: '180px', flex: '0 0 auto', width: '45%'}}>
                <span className={`ap hl hero-badge`} style={{
                  display:'inline-block',
                  background:'rgba(255,140,0,0.05)',
                  padding:'.5rem 1.2rem',
                  borderRadius:'4px',
                  fontSize:'1.25rem',
                  fontWeight:900,
                  letterSpacing:'.1em',
                  textTransform:'uppercase',
                  marginBottom:'.75rem',
                  border:'1px solid rgba(255,140,0,0.2)'
                }}>
                  <span style={{
                    backgroundImage: 'linear-gradient(45deg, #ff8c00, #ffa500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block'
                  }}>{t.badge}</span>
                </span>
                <div style={{position:'absolute',inset:'-2.5rem',background:'rgba(189,196,239,.2)',filter:'blur(100px)',borderRadius:'50%'}}></div>
                <div className="gp tc7 hero-card-tilt" style={{
                  borderRadius:'12px',
                  padding:'.5rem',
                  border:'1px solid rgba(70,70,78,.3)',
                  position:'relative', 
                  overflow: 'visible',
                  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'rotate(2deg)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e=>{
                  (e.currentTarget as HTMLDivElement).style.animation = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'rotate(0deg) scale(1.05)';
                }}
                onMouseLeave={e=>{
                  (e.currentTarget as HTMLDivElement).style.animation = 'float 6s ease-in-out infinite';
                  (e.currentTarget as HTMLDivElement).style.transform = 'rotate(2deg) scale(1)';
                }}>
                  <div style={{position: 'relative', width: '100%', aspectRatio: '4/5', overflow: 'hidden', borderRadius: '8px'}}>
                    {PLAYER_IMGS.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={`Professional Player ${idx + 1}`} 
                        style={{
                          borderRadius:'8px',
                          width:'100%',
                          height: '100%',
                          objectFit: 'cover',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          opacity: activePlayerIdx === idx ? 1 : 0,
                          transition: 'opacity 1s ease-in-out',
                          display:'block'
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=800&auto=format&fit=crop"; }}
                      />
                    ))}
                  </div>
                  {/* ENLARGED SCORE CARD */}
                  <div className="tc5 score-card" style={{
                    position:'absolute',
                    bottom:'-1rem',
                    left:isRTL?'auto':'-1rem',
                    right:isRTL?'-1rem':'auto',
                    background:'#2f3448',
                    padding:'0.6rem 1rem',
                    borderRadius:'8px',
                    border:'2px solid rgba(132,217,147,.6)',
                    backdropFilter:'blur(12px)',
                    zIndex:20,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    transform: 'scale(1.2)'
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <div style={{width:'2rem',height:'2rem',borderRadius:'50%',background:'#84d993',display:'flex',alignItems:'center',justifyContent:'center',color:'#003916', flexShrink:0}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                      </div>
                      <div>
                        <p style={{fontSize:'8px',color:'#c6c5cf',fontWeight:700,textTransform:'uppercase', margin:0, letterSpacing: '0.1em'}}>Performance</p>
                        <p className="hl" style={{fontSize:'14px',fontWeight:900,color:'#84d993',lineHeight:1, margin:0}}>98.4 ELITE</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TEXT PART (TITLE ONLY) */}
              <div className="htxt-container" style={{textAlign:isRTL?'right':'left',order:isRTL?1:2, flex: '1'}}>
                <h1 className="hero-title" style={{fontSize:'8rem',fontWeight:900,lineHeight:1,marginBottom:0,color:'#f8fafc',fontFamily:'"Tajawal", sans-serif'}}>
                  {t.h1a}<br/><span style={{color:'#bdc4ef'}}>{t.h1b}</span>
                </h1>
              </div>
            </div>

            {/* FULL WIDTH SUBTITLE AND BUTTONS */}
            <div style={{textAlign:isRTL?'right':'left', marginTop: '1rem'}}>
              <p className="hero-sub" style={{fontSize:'1.25rem',color:'#c6c5cf',width:'100%', marginBottom:'2.5rem',lineHeight:1.6}}>
                {t.heroSub}
              </p>
              <div className="hero-btns" style={{display:'flex',gap:'1rem',justifyContent:isRTL?'flex-end':'flex-start'}}>
                <a href="/auth/register" style={{padding:'1rem 2.5rem',borderRadius:'2px',background:'#84d993',color:'#0d1225',fontWeight:900,fontSize:'1.1rem',textDecoration:'none',display:'inline-block',transition:'all .2s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.filter='brightness(1.1)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.filter='none'}>{t.startFree}</a>
                <a href="/auth/login" style={{padding:'1rem 2.5rem',borderRadius:'2px',background:'transparent',border:'1px solid rgba(189,196,239,.3)',color:'#dde1fc',fontWeight:700,fontSize:'1.1rem',textDecoration:'none',display:'inline-block',transition:'background .2s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.background='#1a1f32'}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.background='transparent'}>{t.login}</a>
              </div>
            </div>
          </div>
        </section>

        {/* PARTNERS */}
        <section style={{padding:'3rem 0',background:'#080d20',borderTop:'1px solid rgba(70,70,78,.1)',borderBottom:'1px solid rgba(70,70,78,.1)',overflow:'hidden'}}>
          <div className="ct" style={{marginBottom:'1.5rem'}}>
            <p className="hl" style={{textAlign:'center',color:'#c6c5cf',fontWeight:700,textTransform:'uppercase',letterSpacing:'.3em',fontSize:'.75rem'}}>{t.partnerLabel}</p>
          </div>
          <div className="fm" style={{overflow:'hidden'}}>
            <div className={isRTL?'rtl-scroll':'ltr-scroll'} style={{display:'flex',gap:'4rem',whiteSpace:'nowrap',alignItems:'center',padding:'1rem 0'}}>
              {PARTNERS.map((name,i)=>(
                <div key={i} className="hl tc" style={{fontSize:'1.5rem',fontWeight:900,color:'rgba(198,197,207,0.4)',textTransform:'uppercase',cursor:'pointer',flexShrink:0}}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.color='#bdc4ef'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.color='rgba(198,197,207,0.4)'}>{name}</div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{background:'#0d1225'}}>
          <div className="ct">
            <div style={{textAlign:'center',marginBottom:'5rem'}}>
              <h2 className="st" style={{fontSize:'2.5rem',marginBottom:'1rem'}}>{t.featuresTitle}</h2>
              <div style={{width:'6rem',height:'6px',background:'#84d993',margin:'0 auto',borderRadius:'9999px'}}></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2rem'}} className="fc">
              {t.features.map((f,i)=>{
                const colors=['#bdc4ef','#84d993','#fdba45'];
                const borders=['rgba(189,196,239,0.5)','rgba(132,217,147,0.5)','rgba(253,186,69,0.5)'];
                return (
                  <div key={i} className="tc5" style={{background:'#1a1f32',borderRadius:'12px',padding:'3rem',position:'relative',overflow:'hidden',border:'1px solid rgba(70,70,78,.1)',cursor:'default'}}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.background='#24293d';el.style.borderColor=borders[i];el.style.transform='translateY(-6px)'}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.background='#1a1f32';el.style.borderColor='rgba(70,70,78,.1)';el.style.transform='none'}}>
                    <div style={{position:'absolute',top:'-2.5rem',right:'-2.5rem',width:'8rem',height:'8rem',background:`${colors[i]}`,opacity:0.05,borderRadius:'50%'}}></div>
                    <div style={{marginBottom:'2rem',color:colors[i]}}>
                      {i===0 && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m6.7 6.7 10.6 10.6"></path><path d="m6.7 17.3 10.6-10.6"></path></svg>}
                      {i===1 && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                      {i===2 && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                      {i===3 && <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>}
                    </div>
                    <h3 className="hl" style={{fontSize:'1.5rem',fontWeight:700,marginBottom:'1rem',color:'#dde1fc'}}>{f.title}</h3>
                    <p style={{color:'#c6c5cf',lineHeight:1.625}}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI VIDEO ANALYSIS */}
        <section style={{background:'#1a1f32',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',opacity:.1}}>
            <div style={{position:'absolute',top:0,right:0,width:'500px',height:'500px',background:'#bdc4ef',filter:'blur(120px)',borderRadius:'50%'}}></div>
            <div style={{position:'absolute',bottom:0,left:0,width:'500px',height:'500px',background:'#84d993',filter:'blur(120px)',borderRadius:'50%'}}></div>
          </div>
          <div className="ct" style={{position:'relative',zIndex:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4rem',alignItems:'center'}} className="g2">
              {/* Text Side */}
              <div style={{textAlign:isRTL?'right':'left',order:isRTL?1:2}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(189,196,239,.1)',color:'#bdc4ef',padding:'.25rem 1rem',borderRadius:'9999px',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'1.5rem'}}>
                  <span className="material-symbols-outlined" style={{fontSize:'.875rem'}}>rocket_launch</span>
                  {t.aiVideoBadge}
                </div>
                <h2 className="hl" style={{fontSize:'3rem',fontWeight:900,letterSpacing:'-0.05em',marginBottom:'1.5rem'}}>{t.aiVideoTitle}</h2>
                <p style={{fontSize:'1.125rem',color:'#c6c5cf',marginBottom:'3rem',lineHeight:1.625,maxWidth:'36rem',marginLeft:isRTL?'auto':'0'}}>{t.aiVideoDesc}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'2rem'}}>
                  {t.aiVideoFeatures.map((f,i)=>(
                    <div key={i} style={{display:'flex',flexDirection:isRTL?'row-reverse':'row',alignItems:'flex-start',gap:'1.5rem'}}>
                      <div className="tc" style={{width:'3.5rem',height:'3.5rem',flexShrink:0,borderRadius:'12px',background:'#24293d',border:'1px solid rgba(70,70,78,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}
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
                        <h4 className="hl" style={{fontSize:'1.125rem',fontWeight:700,marginBottom:'.5rem'}}>{f.title}</h4>
                        <p style={{color:'#c6c5cf',fontSize:'.875rem',lineHeight:1.625}}>{f.desc}</p>
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
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQ5x1hv6Yam_5ctQ4gx21HoD0cLmcyMGjnTG_mD1y2_udS_zdljaoqjjjXXShqMnicuomYEtzH3K_4y02JyBl-wCZSaJ2UvTGRZGt-0UwH76FMh2qFKUaltOd8j2sStd0KujZvsuPgNilFZW66OVgBolg29jtT9X-IldBUvMFme_xwhaB0olsmX7MqVc5OJuAGY1aCiY2VtNwLAbhTH1kvyHQJ0N7eelQPe3Pwgj0nJFQskg_GJun1toVf1az0XCvoig9hIrwUtvY" alt="AI Video Analysis" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.7}}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.8),transparent)'}}></div>
                  {/* Tracking Badge */}
                  <div className="ap gp" style={{position:'absolute',top:'2.5rem',left:'2.5rem',padding:'1rem',border:'1px solid rgba(189,196,239,.4)',borderRadius:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                      <div className="ap" style={{width:'12px',height:'12px',background:'#bdc4ef',borderRadius:'50%'}}></div>
                      <span className="hl" style={{fontSize:'10px',fontWeight:700,letterSpacing:'.1em',color:'#bdc4ef',textTransform:'uppercase'}}>Tracking Active</span>
                    </div>
                    <p className="hl" style={{fontSize:'1.5rem',fontWeight:900,marginTop:'.5rem'}}>32.4 km/h</p>
                    <p style={{fontSize:'8px',color:'#909099',textTransform:'uppercase'}}>Current Speed</p>
                  </div>
                  {/* Stats Panel */}
                  <div style={{position:'absolute',bottom:'2.5rem',right:'2.5rem',padding:'1.5rem',background:'rgba(13,18,37,.8)',backdropFilter:'blur(12px)',border:'1px solid rgba(132,217,147,.4)',borderRadius:'12px'}}>
                    <div style={{display:'flex',gap:'1rem'}}>
                      {[{label:'Precision',val:'92%',color:'#84d993'},{label:'Stamina',val:'88%',color:'#bdc4ef'}].map((s,i)=>(
                        <div key={i} style={{textAlign:'center'}}>
                          <div style={{width:'3rem',height:'3rem',borderRadius:'50%',border:`3px solid ${s.color}`,borderTopColor:'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'.5rem'}}>
                            <span style={{fontSize:'10px',fontWeight:700}}>{s.val}</span>
                          </div>
                          <p style={{fontSize:'8px',fontWeight:700,textTransform:'uppercase',color:'#c6c5cf'}}>{s.label}</p>
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
                    <div style={{position:'absolute',top:0,right:0,background:'#84d993',color:'#003916',padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:900,textTransform:'uppercase'}}>PLAYER_01</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOURNAMENTS */}
        <section style={{background:'#080d20'}}>
          <div className="ct">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4rem',flexWrap:'wrap',gap:'1rem'}}>
              <div style={{textAlign:isRTL?'right':'left'}}>
                <h2 className="st" style={{fontSize:'2.25rem'}}>{t.tourTitle}</h2>
                <p style={{color:'#c6c5cf',marginTop:'.5rem'}}>{t.tourSub}</p>
              </div>
              <div style={{display:'flex',gap:'1rem'}}>
                {['next','prev'].map((ic,i)=>(
                  <button key={i} className="tc" style={{width:'3rem',height:'3rem',borderRadius:'50%',border:'1px solid rgba(70,70,78,.5)',background:'transparent',color:'#dde1fc',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='#1a1f32'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='transparent'}>
                    {ic==='prev' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>}
                    {ic==='next' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'2rem'}} className="g3">
              {t.tournaments.map((tour,i)=>(
                <div key={i} style={{position:'relative',borderRadius:'12px',overflow:'hidden',height:'400px',cursor:'pointer'}}
                  onMouseEnter={e=>{const img=e.currentTarget.querySelector('img') as HTMLImageElement;if(img)img.style.transform='scale(1.1)'}}
                  onMouseLeave={e=>{const img=e.currentTarget.querySelector('img') as HTMLImageElement;if(img)img.style.transform='scale(1)'}}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TOUR_IMGS[i]} alt={tour.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transition:'transform 1s'}}/>
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.2),transparent)',opacity:.8}}></div>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'2rem',textAlign:isRTL?'right':'left'}}>
                    <h4 className="hl" style={{fontSize:'1.875rem',fontWeight:900,color:'white',marginBottom:'.5rem'}}>{tour.title}</h4>
                    <p style={{color:'#d1d5db',marginBottom:'1.5rem'}}>{tour.desc}</p>
                    <a href="https://www.instagram.com/hagzzel7lm/" target="_blank" rel="noopener noreferrer" className="tc hl" style={{background:'white',color:'black',padding:'.75rem 2rem',borderRadius:'2px',fontWeight:700,textDecoration:'none',display:'inline-block'}}
                      onMouseEnter={e=>{const a=e.currentTarget as HTMLAnchorElement;a.style.background='#fdba45';a.style.color='#432c00'}}
                      onMouseLeave={e=>{const a=e.currentTarget as HTMLAnchorElement;a.style.background='white';a.style.color='black'}}>{tour.btn}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TALENTS */}
        <section style={{background:'#0d1225'}}>
          <div className="ct">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'4rem',flexWrap:'wrap',gap:'1rem'}}>
              <div style={{textAlign:isRTL?'right':'left'}}>
                <h2 className="st" style={{fontSize:'2.25rem'}}>{t.talentsTitle}</h2>
                <p style={{color:'#c6c5cf',marginTop:'.5rem'}}>{t.talentsSub}</p>
              </div>
              <a href="/auth/register" className="tc" style={{color:'#84d993',fontWeight:700,display:'flex',alignItems:'center',gap:'.5rem',textDecoration:'none'}}
                onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform=isRTL?'translateX(-8px)':'translateX(8px)'}
                onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='none'}>
                {isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                {t.viewAll}
                {!isRTL && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </a>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1.5rem'}} className="g4">
              {t.players.map((p,i)=>(
                <div key={i} className="tc5" style={{background:'#161b2e',borderRadius:'12px',overflow:'hidden',border:'1px solid rgba(70,70,78,.1)',cursor:'pointer'}}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor='rgba(189,196,239,.5)';el.style.transform='translateY(-8px)';const img=el.querySelector('.pi') as HTMLImageElement;if(img){img.style.filter='grayscale(0)';img.style.transform='scale(1)'}}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.borderColor='rgba(70,70,78,.1)';el.style.transform='none';const img=el.querySelector('.pi') as HTMLImageElement;if(img){img.style.filter='grayscale(100%)';img.style.transform='scale(1.05)'}}}>
                  <div style={{height:'20rem',position:'relative',overflow:'hidden'}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="pi tc7" src={PLAYER_IMGS[i]} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:'grayscale(100%)',transform:'scale(1.05)'}}/>
                    {p.badge && <div className="hl" style={{position:'absolute',top:'1rem',right:isRTL?'1rem':'auto',left:isRTL?'auto':'1rem',background:'#fdba45',color:'#432c00',padding:'.25rem .75rem',fontSize:'10px',fontWeight:900,textTransform:'uppercase',borderRadius:'2px'}}>{p.badge}</div>}
                  </div>
                  <div style={{padding:'1.5rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                      <div style={{textAlign:isRTL?'right':'left'}}>
                        <h4 className="hl" style={{fontSize:'1.25rem',fontWeight:700,color:'#dde1fc'}}>{p.name}</h4>
                        <p style={{fontSize:'.75rem',color:'#c6c5cf',textTransform:'uppercase',letterSpacing:'.1em'}}>{p.pos}</p>
                      </div>
                      <div style={{background:'#2f3448',padding:'.25rem .75rem',borderRadius:'2px',border:'1px solid rgba(70,70,78,.2)'}}>
                        <span className="hl" style={{color:'#bdc4ef',fontWeight:900}}>{RATINGS[i]}</span>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem'}}>
                      {PLAYER_STATS[i].map((s,j)=>(
                        <div key={j} style={{background:'#24293d',padding:'.5rem',borderRadius:'2px',textAlign:'center',fontSize:'10px',fontWeight:700,color:'#909099',textTransform:'uppercase'}}>
                          {s.l}<br/><span style={{color:'#dde1fc',fontSize:'.875rem'}}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section style={{background:'#161b2e',borderTop:'1px solid rgba(70,70,78,.1)',borderBottom:'1px solid rgba(70,70,78,.1)'}}>
          <div className="ct">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4rem',alignItems:'center'}} className="g2">
              <div style={{textAlign:isRTL?'right':'left',order:isRTL?1:2}}>
                <h2 className="hl" style={{fontSize:'2.25rem',fontWeight:900,marginBottom:'1.5rem'}}>{t.contactTitle}</h2>
                <p style={{color:'#c6c5cf',marginBottom:'2.5rem',fontSize:'1.125rem'}}>{t.contactSub}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                  {t.contacts.map((c,i)=>(
                    <a key={i} href={c.href} className="tc" style={{display:'flex',flexDirection:isRTL?'row-reverse':'row',alignItems:'center',gap:'1.5rem',padding:'1rem',borderRadius:'12px',textDecoration:'none',border:'1px solid transparent',color:'inherit'}}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.background='#1a1f32';el.style.borderColor=c.hb}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLAnchorElement;el.style.background='transparent';el.style.borderColor='transparent'}}>
                      <div style={{width:'3.5rem',height:'3.5rem',background:c.bg,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {i===0 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                        {i===1 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 1.11L7.82 9.11a15 15 0 0 0 6 6l1.27-1.27a2 2 0 0 1 1.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>}
                        {i===2 && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}
                      </div>
                      <div style={{textAlign:isRTL?'right':'left'}}>
                        <h4 className="hl" style={{fontWeight:700,fontSize:'1.25rem'}}>{c.title}</h4>
                        <p style={{color:'#c6c5cf'}} dir="ltr">{c.sub}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
              <div style={{background:'#1a1f32',padding:'3rem',borderRadius:'16px',border:'1px solid rgba(70,70,78,.2)',order:isRTL?2:1}}>
                <form style={{display:'flex',flexDirection:'column',gap:'1.5rem',textAlign:isRTL?'right':'left'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
                    {[{lbl:t.emailLbl,ph:t.emailPh,type:'email'},{lbl:t.nameLbl,ph:t.namePh,type:'text'}].map((f,i)=>(
                      <div key={i}>
                        <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color:'#909099'}}>{f.lbl}</label>
                        <input className="inp" type={f.type} placeholder={f.ph}/>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color:'#909099'}}>{t.subjectLbl}</label>
                    <input className="inp" type="text" placeholder={t.subjectPh}/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:'.75rem',fontWeight:700,textTransform:'uppercase',marginBottom:'.5rem',color:'#909099'}}>{t.msgLbl}</label>
                    <textarea className="inp" placeholder={t.msgPh} rows={4} style={{resize:'vertical'}}></textarea>
                  </div>
                  <button className="hl" style={{width:'100%',padding:'1rem',borderRadius:'2px',background:'linear-gradient(135deg,#bdc4ef,#161e3f)',color:'#272e50',fontWeight:900,fontSize:'1rem',letterSpacing:'.1em',textTransform:'uppercase',border:'none',cursor:'pointer',transition:'filter .2s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.filter='brightness(1.1)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.filter='none'}>{t.sendBtn}</button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{position:'relative',overflow:'hidden',background:'#0d1225'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(189,196,239,.05)'}}></div>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,#080d20,transparent)'}}></div>
          <div className="ct" style={{position:'relative',zIndex:10,textAlign:'center'}}>
            <h2 className="hl" style={{fontSize:'4rem',fontWeight:900,marginBottom:'2rem',lineHeight:1.25}}>{t.ctaTitle}</h2>
            <p style={{fontSize:'1.25rem',color:'#c6c5cf',marginBottom:'3rem',maxWidth:'42rem',margin:'0 auto 3rem'}}>{t.ctaSub}</p>
            <a href="/auth/register" className="hl tc" style={{background:'#84d993',color:'#003916',padding:'1.5rem 3rem',borderRadius:'2px',fontWeight:900,fontSize:'1.5rem',textDecoration:'none',display:'inline-block',boxShadow:'0 25px 50px rgba(132,217,147,.4)'}}
              onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1.1)'}
              onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1)'}>{t.ctaBtn}</a>
          </div>
        </section>
      </main>

      <footer style={{background:'#080d20',borderTop:'1px solid rgba(70,70,78,.1)'}}>
        <div className="ct" style={{paddingTop:'5rem',paddingBottom:'2.5rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'3rem',marginBottom:'5rem',textAlign:isRTL?'right':'left'}} className="fc">
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',justifyContent:isRTL?'flex-end':'flex-start',marginBottom:'1.5rem'}}>
                <img src="/el7lm-logo.png" alt="EL7LM" style={{height:'4rem',width:'auto',objectFit:'contain'}}/>
                <span className="hl" style={{fontSize:'1.5rem',fontWeight:900,color:'#bdc4ef',textTransform:'uppercase',letterSpacing:'-0.05em'}}>EL7LM</span>
              </div>
              <p style={{color:'#c6c5cf',fontSize:'.875rem',lineHeight:1.75,marginBottom:'1.5rem'}}>{t.footerDesc}</p>
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
                <h4 className="hl" style={{color:'#dde1fc',fontWeight:700,marginBottom:'2rem',fontSize:'1.25rem'}}>{col.title}</h4>
                <nav style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                  {col.links.map((lk,j)=>(
                    <a key={j} href={lk.h} className="tc" style={{color:'#c6c5cf',fontSize:'.875rem',textDecoration:'none'}}
                      onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.color='#bdc4ef'}
                      onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.color='#c6c5cf'}>{lk.l}</a>
                  ))}
                </nav>
              </div>
            ))}
          </div>
          <div style={{paddingTop:'2rem',borderTop:'1px solid rgba(70,70,78,.1)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
            <p style={{fontSize:'.75rem',color:'#c6c5cf',fontWeight:500,letterSpacing:'.025em'}}>{t.copyright}</p>
            <div style={{display:'flex',alignItems:'center',gap:'1.5rem'}}>
              <div style={{textAlign:isRTL?'right':'left'}}>
                <span style={{fontSize:'.75rem',color:'#c6c5cf',display:'block'}}>{t.designedFor}</span>
                <span className="hl" style={{fontSize:'.875rem',color:'#84d993',fontWeight:900,letterSpacing:'.05em'}}>Mesk llc Qatar</span>
              </div>
              <div style={{width:'3.5rem',height:'3.5rem',borderRadius:'12px',background:'linear-gradient(135deg, rgba(132,217,147,0.2), rgba(132,217,147,0.05))',border:'1px solid rgba(132,217,147,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#84d993',boxShadow:'0 10px 20px rgba(132,217,147,0.1)'}} className="ap">
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
    </div>
  );
}
