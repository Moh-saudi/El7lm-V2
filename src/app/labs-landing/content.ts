import {
  BarChart3,
  CalendarCheck2,
  Gauge,
  Goal,
  Search,
  Trophy,
  Users,
  Video,
} from 'lucide-react';

export const logos = ['EL7LM', 'VLab Sports', 'Hagzz', 'Academies', 'Scouts', 'Clubs'];

export const content = {
  ar: {
    dir: 'rtl' as const,
    nav: ['الخدمات', 'الفئات المستهدفة', 'عناصر القوة', 'مراحل التنفيذ'],
    current: 'الموقع الحالي',
    start: 'ابدأ معنا',
    eyebrow: 'EL7LM شركة قطرية تعمل تحت مظلة Mesk LLC',
    titleA: 'منظومة رياضية رقمية',
    titleB: 'تجمع بين اكتشاف المواهب وتحليل الأداء والخدمات التشغيلية',
    hero:
      'تقدم EL7LM منظومة رقمية متكاملة تخدم القطاع الرياضي من خلال اكتشاف المواهب، وتحليل الفيديو عبر VLab Sports، وإدارة الحجز والخدمات الرياضية عبر Hagzz، ضمن تجربة موحدة صممت لتلبية احتياجات اللاعبين والأكاديميات والأندية والشركاء.',
    heroButtons: ['استعرض الخدمات', 'تعرّف على المنظومة'],
    heroPanel:
      'تجربة رقمية مؤسسية توحّد ما بين العرض الرياضي، والتحليل الفني، والخدمات التشغيلية ضمن إطار واحد أكثر وضوحًا وكفاءة.',
    aiKicker: 'Ask EL7LM',
    aiTitle: 'كيف يمكن للمنصة أن تدعم احتياجك؟',
    aiText:
      'اختر نموذجًا من الاستخدامات الشائعة، وشاهد كيف تربط المنصة كل احتياج بالمسار أو الخدمة الأنسب داخل المنظومة.',
    aiSidebarTitle: 'نماذج طلبات شائعة',
    aiAssistant: 'EL7LM Assistant',
    aiSuggestionsTitle: 'اقتراحات سريعة',
    aiComposerPlaceholder: 'اكتب احتياجك الرياضي أو التشغيلي هنا',
    stats: [
      { value: '3', label: 'محاور رئيسية' },
      { value: '2', label: 'أسواق تشغيلية' },
      { value: 'AI', label: 'تحليل فيديو لحظي' },
    ],
    slides: [
      {
        title: 'فرص التطوير والاحتراف',
        prompt: 'أبحث عن فرصة احتراف أو برنامج تطوير رياضي مناسب',
        responseTitle: 'يمكن أن يبدأ هذا المسار عبر EL7LM',
        response:
          'تساعد EL7LM في تقديم الملف الرياضي بصورة أكثر احترافية، وإبراز المهارات والسجل الرياضي، وربط اللاعب أو الجهة المعنية بالفرص والمسارات المناسبة وفق طبيعة الهدف الرياضي.',
        subtitle:
          'عرض احترافي للمهارات والسجل الرياضي يرفع من وضوح الملف ويساعد على الوصول إلى الجهات المناسبة.',
        image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-young-football-player-training-1561196134672?download=1080p',
      },
      {
        title: 'التحليل الفني واتخاذ القرار',
        prompt: 'أحتاج إلى تحليل فيديو يدعم التقييم الفني واتخاذ القرار',
        responseTitle: 'VLab Sports مصمم لهذا النوع من الاحتياج',
        response:
          'يوفر VLab Sports قدرات تحليل فيديو تساعد على قراءة المشاهد بصورة أسرع، وفهم الأداء بصورة أوضح، وتقليل الوقت المطلوب للمراجعة اليدوية، بما يدعم الأجهزة الفنية والكشفية.',
        subtitle:
          'تحليل فيديو متقدم يدعم فهم الأداء الفني بصورة أسرع وأكثر دقة لاتخاذ قرارات أفضل.',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-a-young-man-jogging-on-a-soccer-field-1561717342604?download=1080p',
      },
      {
        title: 'الحجز والتنظيم التشغيلي',
        prompt: 'أريد نظامًا للحجز وتنظيم الخدمات الرياضية والحضور',
        responseTitle: 'Hagzz يقدم الإطار التشغيلي المناسب',
        response:
          'يساعد Hagzz على تنظيم الحجز والخدمات الرياضية ضمن تجربة تشغيلية أكثر وضوحًا وكفاءة، بما يدعم الأكاديميات والمراكز الرياضية في إدارة الخدمات والوصول إلى المستفيدين بصورة أسهل.',
        subtitle:
          'إدارة الحجز والخدمات الرياضية ضمن تجربة تشغيلية أكثر تنظيمًا وكفاءة في قطر ومصر.',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-football-training-session-1572526310038?download=1080p',
      },
    ],
    coreTitle: 'منظومة رياضية متكاملة في تجربة رقمية واحدة',
    coreText:
      'تعكس المنصة نطاقًا أوسع من الخدمات، يبدأ من اكتشاف المواهب وتحليل الأداء، ويمتد إلى الحجز والتشغيل الرياضي، ضمن تجربة موحدة تخدم مختلف الأطراف في القطاع.',
    pillars: [
      {
        id: '01',
        title: 'اكتشاف المواهب',
        text:
          'تمكين اللاعبين والأكاديميات من تقديم ملفاتهم بصورة احترافية وأكثر وضوحًا أمام الأندية والكشافين والجهات ذات العلاقة.',
      },
      {
        id: '02',
        title: 'تحليل الأداء',
        text:
          'تقديم قدرات تحليل متقدمة عبر VLab Sports تساعد على فهم الأداء الفني بصورة أسرع وأكثر فاعلية.',
      },
      {
        id: '03',
        title: 'الخدمات التشغيلية',
        text:
          'توسيع نطاق المنظومة عبر Hagzz ليشمل الحجز والخدمات الرياضية ضمن إطار تشغيلي يدعم السوق الرياضي مباشرة.',
      },
    ],
    detailsCta: 'المزيد من التفاصيل',
    founderLabel: 'كلمة المؤسس',
    founderTitle: 'نؤمن بأن التقنية قادرة على تقليل المسافة بين الموهبة والفرصة.',
    founderBody:
      'انطلقت EL7LM من رؤية تهدف إلى تقديم حلول رقمية أكثر كفاءة ووضوحًا للقطاع الرياضي. ومن خلال التكامل مع VLab Sports وHagzz، أصبحت المنظومة قادرة على الجمع بين الاكتشاف والتحليل والخدمات التشغيلية ضمن إطار واحد.',
    founderClosing:
      'يعكس هذا التوجه التزامنا ببناء منظومة رياضية حديثة تنطلق من قطر، وتخدم احتياجات السوق الإقليمي بمعايير مؤسسية واضحة.',
    founderActions: ['استعرض الخدمات', 'الفئات المستهدفة'],
    servicesTitle: 'خدمات رئيسية ضمن منظومة واحدة',
    servicesText:
      'تعمل مكونات المنظومة معًا لتقديم قيمة متكاملة، تجمع بين وضوح الاستخدام، وكفاءة التشغيل، وملاءمة الحلول لمختلف احتياجات القطاع الرياضي.',
    services: [
      {
        icon: Search,
        badge: 'EL7LM',
        title: 'منصة اكتشاف المواهب',
        image: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-young-football-player-training-1561196134672?download=1080p',
        description:
          'منصة مخصصة لعرض المواهب والملفات الرياضية بصورة احترافية تساعد على تحسين الظهور والوصول إلى الجهات المناسبة.',
        bullets: ['ملفات احترافية للمواهب', 'وضوح في عرض القيمة الرياضية', 'تجربة مناسبة للاعبين والأكاديميات'],
        cta: 'استكشف EL7LM',
      },
      {
        icon: Video,
        badge: 'VLab Sports',
        title: 'تحليل فيديو لحظي',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-a-young-man-jogging-on-a-soccer-field-1561717342604?download=1080p',
        description:
          'خدمة تحليل متقدمة تدعم الجهات الفنية والكشفية من خلال قراءة أسرع للمشاهد وفهم أوضح للأداء داخل الفيديو.',
        bullets: ['تحليل أسرع للمشاهد', 'تقليل المراجعة اليدوية', 'دعم أفضل لاتخاذ القرار الفني'],
        cta: 'اطلب عرضًا توضيحيًا',
      },
      {
        icon: CalendarCheck2,
        badge: 'Hagzz',
        title: 'الحجز والخدمات الرياضية',
        image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-football-training-session-1572526310038?download=1080p',
        description:
          'خدمة تشغيلية لإدارة الحجز والتجارب الرياضية بما يعزز من كفاءة التشغيل ووضوح الخدمة في قطر ومصر.',
        bullets: ['تنظيم الحجز والخدمات', 'مناسب للأكاديميات والمراكز', 'امتداد عملي للمنظومة'],
        cta: 'اكتشف Hagzz',
      },
    ],
    audienceTitle: 'حلول مصممة لكل فئة',
    audienceText:
      'تم بناء المنظومة لتخدم فئات متعددة داخل القطاع الرياضي، مع وضوح في الرسالة وملاءمة في الاستخدام لكل طرف.',
    audiences: [
      {
        icon: Goal,
        title: 'للرياضيين',
        text:
          'عرض المهارات والسجل الرياضي بصورة احترافية تدعم الحضور وتقرّب الرياضي من الفرص المناسبة.',
        action: 'ابدأ كرياضي',
      },
      {
        icon: Users,
        title: 'للأكاديميات',
        text:
          'إدارة أكثر تنظيمًا للمواهب والخدمات والحجوزات ضمن تجربة رقمية أوضح وأكثر كفاءة.',
        action: 'اطلب نسخة للأكاديميات',
      },
      {
        icon: Search,
        title: 'للأندية والكشافين',
        text:
          'الوصول إلى اللاعبين والفيديوهات والتحليلات بصورة أسرع بما يدعم كفاءة المراجعة واتخاذ القرار.',
        action: 'ابدأ كنادٍ أو كشاف',
      },
      {
        icon: Trophy,
        title: 'للشركاء والجهات الرياضية',
        text:
          'واجهة مؤسسية حديثة تدعم الشراكات والعروض والفرص التجارية ضمن بيئة أكثر وضوحًا وتنظيمًا.',
        action: 'ناقش الشراكة',
      },
    ],
    metricsTitle: 'عناصر قوة تدعم القيمة المؤسسية',
    metrics: [
      { icon: Users, value: 'Multi-Audience', label: 'حلول تخدم أكثر من فئة' },
      { icon: Gauge, value: 'Real-Time AI', label: 'تحليل متقدم عبر VLab Sports' },
      { icon: Trophy, value: 'Qatar + Egypt', label: 'تشغيل فعلي عبر أكثر من سوق' },
      { icon: BarChart3, value: 'Enterprise Look', label: 'تجربة حديثة تعزز الثقة' },
    ],
    testimonialsTitle: 'رسائل تعكس وضوح التوجه',
    testimonials: [
      {
        author: 'رسالة العلامة',
        quote:
          'تعرض EL7LM نفسها كمنظومة رياضية رقمية تجمع بين اكتشاف المواهب وتحليل الأداء والخدمات التشغيلية في إطار واحد.',
        role: 'Brand Direction',
      },
      {
        author: 'التموضع التجاري',
        quote:
          'يساهم الجمع بين VLab Sports وHagzz داخل المنظومة في تقديم صورة أكثر تكاملًا وقيمة على المستوى التجاري والتقني.',
        role: 'Growth View',
      },
      {
        author: 'وضوح الاستخدام',
        quote:
          'تقدم كل خدمة داخل المنظومة بصورة أوضح، مع رسالة مباشرة وإجراء واضح يخدم الفئة المستهدفة.',
        role: 'Conversion Focus',
      },
    ],
    pricingTitle: 'مراحل تنفيذ واضحة',
    pricingText:
      'يمكن استخدام هذا القسم لتوضيح مراحل التنفيذ أو مستويات العرض بحسب احتياجات المشروع والعروض المؤسسية.',
    plans: [
      {
        name: 'Core',
        note: 'نسخة أساسية قوية',
        features: ['Hero احترافي', 'كلمة المؤسس', 'أقسام الخدمات', 'دعوات إجراء واضحة'],
        cta: 'ابدأ بهذه المرحلة',
      },
      {
        name: 'Growth',
        note: 'الأنسب للعرض التجاري',
        features: ['كل ما سبق', 'قسم مستقل لـ VLab Sports', 'قسم مستقل لـ Hagzz', 'محتوى مخصص للفئات المختلفة'],
        cta: 'الخيار الأنسب',
        featured: true,
      },
      {
        name: 'Signature',
        note: 'نسخة مؤسسية متقدمة',
        features: ['كل ما سبق', 'نسخة عربية وإنجليزية', 'شعارات ورسائل ثقة', 'جاهزة للعروض والشراكات'],
        cta: 'اطلب النسخة المؤسسية',
      },
    ],
    recommended: 'Recommended',
    finalTitle: 'أساس مناسب لنسخة رسمية ثنائية اللغة',
    finalText:
      'يمكن تطوير هذه البنية بصريًا ومحتوائيًا لتكون النسخة الرسمية المعتمدة للواجهة الرئيسية أو للعروض المؤسسية.',
    finalActions: ['العودة إلى الموقع الحالي', 'اعتماد هذا الاتجاه'],
  },
  en: {
    dir: 'ltr' as const,
    nav: ['Services', 'Audience', 'Strengths', 'Execution'],
    current: 'Current Site',
    start: 'Get Started',
    eyebrow: 'EL7LM is a Qatar-based company operating under Mesk LLC',
    titleA: 'A digital sports ecosystem',
    titleB: 'uniting talent discovery, performance intelligence, and operational services',
    hero:
      'EL7LM delivers an integrated digital ecosystem for the sports sector through talent discovery, video intelligence via VLab Sports, and booking operations through Hagzz, within one unified experience designed for athletes, academies, clubs, and partners.',
    heroButtons: ['Explore Services', 'Explore the Ecosystem'],
    heroPanel:
      'A structured digital experience that brings presentation, technical analysis, and operational services together within one institutional framework.',
    aiKicker: 'Ask EL7LM',
    aiTitle: 'How can the platform support your need?',
    aiText:
      'Choose one of the common scenarios below and see how the platform maps each need to the most relevant service within the ecosystem.',
    aiSidebarTitle: 'Suggested prompts',
    aiAssistant: 'EL7LM Assistant',
    aiSuggestionsTitle: 'Quick suggestions',
    aiComposerPlaceholder: 'Describe your sports or operational need',
    stats: [
      { value: '3', label: 'Core pillars' },
      { value: '2', label: 'Operating markets' },
      { value: 'AI', label: 'Real-time video analysis' },
    ],
    slides: [
      {
        title: 'Development and professional pathways',
        prompt: 'I am looking for a professional opportunity or a structured athlete development program',
        responseTitle: 'This journey can begin through EL7LM',
        response:
          'EL7LM helps present athletic profiles more professionally, highlight capabilities and records clearly, and connect athletes or stakeholders with relevant pathways and opportunities.',
        subtitle:
          'A professional profile presentation that improves visibility and strengthens positioning with the right stakeholders.',
        image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-young-football-player-training-1561196134672?download=1080p',
      },
      {
        title: 'Technical review and decision support',
        prompt: 'I need video analysis that supports technical review and decision-making',
        responseTitle: 'VLab Sports is built for this type of need',
        response:
          'VLab Sports provides advanced video analysis capabilities that enable faster scene interpretation, clearer performance insight, and less time spent on manual review for technical and scouting teams.',
        subtitle:
          'Advanced video intelligence that supports faster performance review and stronger technical decision-making.',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-a-young-man-jogging-on-a-soccer-field-1561717342604?download=1080p',
      },
      {
        title: 'Booking and operational organization',
        prompt: 'I need a system for booking, attendance, and sports service operations',
        responseTitle: 'Hagzz provides the operational layer',
        response:
          'Hagzz helps organize booking and sports services through a more structured operational experience, enabling academies and sports centers to manage delivery more efficiently.',
        subtitle:
          'Booking and operational services delivered through a more efficient and better organized execution layer across Qatar and Egypt.',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-football-training-session-1572526310038?download=1080p',
      },
    ],
    coreTitle: 'An integrated sports ecosystem in one digital experience',
    coreText:
      'The platform reflects a broader service scope that starts with talent discovery and performance intelligence, then extends into booking and sports operations through one unified structure.',
    pillars: [
      {
        id: '01',
        title: 'Talent Discovery',
        text:
          'Enable athletes and academies to present their profiles more professionally and more clearly to clubs, scouts, and relevant stakeholders.',
      },
      {
        id: '02',
        title: 'Performance Intelligence',
        text:
          'Provide advanced capabilities through VLab Sports to support faster, clearer, and more effective understanding of performance.',
      },
      {
        id: '03',
        title: 'Operational Services',
        text:
          'Extend the ecosystem through Hagzz to include booking and sports services within a practical operational framework.',
      },
    ],
    detailsCta: 'Learn more',
    founderLabel: 'Founder Message',
    founderTitle: 'We believe technology can shorten the distance between talent and opportunity.',
    founderBody:
      'EL7LM was established to introduce more efficient and better structured digital solutions to the sports sector. Through the integration of VLab Sports and Hagzz, the ecosystem now combines discovery, analysis, and operations within one framework.',
    founderClosing:
      'This direction reflects our commitment to building a modern sports ecosystem from Qatar, serving regional market needs through a clear institutional standard.',
    founderActions: ['Explore Services', 'Who We Serve'],
    servicesTitle: 'Core services within one ecosystem',
    servicesText:
      'Each component of the ecosystem contributes to one connected value proposition, combining clarity of use, operational efficiency, and relevance to multiple sports-sector needs.',
    services: [
      {
        icon: Search,
        badge: 'EL7LM',
        title: 'Talent Discovery Platform',
        image: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-young-football-player-training-1561196134672?download=1080p',
        description:
          'A dedicated platform for presenting athletes and sports talent in a more professional way that improves visibility and access to relevant opportunities.',
        bullets: ['Professional athlete profiles', 'Clear presentation of value', 'Relevant to athletes and academies'],
        cta: 'Explore EL7LM',
      },
      {
        icon: Video,
        badge: 'VLab Sports',
        title: 'Real-Time Video Analysis',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-a-young-man-jogging-on-a-soccer-field-1561717342604?download=1080p',
        description:
          'An advanced analysis capability that supports technical and scouting teams with faster scene review and clearer performance understanding.',
        bullets: ['Faster scene analysis', 'Reduced manual review', 'Stronger technical decisions'],
        cta: 'Request a demo',
      },
      {
        icon: CalendarCheck2,
        badge: 'Hagzz',
        title: 'Booking and Sports Services',
        image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1200&q=80',
        video: 'https://cdn.coverr.co/videos/coverr-football-training-session-1572526310038?download=1080p',
        description:
          'An operational layer for sports booking and service management that helps organizations deliver a clearer and more efficient experience across Qatar and Egypt.',
        bullets: ['Structured booking workflows', 'Relevant for academies and centers', 'A practical extension of the ecosystem'],
        cta: 'Discover Hagzz',
      },
    ],
    audienceTitle: 'Solutions aligned with each audience',
    audienceText:
      'The ecosystem is designed to serve multiple sports-sector stakeholders with clear messaging and relevant functionality for each segment.',
    audiences: [
      {
        icon: Goal,
        title: 'For Athletes',
        text:
          'Present skills and athletic records professionally in a way that improves visibility and supports access to the right opportunities.',
        action: 'Start as an athlete',
      },
      {
        icon: Users,
        title: 'For Academies',
        text:
          'Create a more structured experience for talent, bookings, and services through a clearer and more efficient digital framework.',
        action: 'Request an academy version',
      },
      {
        icon: Search,
        title: 'For Clubs and Scouts',
        text:
          'Reach players, videos, and analysis more efficiently to support faster review and stronger decision-making.',
        action: 'Start as a club or scout',
      },
      {
        icon: Trophy,
        title: 'For Partners and Sports Entities',
        text:
          'Use a modern institutional interface that supports partnerships, presentations, and commercial opportunities.',
        action: 'Discuss partnership',
      },
    ],
    metricsTitle: 'Strengths that reinforce institutional value',
    metrics: [
      { icon: Users, value: 'Multi-Audience', label: 'Solutions for multiple stakeholder groups' },
      { icon: Gauge, value: 'Real-Time AI', label: 'Advanced intelligence via VLab Sports' },
      { icon: Trophy, value: 'Qatar + Egypt', label: 'Operational presence across markets' },
      { icon: BarChart3, value: 'Enterprise Look', label: 'A modern experience that builds trust' },
    ],
    testimonialsTitle: 'Messages that reflect strategic clarity',
    testimonials: [
      {
        author: 'Brand Message',
        quote:
          'EL7LM presents itself as a digital sports ecosystem that brings together talent discovery, performance intelligence, and operational services.',
        role: 'Brand Direction',
      },
      {
        author: 'Commercial Positioning',
        quote:
          'The combination of VLab Sports and Hagzz within the ecosystem creates a more complete commercial and technical proposition.',
        role: 'Growth View',
      },
      {
        author: 'Usage Clarity',
        quote:
          'Each service is presented with greater clarity, supported by direct messaging and a relevant call to action.',
        role: 'Conversion Focus',
      },
    ],
    pricingTitle: 'Clear execution phases',
    pricingText:
      'This section can be used to present implementation phases or package levels according to project scope and institutional requirements.',
    plans: [
      {
        name: 'Core',
        note: 'A strong foundational version',
        features: ['Professional hero section', 'Founder message', 'Service sections', 'Clear calls to action'],
        cta: 'Start with this phase',
      },
      {
        name: 'Growth',
        note: 'Best suited for commercial presentation',
        features: ['Everything above', 'Dedicated VLab Sports section', 'Dedicated Hagzz section', 'Audience-focused content'],
        cta: 'Best fit',
        featured: true,
      },
      {
        name: 'Signature',
        note: 'Advanced institutional version',
        features: ['Everything above', 'Arabic and English', 'Trust-building content', 'Ready for partnerships and presentations'],
        cta: 'Request enterprise version',
      },
    ],
    recommended: 'Recommended',
    finalTitle: 'A strong foundation for an official bilingual release',
    finalText:
      'This structure can now be refined further and used as the foundation for the official homepage or an institutional presentation experience.',
    finalActions: ['Back to current site', 'Approve this direction'],
  },
};

export type LandingLang = keyof typeof content;
