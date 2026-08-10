export interface PrivacySection {
  id: string;
  number: string;
  title: string;
  description?: string;
  paragraphs?: string[];
  subsections?: {
    title: string;
    items?: string[];
    description?: string;
  }[];
  bullets?: string[];
  callout?: {
    type: 'important' | 'warning' | 'info' | 'success';
    title?: string;
    text: string;
    items?: string[];
  };
}

export interface PrivacyPolicyData {
  title: string;
  companyName: string;
  badge: string;
  lastUpdated: string;
  referenceNotice: string;
  searchPlaceholder: string;
  clearSearchLabel: string;
  noResultsText: string;
  viewAllSectionsLabel: string;
  tocTitle: string;
  sectionsCountLabel: string;
  printButton: string;
  deleteDataButton: string;
  haveQuestionLabel: string;
  contactOfficerLabel: string;
  sectionPrefix: string;
  copyEmailLabel: string;
  copyAddressLabel: string;
  copiedLabel: string;
  directCallLabel: string;
  pillarsTitle: string;
  pillarsSubtitle: string;
  pillars: {
    title: string;
    desc: string;
    badge: string;
  }[];
  contactInfo: {
    emailLabel: string;
    emailValue: string;
    addressLabel: string;
    addressValue: string;
    phoneQatarLabel: string;
    phoneQatarValue: string;
    phoneEgyptLabel: string;
    phoneEgyptValue: string;
  };
  copyright: string;
  sections: PrivacySection[];
}

export const PRIVACY_POLICY_DATA: Record<'ar' | 'en' | 'es' | 'pt', PrivacyPolicyData> = {
  ar: {
    title: "سياسة الخصوصية",
    companyName: "منصة الحُلم (El7lm) — إحدى شركات مسك القابضة",
    badge: "مركز الخصوصية والأمان الرقمي",
    lastUpdated: "10 أغسطس 2026",
    referenceNotice: "النسخة العربية هي النص المرجعي المعتمد عند أي تعارض بين اللغات",
    searchPlaceholder: "ابحث في بنود سياسة الخصوصية...",
    clearSearchLabel: "مسح",
    noResultsText: "لم يتم العثور على نتائج تطابق بحثك.",
    viewAllSectionsLabel: "عرض جميع بنود السياسة",
    tocTitle: "فهرس السياسة",
    sectionsCountLabel: "14 بند",
    printButton: "طباعة السياسة",
    deleteDataButton: "حذف الحساب والبيانات",
    haveQuestionLabel: "لديك استفسار حول بياناتك؟",
    contactOfficerLabel: "تواصل مع مسؤول حماية البيانات",
    sectionPrefix: "البند",
    copyEmailLabel: "نسخ البريد",
    copyAddressLabel: "نسخ العنوان",
    copiedLabel: "تم النسخ!",
    directCallLabel: "اتصال مباشر",
    pillarsTitle: "ركائز حماية البيانات في منصة الحُلم",
    pillarsSubtitle: "نحن نضع أمان بياناتك وحماية موهبتك الرياضية في مقدمة أولوياتنا وفق معايير عالمية",
    pillars: [
      {
        title: "حماية القُصّر واللاعبين",
        desc: "الحد الأدنى 10 سنوات، ولا يتم عرض أي بيانات إلا بموافقة ولي الأمر الموقعة إلكترونيًا.",
        badge: "أمان العائلة"
      },
      {
        title: "عرض المواهب بأمان",
        desc: "الصور والفيديوهات تُعرض حصرًا لإبراز الموهبة أمام الأندية والكشافين المعتمدين.",
        badge: "سوق كروي آمن"
      },
      {
        title: "حماية المدفوعات (PCI-DSS)",
        desc: "معالجة مشفرة بالكامل بدون تخزين أرقام البطاقات أو رموز CVV على خوادمنا.",
        badge: "تشفير مالي"
      },
      {
        title: "حقوق التحكم الكاملة",
        desc: "يحق لك ولولي أمرك مراجعة أو تعديل أو حذف البيانات وإلغاء الموافقة في أي وقت.",
        badge: "تحكم كامل"
      }
    ],
    contactInfo: {
      emailLabel: "البريد الإلكتروني",
      emailValue: "info@el7lm.com",
      addressLabel: "العنوان الرسمي",
      addressValue: "مركز قطر للمال، مبنى 98، الدور التاسع، الدوحة، دولة قطر",
      phoneQatarLabel: "هاتف (قطر)",
      phoneQatarValue: "+974 7054 2458",
      phoneEgyptLabel: "هاتف (مصر)",
      phoneEgyptValue: "+20 1017799580"
    },
    copyright: "© 2026 الحُلم (El7lm) — إحدى شركات مسك القابضة. جميع الحقوق محفوظة.",
    sections: [
      {
        id: "intro",
        number: "1",
        title: "1. مقدمة",
        paragraphs: [
          "تلتزم منصة \"الحُلم\" (El7lm)، التابعة لشركة مسك القابضة (\"المنصة\"، \"نحن\")، بحماية خصوصية وبيانات مستخدميها. توضح هذه السياسة نوع البيانات الشخصية التي نجمعها من مستخدمي منصة الحُلم وتطبيقها على الهواتف المحمولة (يُشار إليهما مجتمعين بـ\"الخدمات\")، وأسباب جمعها، وكيفية استخدامها وحمايتها، والجهات التي نشاركها معها، والحقوق التي تملكونها تجاه بياناتكم.",
          "تسري هذه السياسة على جميع مستخدمي الخدمات، بمن فيهم اللاعبون وأولياء أمورهم، والأندية، والأكاديميات، والوكلاء الرياضيون، والمدربون، ومنظمو البطولات. باستخدامكم للخدمات أو إنشاء حساب عليها، فإنكم تقرّون بأنكم قرأتم هذه السياسة وفهمتموها ووافقتم عليها."
        ]
      },
      {
        id: "data-collected",
        number: "2",
        title: "2. البيانات التي نجمعها",
        description: "نجمع البيانات الضرورية لتقديم الخدمات الرياضية الرقمية وتسهيل الربط بين اللاعبين والأندية:",
        subsections: [
          {
            title: "2.1 بيانات الحساب والهوية",
            items: [
              "الاسم الكامل",
              "البريد الإلكتروني ورقم الهاتف",
              "تاريخ الميلاد",
              "الجنسية وبلد الإقامة",
              "نوع الحساب (لاعب، نادٍ، أكاديمية، وكيل، مدرب، منظم بطولة) والحقول الخاصة بكل نوع حساب",
              "بيانات التحقق من الهوية عند الحاجة (المستندات الرسمية المعتمدة)"
            ]
          },
          {
            title: "2.2 البيانات الرياضية والأداء",
            items: [
              "مركز اللعب، المهارات، الصفات البدنية، والإحصائيات",
              "الانتماء الحالي والسابق للأندية والأكاديميات",
              "التقييمات والإنجازات المسجّلة من قبل الأندية أو الأكاديميات أو المدربين"
            ]
          },
          {
            title: "2.3 الصور ومقاطع الفيديو",
            description: "لإبراز موهبة اللاعب أمام الأندية والكشافين، تتيح المنصة رفع الصور الشخصية ومقاطع الفيديو الكروية (لقطات مباريات، تدريبات، ملخصات). يتم عرض هذا المحتوى للجهات الموضحة في القسم 6، وفقًا لموافقة اللاعب أو ولي أمره الموضحة في القسم 3."
          },
          {
            title: "2.4 بيانات الدفع",
            description: "عند الاشتراك في خطة مدفوعة أو إجراء أي عملية دفع، تتم معالجة بياناتك المالية عبر مزوّد دفع خارجي متوافق مع معايير أمان بيانات بطاقات الدفع (PCI-DSS). لا نخزّن رقم البطاقة الكامل أو رمز التحقق (CVV) على خوادمنا. نحتفظ فقط بـ:",
            items: [
              "سجلات المعاملات (المبلغ، التاريخ، نوع الاشتراك، الحالة)",
              "إشارة جزئية/مُموّهة لوسيلة الدفع (كآخر 4 أرقام) عند توفرها من مزوّد الدفع"
            ]
          },
          {
            title: "2.5 البيانات التقنية",
            items: [
              "عنوان IP",
              "نوع المتصفح والجهاز ونظام التشغيل",
              "بيانات الاستخدام (الصفحات المُشاهدة، الميزات المستخدمة، مدة الجلسة)",
              "ملفات تعريف الارتباط (الكوكيز) والتقنيات المشابهة (انظر القسم 11)",
              "الموقع التقريبي المستنتج من عنوان IP (على مستوى الدولة/المدينة)"
            ]
          },
          {
            title: "2.6 بيانات من أطراف أخرى",
            description: "عند تسجيل الدخول عبر حساب خارجي (مثل حساب جوجل)، نستلم البيانات الأساسية التي تسمح تلك الجهة بمشاركتها معنا (الاسم، البريد الإلكتروني، الصورة الشخصية عادةً)."
          }
        ]
      },
      {
        id: "minors-consent",
        number: "3",
        title: "3. القُصّر وموافقة ولي الأمر والموافقة على عرض الصور والفيديوهات",
        callout: {
          type: "important",
          title: "شرط أساسي لحماية اللاعبين القُصّر",
          text: "الحد الأدنى لعمر التسجيل على المنصة هو 10 سنوات. بالنسبة للاعبين القُصّر (أقل من 18 سنة)، لا يُفعَّل الحساب ولا تُعرض بياناته إلا بعد الحصول على إقرار موافقة ولي الأمر الموقّع إلكترونيًا."
        },
        bullets: [
          "الموافقة: على انضمام نجله إلى منصة الحُلم.",
          "الموافقة: على عرض بياناته الرياضية ومقاطع الفيديو الخاصة به لإبراز موهبته أمام الأندية والكشافين المعتمدين على المنصة.",
          "الإقرار: بأن المنصة بيئة تقنية حديثة (سوق رقمي)، وأن أي اختيار أو تعاقد احترافي يخضع لتقييم وقرار الأندية وحدها، دون التزام مالي متبادل من المنصة نظير هذا العرض التقني.",
          "احتفاظ ولي الأمر: بمسؤوليته عن أي تواصل أو اتفاقيات يجريها مع الأندية، مع احتفاظه الكامل بحق تعديل أو إخفاء أو حذف بيانات نجله من المنصة في أي وقت يراه مناسبًا لحماية مصلحته.",
          "بيانات الإقرار: يتضمن الإقرار اسم اللاعب، اسم ولي الأمر، رقم الهاتف، التوقيع الإلكتروني، والتاريخ.",
          "حقوق التعديل والحذف: لولي الأمر الحق في أي وقت بالتواصل معنا لمراجعة أو تعديل أو تقييد أو طلب حذف بيانات ابنه، أو سحب موافقته على استمرار عرضها.",
          "إلغاء البيانات غير المصرح بها: في حال علمنا بوجود بيانات لطفل دون السن الأدنى تم جمعها دون موافقة سارية من ولي الأمر، سنقوم بحذفها فورًا."
        ]
      },
      {
        id: "how-we-use",
        number: "4",
        title: "4. كيف نستخدم بياناتك",
        bullets: [
          "إنشاء الحساب والتحقق منه وإدارته",
          "تشغيل المنصة وتطوير ميزاتها المتجددة",
          "عرض بيانات اللاعب على الأندية والأكاديميات والكشافين وفق ضوابط القسم 6",
          "مطابقة اللاعبين بالفرص الرياضية المناسبة والعكس",
          "معالجة المدفوعات وإدارة الاشتراكات بآمان",
          "التواصل معك بخصوص حسابك والمعاملات وتحديثات الخدمة",
          "إرسال محتوى تسويقي، في حال موافقتك الصريحة على ذلك",
          "تحليل بيانات الاستخدام لتحسين أداء المنصة وتجربة المستخدم",
          "رصد ومنع الاحتيال أو إساءة استخدام المنصة",
          "الامتثال للالتزامات القانونية والتنظيمية"
        ]
      },
      {
        id: "legal-basis",
        number: "5",
        title: "5. الأساس القانوني لمعالجة البيانات",
        bullets: [
          "الموافقة: كموافقة ولي الأمر الموضحة في القسم 3، أو الموافقة على تلقي رسائل تسويقية.",
          "تنفيذ العقد: لتقديم الخدمات المشترك بها، بما يشمل عرض البروفايل ومعالجة المدفوعات.",
          "المصلحة المشروعة: لتأمين المنصة ومنع الاحتيال وتحسين الخدمات وتجربة الاستخدام.",
          "الالتزام القانوني: حيث تقتضي الأنظمة والقوانين المعمول بها ذلك."
        ]
      },
      {
        id: "data-sharing",
        number: "6",
        title: "6. مشاركة البيانات وظهور البروفايل",
        description: "لا نبيع ولا نؤجر بياناتك الشخصية لأي طرف. نشارك البيانات فقط في الحالات التوضيحية التالية:",
        bullets: [
          "ظهور البروفايل على المنصة: يظهر البروفايل الرياضي للاعب (بياناته، صوره، ومقاطع الفيديو الخاصة به) لجميع الحسابات الأخرى المسجّلة على المنصة، سواء المدفوعة أو المجانية، ومنها: كشافو الأندية، المدربون، الأكاديميات، والوكلاء/المسوقون الرياضيون، وذلك بعد الحصول على موافقة ولي الأمر الموضحة في القسم 3.",
          "أكواد الدعوة والانتماء التنظيمي: تتيح المنصة للأندية والأكاديميات والوكلاء والمدربين إصدار أكواد دعوة للانضمام إلى منظماتهم. عند استخدام اللاعب لهذا الكود، يظهر بروفايله على أنه \"تابع\" لتلك الجهة، وذلك لحفظ حقوق اللاعبين والجهات التابعة لهم.",
          "مزودو الخدمة: نستعين بمزودي خدمة موثوقين لتشغيل المنصة، تحديدًا: مزوّد لمعالجة المدفوعات، ومزوّد لاستضافة البيانات على السحابة، ومزوّد لاستضافة الصور ومقاطع الفيديو، ومزوّد لإرسال رسائل التحقق والإشعارات. يلتزم كل مزوّد تعاقديًا باستخدام البيانات فقط لتقديم خدمته لنا وبمعايير أمان وسرية مناسبة.",
          "المتطلبات القانونية: عند الحاجة للامتثال لقانون أو إجراء قانوني أو طلب رسمي من جهة حكومية.",
          "حماية الحقوق: لحماية حقوق المنصة أو مستخدميها أو الجمهور.",
          "عمليات نقل الأعمال: في حال الاندماج أو الاستحواذ أو بيع الأصول، مع استمرار سريان هذه السياسة على بياناتك."
        ]
      },
      {
        id: "international-transfers",
        number: "7",
        title: "7. النقل الدولي للبيانات",
        paragraphs: [
          "نقدّم خدماتنا حاليًا لمستخدمين في المغرب والجزائر ومصر والسعودية والإمارات والبحرين والكويت وإسبانيا والبرتغال، وقد يتم استضافة بعض بياناتك لدى مزودي خدمة يقع مقرهم أو بنيتهم التحتية خارج قطر. في هذه الحالات، نتخذ إجراءات معقولة لضمان حماية بياناتك بمستوى مكافئ، بما يشمل التعاقد مع مزودين حاصلين على شهادات أمان معترف بها دوليًا."
        ]
      },
      {
        id: "data-security",
        number: "8",
        title: "8. أمان البيانات",
        bullets: [
          "تشفير البيانات أثناء النقل (TLS/HTTPS) وأثناء التخزين (AES-256)",
          "مراقبة مستمرة على مدار الساعة 24/7 لرصد أي نشاط غير معتاد",
          "تحديث مستمر لبروتوكولات ودفاعات الأمان الرقمي",
          "تقييد الوصول إلى البيانات على الموظفين والمهندسين المخوّلين فقط",
          "نسخ احتياطي دوري ومنتظم للبيانات لضمان عدم الضياع",
          "ملاحظة هامة: لا توجد وسيلة نقل أو تخزين إلكتروني آمنة بنسبة 100%، ورغم جهودنا لحماية بياناتك، لا يمكننا ضمان الأمان المطلق."
        ]
      },
      {
        id: "retention",
        number: "9",
        title: "9. مدة الاحتفاظ بالبيانات",
        bullets: [
          "مدة الحساب النشط: نحتفظ ببياناتك طالما حسابك نشط أو حسب الحاجة لتقديم الخدمة.",
          "عند حذف الحساب: يتم حذف أو إخفاء البروفايل والبيانات الرياضية والصور ومقاطع الفيديو خلال 90 يومًا من تاريخ الحذف.",
          "السجلات المالية: نحتفظ بسجلات المعاملات المالية لمدة 5 سنوات وفق الممارسات المحاسبية المعتمدة للامتثال للالتزامات الضريبية والقانونية.",
          "الاحتفاظ الاستثنائي: قد نحتفظ ببعض البيانات لمدة أطول عند الضرورة لتسوية نزاع أو إنفاذ اتفاقياتنا أو الامتثال لقانون."
        ]
      },
      {
        id: "your-rights",
        number: "10",
        title: "10. حقوقك",
        description: "وفقًا للأنظمة والمعايير المعمول بها، لك الحقوق التالية تجاه بياناتك الشخصية:",
        bullets: [
          "الوصول: طلب نسخة من بياناتك الشخصية المحفوظة لدينا.",
          "التصحيح: طلب تصحيح أو تحديث أي بيانات غير دقيقة.",
          "الحذف: طلب حذف بياناتك الشخصية وفق الشروط التوضيحية في القسم 9.",
          "التقييد: طلب تقييد معالجة بياناتك في حالات ومعايير محددة.",
          "نقل البيانات: الحصول على بياناتك بصيغة منظمة وشائعة الاستخدام ويمكن قراءتها آليًا.",
          "الاعتراض: الاعتراض على معالجة معينة، بما يشمل التسويق المباشر.",
          "سحب الموافقة: سحب موافقتك في أي وقت دون التأثير على قانونية المعالجة السابقة."
        ],
        paragraphs: [
          "لممارسة أي من هذه الحقوق، تواصل معنا عبر بيانات التواصل في القسم 14. قد نطلب التحقق من هويتك قبل تنفيذ الطلب. بالنسبة للاعبين القُصّر، يمارس ولي الأمر هذه الحقوق نيابة عنهم."
        ]
      },
      {
        id: "cookies",
        number: "11",
        title: "11. ملفات تعريف الارتباط (الكوكيز)",
        subsections: [
          {
            title: "أنواع الكوكيز المستخمة",
            items: [
              "كوكيز أساسية: ضرورية لعمل المنصة وتسجيل الدخول، ولا يمكن تعطيلها.",
              "كوكيز الأداء: لفهم كيفية استخدام المنصة وتحسين استجابتها وسرعتها.",
              "كوكيز التفضيلات: لحفظ إعداداتك المفضلة كاللغة والمظهر.",
              "كوكيز تسويقية: لعرض محتوى مخصص ومناسب، ولا تُفعّل إلا بموافقتك."
            ]
          }
        ],
        paragraphs: [
          "عند أول زيارة، ستظهر لك نافذة موافقة على الكوكيز يمكنك من خلالها قبول أو إدارة الكوكيز غير الأساسية."
        ]
      },
      {
        id: "governing-law",
        number: "12",
        title: "12. القانون الحاكم والجهة التنظيمية",
        paragraphs: [
          "تخضع هذه السياسة لقوانين حماية البيانات في دولة قطر، وتحديدًا القانون رقم 13 لسنة 2016 بشأن حماية خصوصية البيانات الشخصية. إذا كنت مقيمًا في دولة أخرى، فقد تسري عليك حقوق إضافية بموجب قوانين تلك الدولة. يحق لك تقديم شكوى إلى الجهة التنظيمية المختصة بحماية البيانات في قطر أو في بلد إقامتك."
        ]
      },
      {
        id: "changes",
        number: "13",
        title: "13. التعديلات على هذه السياسة",
        paragraphs: [
          "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر لأسباب تشغيلية أو قانونية أو تنظيمية. سنُخطرك بأي تعديلات جوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة قبل سريانها. استمرارك في استخدام الخدمات بعد سريان التعديلات يُعد موافقة منك على السياسة المحدّثة."
        ]
      },
      {
        id: "contact",
        number: "14",
        title: "14. تواصل معنا",
        description: "للاستفسار عن هذه السياسة أو ممارسة حقوقك المتعلقة ببياناتك، يسر فريق الحُلم تواصلكم معنا عبر القنوات التالية:"
      }
    ]
  },

  en: {
    title: "Privacy Policy",
    companyName: "El7lm Platform — A Mesk Holding Company",
    badge: "Privacy & Data Security Center",
    lastUpdated: "August 10, 2026",
    referenceNotice: "In case of any conflict between language versions, the Arabic version prevails.",
    searchPlaceholder: "Search Privacy Policy terms...",
    clearSearchLabel: "Clear",
    noResultsText: "No section matches your search criteria.",
    viewAllSectionsLabel: "View All Policy Sections",
    tocTitle: "Table of Contents",
    sectionsCountLabel: "14 Sections",
    printButton: "Print Policy",
    deleteDataButton: "Delete Account & Data",
    haveQuestionLabel: "Have a question about your data?",
    contactOfficerLabel: "Contact Data Protection Officer",
    sectionPrefix: "Section",
    copyEmailLabel: "Copy Email",
    copyAddressLabel: "Copy Address",
    copiedLabel: "Copied!",
    directCallLabel: "Direct Call",
    pillarsTitle: "Core Data Protection Pillars at El7lm",
    pillarsSubtitle: "We prioritize your privacy and talent data protection following international standards.",
    pillars: [
      {
        title: "Minors & Player Safety",
        desc: "Accounts for players under 18 require an electronically signed Parental Consent Declaration before display.",
        badge: "Family Security"
      },
      {
        title: "Safe Talent Showcase",
        desc: "Photos & videos are displayed strictly to showcase player talent to accredited clubs and scouts.",
        badge: "Verified Marketplace"
      },
      {
        title: "PCI-DSS Safe Payments",
        desc: "Full payment security. We store zero CVV or full card numbers on our servers.",
        badge: "Financial Security"
      },
      {
        title: "Full User Rights",
        desc: "Parents and players hold full rights to access, review, edit, or delete data at any time.",
        badge: "Full Control"
      }
    ],
    contactInfo: {
      emailLabel: "Email Address",
      emailValue: "info@el7lm.com",
      addressLabel: "Headquarters Address",
      addressValue: "Qatar Financial Centre, Tower 98, 9th Floor, Doha, State of Qatar",
      phoneQatarLabel: "Phone (Qatar)",
      phoneQatarValue: "+974 7054 2458",
      phoneEgyptLabel: "Phone (Egypt)",
      phoneEgyptValue: "+20 1017799580"
    },
    copyright: "© 2026 El7lm, a Mesk Holding company. All rights reserved.",
    sections: [
      {
        id: "intro",
        number: "1",
        title: "1. Introduction",
        paragraphs: [
          "El7lm (\"El7lm\", \"the Platform\", \"we\", \"us\", \"our\"), operated under Mesk Holding, is committed to protecting the privacy of its users. This Policy explains what personal data we collect from users of the El7lm platform and mobile application (together, the \"Services\"), why we collect it, how we use and protect it, who we share it with, and the rights you have over it.",
          "This Policy applies to all users of the Services, including players and their parents/guardians, clubs, academies, sports agents, trainers, and tournament organizers. By using the Services or creating an account, you acknowledge that you have read, understood, and agreed to this Policy."
        ]
      },
      {
        id: "data-collected",
        number: "2",
        title: "2. Information We Collect",
        subsections: [
          {
            title: "2.1 Account & Identity Information",
            items: [
              "Full name",
              "Email address and phone number",
              "Date of birth",
              "Nationality and country of residence",
              "Account type (player, club, academy, agent, trainer, tournament organizer) and role-specific fields",
              "Identity verification information, where applicable (official ID documents requested when required)"
            ]
          },
          {
            title: "2.2 Sports & Performance Information",
            items: [
              "Playing position, skills, physical attributes, and statistics",
              "Current and past club/academy affiliation",
              "Ratings and achievements recorded by clubs, academies, or trainers"
            ]
          },
          {
            title: "2.3 Photos & Videos",
            description: "To showcase a player's talent to clubs and scouts, the Platform allows uploading of profile photographs and football video clips (match footage, training clips, highlight reels). This content is displayed to the parties described in Section 6, based on the player's or parent/guardian's consent described in Section 3."
          },
          {
            title: "2.4 Payment Information",
            description: "When you subscribe to a paid plan or make a payment, your financial data is processed by a third-party, PCI-DSS-compliant payment processor. We do not store your full card number or CVV on our servers. We retain only:",
            items: [
              "Transaction records (amount, date, subscription type, status)",
              "A masked/partial reference to the payment method (e.g. last 4 digits), where provided by the processor"
            ]
          },
          {
            title: "2.5 Technical Information",
            items: [
              "IP address",
              "Browser, device type, and operating system",
              "Usage data (pages viewed, features used, session duration)",
              "Cookies and similar technologies (see Section 11)",
              "Approximate location derived from IP address (country/city level)"
            ]
          },
          {
            title: "2.6 Information from Third Parties",
            description: "If you log in via a third-party account (e.g. Google), we receive the basic information that provider allows to be shared with us (typically name, email, profile photo)."
          }
        ]
      },
      {
        id: "minors-consent",
        number: "3",
        title: "3. Minors, Parental Consent & Consent to Display Photos and Videos",
        callout: {
          type: "important",
          title: "Protection of Minor Players",
          text: "The minimum age to register on the Platform is 10 years old. For minor players (under 18), the account is not activated and no data is displayed until the parent/guardian completes an electronically signed Parental Consent Declaration."
        },
        bullets: [
          "Consents: to their child joining the El7lm Platform.",
          "Consents: to their child's sports data and video clips being displayed to showcase their talent to clubs and accredited scouts on the Platform.",
          "Acknowledges: that the Platform is a modern digital marketplace, and that any professional selection or contract is solely at the clubs' evaluation and decision, with no financial obligation from the Platform in exchange for this technical showcase.",
          "Retains: responsibility for any communication or agreements made with clubs, while keeping the full right to edit, hide, or delete their child's data from the Platform at any time deemed appropriate to protect the child's interest.",
          "Declaration details: captured info includes player's name, parent/guardian's name, phone number, electronic signature, and date.",
          "Parental rights: A parent/guardian may contact us at any time to review, correct, restrict, or request deletion of their child's data, or withdraw consent for it to continue being displayed.",
          "Unconsented data deletion: If we learn that we hold data on a child below the minimum age without valid parental consent, we will delete it immediately."
        ]
      },
      {
        id: "how-we-use",
        number: "4",
        title: "4. How We Use Your Information",
        bullets: [
          "Creating, verifying, and managing your account",
          "Operating the Platform and developing its features",
          "Displaying player data to clubs, academies, and scouts per Section 6",
          "Matching players with relevant opportunities, and vice versa",
          "Processing payments and managing subscriptions securely",
          "Communicating with you about your account, transactions, and service updates",
          "Sending marketing communications, where you've explicitly consented",
          "Analyzing usage data to improve Platform performance",
          "Detecting and preventing fraud or misuse of the Platform",
          "Complying with legal and regulatory obligations"
        ]
      },
      {
        id: "legal-basis",
        number: "5",
        title: "5. Legal Basis for Processing",
        bullets: [
          "Consent: such as the parental consent described in Section 3, or consent to marketing.",
          "Performance of a contract: to deliver the subscribed Services, including profile display and payment processing.",
          "Legitimate interests: to secure the Platform, prevent fraud, and improve our Services.",
          "Legal obligation: where required by applicable law."
        ]
      },
      {
        id: "data-sharing",
        number: "6",
        title: "6. Information Sharing & Profile Visibility",
        description: "We do not sell or rent your personal data. We share data only in the following cases:",
        bullets: [
          "Profile visibility on the Platform: a player's sports profile (data, photos, and videos) is visible to all other registered accounts on the Platform, whether paid or free, including club scouts, trainers, academies, and sports agents/marketers, following the parental consent described in Section 3.",
          "Invitation codes & organizational affiliation: clubs, academies, agents, and trainers can issue invitation codes for players to join their organization. Once a player uses such a code, their profile is shown as affiliated with that organization, to protect the rights of both players and their affiliated organizations.",
          "Service providers: we rely on vetted providers to operate the Platform, specifically: a payment processing provider, a cloud data hosting provider, a photo/video hosting provider, and a messaging provider for verification codes and notifications. Each is contractually bound to use data only to deliver their service to us, under appropriate security and confidentiality terms.",
          "Legal requirements: where necessary to comply with law, legal process, or an official government request.",
          "Protection of rights: to protect the rights of the Platform, its users, or the public.",
          "Business transfers: in a merger, acquisition, or sale of assets, with this Policy continuing to apply to your data."
        ]
      },
      {
        id: "international-transfers",
        number: "7",
        title: "7. International Data Transfers",
        paragraphs: [
          "We currently serve users in Morocco, Algeria, Egypt, Saudi Arabia, the UAE, Bahrain, Kuwait, Spain, and Portugal. Some of your data may be hosted by service providers located outside Qatar. In such cases, we take reasonable steps to ensure your data receives an equivalent level of protection, including working with providers holding internationally recognized security certifications."
        ]
      },
      {
        id: "data-security",
        number: "8",
        title: "8. Data Security",
        bullets: [
          "Encryption of data in transit (TLS) and at rest (AES-256)",
          "Continuous 24/7 monitoring for unusual activity",
          "Ongoing updates to our security protocols",
          "Data access restricted to authorized personnel only",
          "Regular data backups",
          "Note: No method of electronic transmission or storage is 100% secure; while we work to protect your data, we cannot guarantee absolute security."
        ]
      },
      {
        id: "retention",
        number: "9",
        title: "9. Data Retention",
        bullets: [
          "Active Account Retention: We retain your data for as long as your account is active, or as needed to provide the Services.",
          "Account Deletion: Upon account deletion, your profile, sports data, photos, and videos are deleted or anonymized within 90 days.",
          "Financial Records: We retain financial transaction records for 5 years under standard accounting practice to comply with tax and accounting obligations.",
          "Extended Retention: We may retain some data longer where necessary to resolve a dispute, enforce our agreements, or comply with law."
        ]
      },
      {
        id: "your-rights",
        number: "10",
        title: "10. Your Rights",
        bullets: [
          "Access: request a copy of the personal data we hold about you.",
          "Correction: request correction of inaccurate data.",
          "Deletion: request deletion of your data, subject to Section 9.",
          "Restriction: request that we limit certain processing of your data.",
          "Portability: receive your data in a structured, machine-readable format.",
          "Objection: object to certain processing, including direct marketing.",
          "Withdraw consent: withdraw your consent at any time, without affecting prior lawful processing."
        ],
        paragraphs: [
          "To exercise these rights, contact us via Section 14. We may verify your identity first. For minor players, the parent/guardian exercises these rights on their behalf."
        ]
      },
      {
        id: "cookies",
        number: "11",
        title: "11. Cookies",
        subsections: [
          {
            title: "Cookie Categories",
            items: [
              "Essential cookies: required for the Platform to function; cannot be disabled.",
              "Performance cookies: help us understand how the Platform is used, so we can improve it.",
              "Preference cookies: remember your settings and preferences.",
              "Marketing cookies: used to deliver more relevant content; only set with your consent."
            ]
          }
        ],
        paragraphs: [
          "On your first visit, you will be shown a cookie consent banner where you can accept or manage non-essential cookies."
        ]
      },
      {
        id: "governing-law",
        number: "12",
        title: "12. Governing Law & Regulatory Authority",
        paragraphs: [
          "This Policy is governed by the data protection laws of the State of Qatar, specifically Law No. 13 of 2016 Concerning Personal Data Privacy Protection. If you reside elsewhere, additional rights under local law may apply. You may lodge a complaint with the competent data protection authority in Qatar or your country of residence."
        ]
      },
      {
        id: "changes",
        number: "13",
        title: "13. Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy periodically for operational, legal, or regulatory reasons. We will notify you of any material changes by email or through a notice on the Platform before they take effect. Continued use of the Services after such changes constitutes acceptance of the updated Policy."
        ]
      },
      {
        id: "contact",
        number: "14",
        title: "14. Contact Us",
        description: "For questions about this Policy or to exercise your rights over your data, please reach out to us:"
      }
    ]
  },

  es: {
    title: "Política de Privacidad",
    companyName: "Plataforma El7lm — Una empresa de Mesk Holding",
    badge: "Centro de Privacidad y Seguridad de Datos",
    lastUpdated: "10 de agosto de 2026",
    referenceNotice: "En caso de conflicto entre las versiones lingüísticas, prevalece la versión en árabe.",
    searchPlaceholder: "Buscar términos en la política de privacidad...",
    clearSearchLabel: "Borrar",
    noResultsText: "No se encontraron secciones que coincidan con tu búsqueda.",
    viewAllSectionsLabel: "Ver Todas las Secciones",
    tocTitle: "Índice de la Política",
    sectionsCountLabel: "14 Secciones",
    printButton: "Imprimir Política",
    deleteDataButton: "Eliminar Cuenta y Datos",
    haveQuestionLabel: "¿Tienes preguntas sobre tus datos?",
    contactOfficerLabel: "Contactar con el Delegado de Protección de Datos",
    sectionPrefix: "Sección",
    copyEmailLabel: "Copiar Correo",
    copyAddressLabel: "Copiar Dirección",
    copiedLabel: "¡Copiado!",
    directCallLabel: "Llamada Directa",
    pillarsTitle: "Pilares de Protección de Datos en El7lm",
    pillarsSubtitle: "Priorizamos la privacidad y seguridad de tu talento deportivo bajo estándares internacionales.",
    pillars: [
      {
        title: "Protección de Menores",
        desc: "Edad mínima de 10 años. Los datos de menores requieren declaración de consentimiento parental firmada electrónicamente.",
        badge: "Seguridad Familiar"
      },
      {
        title: "Exhibición Segura de Talento",
        desc: "Fotos y videos se muestran exclusivamente para destacar el talento ante clubes y ojeadores acreditados.",
        badge: "Mercado Verificado"
      },
      {
        title: "Pagos Seguros (PCI-DSS)",
        desc: "Procesamiento financiero seguro sin almacenar números de tarjeta completos ni códigos CVV.",
        badge: "Seguridad Financiera"
      },
      {
        title: "Derechos de Control Total",
        desc: "Padres y jugadores conservan el derecho de revisar, modificar o eliminar datos en cualquier momento.",
        badge: "Control Total"
      }
    ],
    contactInfo: {
      emailLabel: "Correo Electrónico",
      emailValue: "info@el7lm.com",
      addressLabel: "Dirección Oficial",
      addressValue: "Qatar Financial Centre, Torre 98, Piso 9, Doha, Estado de Catar",
      phoneQatarLabel: "Teléfono (Catar)",
      phoneQatarValue: "+974 7054 2458",
      phoneEgyptLabel: "Teléfono (Egipto)",
      phoneEgyptValue: "+20 1017799580"
    },
    copyright: "© 2026 El7lm, una empresa de Mesk Holding. Todos los derechos reservados.",
    sections: [
      {
        id: "intro",
        number: "1",
        title: "1. Introducción",
        paragraphs: [
          "El7lm (\"El7lm\", \"la Plataforma\", \"nosotros\"), operada bajo Mesk Holding, se compromete a proteger la privacidad de sus usuarios. Esta Política explica qué datos personales recopilamos de los usuarios de la plataforma y la aplicación móvil de El7lm (conjuntamente, los \"Servicios\"), por qué los recopilamos, cómo los usamos y protegemos, con quién los compartimos y qué derechos tiene sobre ellos.",
          "Esta Política se aplica a todos los usuarios de los Servicios, incluidos los jugadores y sus padres/tutores, clubes, academias, agentes deportivos, entrenadores y organizadores de torneos. Al usar los Servicios o crear una cuenta, usted reconoce haber leído, comprendido y aceptado esta Política."
        ]
      },
      {
        id: "data-collected",
        number: "2",
        title: "2. Información que recopilamos",
        subsections: [
          {
            title: "2.1 Información de cuenta e identidad",
            items: [
              "Nombre completo",
              "Correo electrónico y número de teléfono",
              "Fecha de nacimiento",
              "Nacionalidad y país de residencia",
              "Tipo de cuenta (jugador, club, academia, agente, entrenador, organizador de torneos) y campos específicos según el rol",
              "Información de verificación de identidad, cuando corresponda (documentos oficiales si son requeridos)"
            ]
          },
          {
            title: "2.2 Información deportiva y de rendimiento",
            items: [
              "Posición de juego, habilidades, atributos físicos y estadísticas",
              "Afiliación actual y pasada a clubes/academias",
              "Calificaciones y logros registrados por clubes, academias o entrenadores"
            ]
          },
          {
            title: "2.3 Fotos y videos",
            description: "Para mostrar el talento del jugador a clubes y ojeadores, la Plataforma permite subir fotografías de perfil y videoclips futbolísticos (partidos, entrenamientos, resúmenes). Este contenido se muestra a las partes descritas en la Sección 6, según el consentimiento del jugador o de su padre/tutor descrito en la Sección 3."
          },
          {
            title: "2.4 Información de pago",
            description: "Al suscribirse a un plan de pago o realizar un pago, sus datos financieros son procesados por un proveedor de pagos externo, compatible con PCI-DSS. No almacenamos el número completo de su tarjeta ni el CVV en nuestros servidores. Solo conservamos:",
            items: [
              "Registros de transacciones (importe, fecha, tipo de suscripción, estado)",
              "Una referencia parcial/enmascarada al método de pago (p. ej., los últimos 4 dígitos), cuando el proveedor la facilite"
            ]
          },
          {
            title: "2.5 Información técnica",
            items: [
              "Dirección IP",
              "Tipo de navegador, dispositivo y sistema operativo",
              "Datos de uso (páginas vistas, funciones utilizadas, duración de la sesión)",
              "Cookies y tecnologías similares (véase la Sección 11)",
              "Ubicación aproximada derivada de la IP (a nivel de país/ciudad)"
            ]
          },
          {
            title: "2.6 Información de terceros",
            description: "Si inicia sesión mediante una cuenta de terceros (p. ej., Google), recibimos la información básica que dicho proveedor autoriza compartir con nosotros (normalmente nombre, correo electrónico y foto de perfil)."
          }
        ]
      },
      {
        id: "minors-consent",
        number: "3",
        title: "3. Menores de edad, consentimiento parental y consentimiento para mostrar fotos y videos",
        callout: {
          type: "important",
          title: "Protección de Jugadores Menores",
          text: "La edad mínima para registrarse en la Plataforma es de 10 años. Para jugadores menores de edad (menores de 18 años), la cuenta no se activa ni se muestran sus datos hasta que el padre/tutor complete una Declaración de Consentimiento Parental firmada electrónicamente."
        },
        bullets: [
          "Consiente: que su hijo/a se una a la Plataforma El7lm.",
          "Consiente: que los datos deportivos y videoclips de su hijo/a se muestren para destacar su talento ante clubes y ojeadores acreditados en la Plataforma.",
          "Reconoce: que la Plataforma es un mercado digital moderno, y que cualquier selección o contrato profesional depende exclusivamente de la evaluación y decisión de los clubes, sin obligación financiera por parte de la Plataforma a cambio de esta exhibición técnica.",
          "Conserva: la responsabilidad por cualquier comunicación o acuerdo que realice con los clubes, manteniendo el derecho pleno de editar, ocultar o eliminar los datos de su hijo/a de la Plataforma en cualquier momento que considere adecuado para proteger su interés.",
          "Detalles de la declaración: recoge el nombre del jugador, el nombre del padre/tutor, número de teléfono, firma electrónica y fecha.",
          "Derechos del tutor: El padre/tutor puede contactarnos en cualquier momento para revisar, corregir, restringir o solicitar la eliminación de los datos de su hijo/a, o retirar el consentimiento.",
          "Eliminación sin consentimiento: Si tenemos conocimiento de que poseemos datos de un menor por debajo de la edad mínima sin consentimiento parental válido, los eliminaremos inmediatamente."
        ]
      },
      {
        id: "how-we-use",
        number: "4",
        title: "4. Cómo utilizamos su información",
        bullets: [
          "Crear, verificar y gestionar su cuenta",
          "Operar la Plataforma y desarrollar sus funciones",
          "Mostrar los datos del jugador a clubes, academias y ojeadores según la Sección 6",
          "Conectar a los jugadores con oportunidades relevantes, y viceversa",
          "Procesar pagos y gestionar suscripciones con seguridad",
          "Comunicarnos con usted sobre su cuenta, transacciones y actualizaciones del servicio",
          "Enviar comunicaciones de marketing, cuando haya dado su consentimiento explícito",
          "Analizar datos de uso para mejorar el rendimiento de la Plataforma",
          "Detectar y prevenir fraudes o el uso indebido de la Plataforma",
          "Cumplir con obligaciones legales y regulatorias"
        ]
      },
      {
        id: "legal-basis",
        number: "5",
        title: "5. Base legal para el tratamiento",
        bullets: [
          "Consentimiento: como el consentimiento parental descrito en la Sección 3, o el consentimiento para marketing.",
          "Ejecución de un contrato: para prestar los Servicios contratados, incluida la visualización del perfil y el procesamiento de pagos.",
          "Interés legítimo: para proteger la Plataforma, prevenir el fraude y mejorar nuestros Servicios.",
          "Obligación legal: cuando lo exija la normativa aplicable."
        ]
      },
      {
        id: "data-sharing",
        number: "6",
        title: "6. Compartición de información y visibilidad del perfil",
        description: "No vendemos ni alquilamos sus datos personales. Compartimos datos solo en los siguientes casos:",
        bullets: [
          "Visibilidad del perfil en la Plataforma: el perfil deportivo de un jugador (datos, fotos y videos) es visible para todas las demás cuentas registradas en la Plataforma, ya sean de pago o gratuitas, incluidos ojeadores de clubes, entrenadores, academias y agentes/promotores deportivos, previo consentimiento parental descrito en la Sección 3.",
          "Códigos de invitación y afiliación organizacional: clubes, academias, agentes y entrenadores pueden emitir códigos de invitación para que los jugadores se unan a su organización. Al usar dicho código, el perfil del jugador se muestra como afiliado a esa organización, para proteger los derechos tanto de los jugadores como de las organizaciones afiliadas.",
          "Proveedores de servicios: trabajamos con proveedores verificados para operar la Plataforma, específicamente: un proveedor de procesamiento de pagos, un proveedor de alojamiento de datos en la nube, un proveedor de alojamiento de fotos/videos y un proveedor de mensajería para códigos de verificación y notificaciones. Cada uno está contractualmente obligado a usar los datos únicamente para prestarnos su servicio, bajo condiciones adecuadas de seguridad y confidencialidad.",
          "Requisitos legales: cuando sea necesario para cumplir con la ley, un proceso legal o una solicitud oficial gubernamental.",
          "Protección de derechos: para proteger los derechos de la Plataforma, sus usuarios o el público.",
          "Transferencias comerciales: en caso de fusión, adquisición o venta de activos, continuando esta Política aplicándose a sus datos."
        ]
      },
      {
        id: "international-transfers",
        number: "7",
        title: "7. Transferencias internacionales de datos",
        paragraphs: [
          "Actualmente prestamos servicio a usuarios en Marruecos, Argelia, Egipto, Arabia Saudita, EAU, Baréin, Kuwait, España y Portugal. Parte de sus datos puede estar alojada por proveedores ubicados fuera de Catar. En tales casos, tomamos medidas razonables para garantizar que sus datos reciban un nivel de protección equivalente, incluido trabajar con proveedores que cuenten con certificaciones de seguridad reconocidas internacionalmente."
        ]
      },
      {
        id: "data-security",
        number: "8",
        title: "8. Seguridad de los datos",
        bullets: [
          "Cifrado de datos en tránsito (TLS) y en reposo (AES-256)",
          "Monitoreo continuo 24/7 de actividad inusual",
          "Actualización continua de nuestros protocolos de seguridad",
          "Acceso a los datos restringido únicamente a personal autorizado",
          "Copias de seguridad periódicas",
          "Nota: Ningún método de transmisión o almacenamiento electrónico es 100% seguro; aunque trabajamos para proteger sus datos, no podemos garantizar una seguridad absoluta."
        ]
      },
      {
        id: "retention",
        number: "9",
        title: "9. Conservación de datos",
        bullets: [
          "Cuenta activa: Conservamos sus datos mientras su cuenta esté activa o según sea necesario para prestar los Servicios.",
          "Eliminación de cuenta: Al eliminar la cuenta, su perfil, datos deportivos, fotos y videos se eliminan o anonimizan dentro de 90 días.",
          "Registros financieros: Conservamos los registros de transacciones financieras durante 5 años conforme a la práctica contable estándar para cumplir con obligaciones fiscales.",
          "Conservación extendida: Podremos conservar algunos datos por más tiempo cuando sea necesario para resolver una disputa o cumplir con la ley."
        ]
      },
      {
        id: "your-rights",
        number: "10",
        title: "10. Sus derechos",
        bullets: [
          "Acceso: solicitar una copia de los datos personales que tenemos sobre usted.",
          "Rectificación: solicitar la corrección de datos inexactos.",
          "Eliminación: solicitar la eliminación de sus datos, conforme a la Sección 9.",
          "Limitación: solicitar que restrinjamos determinados tratamientos de sus datos.",
          "Portabilidad: recibir sus datos en un formato estructurado y legible por máquina.",
          "Oposición: oponerse a determinados tratamientos, incluido el marketing directo.",
          "Retirada del consentimiento: retirar su consentimiento en cualquier momento sin afectar la licitud previa."
        ],
        paragraphs: [
          "Para ejercer estos derechos, contáctenos según la Sección 14. Podemos verificar su identidad primero. Para jugadores menores de edad, el padre/tutor ejerce estos derechos en su nombre."
        ]
      },
      {
        id: "cookies",
        number: "11",
        title: "11. Cookies",
        subsections: [
          {
            title: "Categorías de Cookies",
            items: [
              "Cookies esenciales: necesarias para el funcionamiento de la Plataforma; no se pueden desactivar.",
              "Cookies de rendimiento: nos ayudan a entender cómo se usa la Plataforma para mejorarla.",
              "Cookies de preferencias: recuerdan su configuración y preferencias.",
              "Cookies de marketing: para mostrar contenido más relevante; solo se activan con su consentimiento."
            ]
          }
        ],
        paragraphs: [
          "En su primera visita, verá un aviso de consentimiento de cookies donde podrá aceptar o gestionar las cookies no esenciales."
        ]
      },
      {
        id: "governing-law",
        number: "12",
        title: "12. Ley aplicable y autoridad reguladora",
        paragraphs: [
          "Esta Política se rige por las leyes de protección de datos del Estado de Catar, específicamente la Ley N.º 13 de 2016 sobre Protección de la Privacidad de los Datos Personales. Si reside en otro país, pueden aplicarle derechos adicionales conforme a la legislación local. Puede presentar una reclamación ante la autoridad de protección de datos competente en Catar o en su país de residencia."
        ]
      },
      {
        id: "changes",
        number: "13",
        title: "13. Cambios a esta Política",
        paragraphs: [
          "Podemos actualizar esta Política de Privacidad periódicamente por razones operativas, legales o regulatorias. Le notificaremos cualquier cambio significativo por correo electrónico o mediante un aviso en la Plataforma antes de que entre en vigor. El uso continuado de los Servicios después de dichos cambios constituye su aceptación de la Política actualizada."
        ]
      },
      {
        id: "contact",
        number: "14",
        title: "14. Contáctenos",
        description: "Para consultas sobre esta Política o para ejercer sus derechos sobre sus datos, comuníquese con nosotros:"
      }
    ]
  },

  pt: {
    title: "Política de Privacidade",
    companyName: "Plataforma El7lm — Uma empresa da Mesk Holding",
    badge: "Centro de Privacidade e Segurança de Dados",
    lastUpdated: "10 de agosto de 2026",
    referenceNotice: "Em caso de conflito entre as versões linguísticas, prevalece a versão em árabe.",
    searchPlaceholder: "Pesquisar termos na política de privacidade...",
    clearSearchLabel: "Limpar",
    noResultsText: "Nenhuma secção corresponde à sua pesquisa.",
    viewAllSectionsLabel: "Ver Todas as Secções",
    tocTitle: "Índice da Política",
    sectionsCountLabel: "14 Secções",
    printButton: "Imprimir Política",
    deleteDataButton: "Eliminar Conta e Dados",
    haveQuestionLabel: "Tem dúvidas sobre os seus dados?",
    contactOfficerLabel: "Contactar Encarregado de Proteção de Dados",
    sectionPrefix: "Secção",
    copyEmailLabel: "Copiar E-mail",
    copyAddressLabel: "Copiar Endereço",
    copiedLabel: "Copiado!",
    directCallLabel: "Chamada Direta",
    pillarsTitle: "Pilares de Proteção de Dados na El7lm",
    pillarsSubtitle: "Priorizamos a privacidade e a segurança do seu talento desportivo segundo padrões internacionais.",
    pillars: [
      {
        title: "Proteção de Menores",
        desc: "Idade mínima de 10 anos. Dados de menores exigem Declaração de Consentimento Parental assinada eletronicamente.",
        badge: "Segurança Familiar"
      },
      {
        title: "Exibição Segura de Talento",
        desc: "Fotos e vídeos são exibidos exclusivamente para destacar o talento perante clubes e olheiros credenciados.",
        badge: "Mercado Verificado"
      },
      {
        title: "Pagamentos Seguros (PCI-DSS)",
        desc: "Processamento financeiro seguro sem armazenar números de cartão completos ou códigos CVV.",
        badge: "Segurança Financeira"
      },
      {
        title: "Direitos de Controlo Total",
        desc: "Pais e jogadores mantêm o direito de rever, alterar ou eliminar dados a qualquer momento.",
        badge: "Controlo Total"
      }
    ],
    contactInfo: {
      emailLabel: "E-mail",
      emailValue: "info@el7lm.com",
      addressLabel: "Endereço Oficial",
      addressValue: "Qatar Financial Centre, Torre 98, 9.º Andar, Doha, Estado do Qatar",
      phoneQatarLabel: "Telefone (Qatar)",
      phoneQatarValue: "+974 7054 2458",
      phoneEgyptLabel: "Telefone (Egito)",
      phoneEgyptValue: "+20 1017799580"
    },
    copyright: "© 2026 El7lm, uma empresa da Mesk Holding. Todos os direitos reservados.",
    sections: [
      {
        id: "intro",
        number: "1",
        title: "1. Introdução",
        paragraphs: [
          "A El7lm (\"El7lm\", \"a Plataforma\", \"nós\"), operada pela Mesk Holding, está comprometida em proteger a privacidade dos seus utilizadores. Esta Política explica quais dados pessoais recolhemos dos utilizadores da plataforma e da aplicação móvel El7lm (em conjunto, os \"Serviços\"), por que os recolhemos, como os usamos e protegemos, com quem os partilhamos e quais os direitos que tem sobre eles.",
          "Esta Política aplica-se a todos os utilizadores dos Serviços, incluindo jogadores e os seus pais/encarregados de educação, clubes, academias, agentes desportivos, treinadores e organizadores de torneios. Ao utilizar os Serviços ou criar uma conta, reconhece que leu, compreendeu e aceitou esta Política."
        ]
      },
      {
        id: "data-collected",
        number: "2",
        title: "2. Informação que recolhemos",
        subsections: [
          {
            title: "2.1 Informação de conta e identidade",
            items: [
              "Nome completo",
              "Endereço de e-mail e número de telefone",
              "Data de nascimento",
              "Nacionalidade e país de residência",
              "Tipo de conta (jogador, clube, academia, agente, treinador, organizador de torneio) e campos específicos de cada função",
              "Informação de verificação de identidade, quando aplicável (documentos oficiais quando solicitados)"
            ]
          },
          {
            title: "2.2 Informação desportiva e de desempenho",
            items: [
              "Posição em campo, competências, atributos físicos e estatísticas",
              "Afiliação atual e anterior a clubes/academias",
              "Avaliações e conquistas registadas por clubes, academias ou treinadores"
            ]
          },
          {
            title: "2.3 Fotos e vídeos",
            description: "Para destacar o talento do jogador junto de clubes e olheiros, a Plataforma permite o carregamento de fotografias de perfil e vídeos de futebol (lances de jogo, treinos, compilações). Este conteúdo é mostrado às partes descritas na Secção 6, com base no consentimento do jogador ou do pai/encarregado de educação descrito na Secção 3."
          },
          {
            title: "2.4 Informação de pagamento",
            description: "Ao subscrever um plano pago ou efetuar um pagamento, os seus dados financeiros são processados por um prestador de pagamentos terceiro, compatível com PCI-DSS. Não armazenamos o número completo do seu cartão nem o CVV nos nossos servidores. Retemos apenas:",
            items: [
              "Registos de transações (valor, data, tipo de subscrição, estado)",
              "Uma referência parcial/mascarada ao método de pagamento (por exemplo, os últimos 4 dígitos), quando fornecida pelo prestador"
            ]
          },
          {
            title: "2.5 Informação técnica",
            items: [
              "Endereço IP",
              "Tipo de navegador, dispositivo e sistema operativo",
              "Dados de utilização (páginas visualizadas, funcionalidades usadas, duração da sessão)",
              "Cookies e tecnologias semelhantes (ver Secção 11)",
              "Localização aproximada derivada do endereço IP (ao nível de país/cidade)"
            ]
          },
          {
            title: "2.6 Informação de terceiros",
            description: "Se iniciar sessão através de uma conta de terceiros (por exemplo, Google), recebemos a informação básica que esse prestador autoriza partilhar connosco (normalmente nome, e-mail e foto de perfil)."
          }
        ]
      },
      {
        id: "minors-consent",
        number: "3",
        title: "3. Menores, consentimento parental e consentimento para exibição de fotos e vídeos",
        callout: {
          type: "important",
          title: "Proteção de Jogadores Menores",
          text: "A idade mínima para se registar na Plataforma é de 10 anos. Para jogadores menores de idade (menos de 18 anos), a conta não é ativada nem os seus dados são exibidos até que o pai/encarregado de educação conclua uma Declaração de Consentimento Parental assinada eletronicamente."
        },
        bullets: [
          "Consente: que o seu filho/a se junte à Plataforma El7lm.",
          "Consente: que os dados desportivos e vídeos do seu filho/a sejam exibidos para destacar o seu talento junto de clubes e olheiros credenciados na Plataforma.",
          "Reconoce: que a Plataforma é um mercado digital moderno, e que qualquer seleção ou contrato profissional depende exclusivamente da avaliação e decisão dos clubes, sem qualquer obrigação financeira por parte da Plataforma em troca desta exibição técnica.",
          "Mantém: a responsabilidade por qualquer comunicação ou acordo que faça com os clubes, conservando o direito pleno de editar, ocultar ou eliminar os dados do seu filho/a da Plataforma a qualquer momento que considere adequado para proteger o seu interesse.",
          "Detalhes da declaração: regista o nome do jogador, o nome do pai/encarregado de educação, número de telefone, assinatura eletrónica e data.",
          "Direitos dos encarregados: O pai/encarregado de educação pode contactar-nos a qualquer momento para rever, corrigir, restringir ou solicitar a eliminação dos dados do seu filho/a.",
          "Eliminação sem consentimento: Se tomarmos conhecimento de que possuímos dados de um menor abaixo da idade mínima sem consentimento parental válido, iremos eliminá-los imediatamente."
        ]
      },
      {
        id: "how-we-use",
        number: "4",
        title: "4. Como utilizamos a sua informação",
        bullets: [
          "Criar, verificar e gerir a sua conta",
          "Operar a Plataforma e desenvolver as suas funcionalidades",
          "Exibir os dados do jogador a clubes, academias e olheiros conforme a Secção 6",
          "Associar jogadores a oportunidades relevantes, e vice-versa",
          "Processar pagamentos e gerir subscrições com segurança",
          "Comunicar consigo sobre a sua conta, transações e atualizações do serviço",
          "Enviar comunicações de marketing, quando tiver dado o seu consentimento explícito",
          "Analisar dados de utilização para melhorar o desempenho da Plataforma",
          "Detetar e prevenir fraude ou uso indevido da Plataforma",
          "Cumprir obrigações legais e regulatórias"
        ]
      },
      {
        id: "legal-basis",
        number: "5",
        title: "5. Base legal para o tratamento",
        bullets: [
          "Consentimento: como o consentimento parental descrito na Secção 3, ou o consentimento para marketing.",
          "Execução de um contrato: para prestar os Serviços subscritos, incluindo a exibição do perfil e o processamento de pagamentos.",
          "Interesses legítimos: para proteger a Plataforma, prevenir fraude e melhorar os nossos Serviços.",
          "Obrigação legal: quando exigido pela legislação aplicável."
        ]
      },
      {
        id: "data-sharing",
        number: "6",
        title: "6. Partilha de informação e visibilidade do perfil",
        description: "Não vendemos nem alugamos os seus dados pessoais. Partilhamos dados apenas nos seguintes casos:",
        bullets: [
          "Visibilidade do perfil na Plataforma: o perfil desportivo de um jogador (dados, fotos e vídeos) é visível para todas as outras contas registadas na Plataforma, sejam pagas ou gratuitas, incluindo olheiros de clubes, treinadores, academias e agentes/promotores desportivos, mediante o consentimento parental descrito na Secção 3.",
          "Códigos de convite e afiliação organizacional: clubes, academias, agentes e treinadores podem emitir códigos de convite para que jogadores se juntem à sua organização. Ao utilizar esse código, o perfil do jogador passa a ser exibido como afiliado a essa organização, para proteger os direitos tanto dos jogadores como das organizações afiliadas.",
          "Prestadores de serviços: trabalhamos com prestadores verificados para operar a Plataforma, nomeadamente: um prestador de processamento de pagamentos, um prestador de alojamento de dados em nuvem, um prestador de alojamento de fotos/vídeos e um prestador de mensagens para códigos de verificação e notificações. Cada um está contratualmente obrigado a usar os dados apenas para nos prestar o seu serviço, sob condições adequadas de segurança e confidencialidade.",
          "Requisitos legais: quando necessário para cumprir a lei, um processo legal ou um pedido oficial governamental.",
          "Proteção de direitos: para proteger os direitos da Plataforma, dos seus utilizadores ou do público.",
          "Transferências comerciais: em caso de fusão, aquisição ou venda de ativos, mantendo-se esta Política aplicável aos seus dados."
        ]
      },
      {
        id: "international-transfers",
        number: "7",
        title: "7. Transferências internacionais de dados",
        paragraphs: [
          "Atualmente prestamos serviço a utilizadores em Marrocos, Argélia, Egito, Arábia Saudita, EAU, Barém, Kuwait, Espanha e Portugal. Parte dos seus dados pode ser alojada por prestadores localizados fora do Qatar. Nesses casos, tomamos medidas razoáveis para garantir que os seus dados recebem um nível de proteção equivalente, incluindo trabalhar com prestadores detentores de certificações de segurança reconhecidas internacionalmente."
        ]
      },
      {
        id: "data-security",
        number: "8",
        title: "8. Segurança dos dados",
        bullets: [
          "Encriptação dos dados em trânsito (TLS) e em repouso (AES-256)",
          "Monitorização contínua 24 horas por dia para deteção de atividade invulgar",
          "Atualização contínua dos nossos protocolos de segurança",
          "Acesso aos dados restrito apenas a pessoal autorizado",
          "Cópias de segurança regulares",
          "Nota: Nenhum método de transmissão ou armazenamento eletrónico é 100% seguro; embora trabalhemos para proteger os seus dados, não podemos garantir segurança absoluta."
        ]
      },
      {
        id: "retention",
        number: "9",
        title: "9. Retenção de dados",
        bullets: [
          "Conta ativa: Retemos os seus dados enquanto a sua conta estiver ativa, ou conforme necessário para prestar os Serviços.",
          "Eliminação de conta: Após a eliminação da conta, o seu perfil, dados desportivos, fotos e vídeos são eliminados ou tornados anónimos no prazo de 90 dias.",
          "Registos financeiros: Retemos registos de transações financeiras durante 5 anos segundo a prática contabilística padrão para cumprir obrigações fiscais e contabilísticas.",
          "Retenção alargada: Poderei reter alguns dados por mais tempo quando necessário para resolver um litígio, fazer cumprir os nossos acordos ou cumprir a lei."
        ]
      },
      {
        id: "your-rights",
        number: "10",
        title: "10. Os seus direitos",
        bullets: [
          "Acesso: solicitar uma cópia dos dados pessoais que temos sobre si.",
          "Retificação: solicitar a correção de dados imprecisos.",
          "Eliminação: solicitar a eliminação dos seus dados, nos termos da Secção 9.",
          "Limitação: solicitar que restrinjamos determinados tratamentos dos seus dados.",
          "Portabilidade: receber os seus dados num formato estruturado e legível por máquina.",
          "Oposição: opor-se a determinados tratamentos, incluindo o marketing direto.",
          "Retirada do consentimento: retirar o seu consentimento a qualquer momento, sem afetar o tratamento anterior lícito."
        ],
        paragraphs: [
          "Para exercer estes direitos, contacte-nos através da Secção 14. Poderemos verificar a sua identidade previamente. Para jogadores menores, o pai/encarregado de educação exerce estes direitos em seu nome."
        ]
      },
      {
        id: "cookies",
        number: "11",
        title: "11. Cookies",
        subsections: [
          {
            title: "Categorias de Cookies",
            items: [
              "Cookies essenciais: necessários para o funcionamento da Plataforma; não podem ser desativados.",
              "Cookies de desempenho: ajudam-nos a compreender como a Plataforma é utilizada para podermos melhorá-la.",
              "Cookies de preferências: memorizam as suas definições e preferências.",
              "Cookies de marketing: usados para mostrar conteúdo mais relevante; só são ativados com o seu consentimento."
            ]
          }
        ],
        paragraphs: [
          "Na sua primeira visita, será apresentado um aviso de consentimento de cookies onde poderá aceitar ou gerir os cookies não essenciais."
        ]
      },
      {
        id: "governing-law",
        number: "12",
        title: "12. Lei aplicável e autoridade reguladora",
        paragraphs: [
          "Esta Política rege-se pelas leis de proteção de dados do Estado do Qatar, nomeadamente a Lei n.º 13 de 2016 relativa à Proteção da Privacidade de Dados Pessoais. Se residir noutro país, poderão aplicar-se-lhe direitos adicionais nos termos da legislação local. Pode apresentar uma reclamação junto da autoridade de proteção de dados competente no Qatar ou no seu país de residência."
        ]
      },
      {
        id: "changes",
        number: "13",
        title: "13. Alterações a esta Política",
        paragraphs: [
          "Podemos atualizar esta Política de Privacidade periodicamente por razões operacionais, legais ou regulatórias. Notificá-lo-emos de quaisquer alterações significativas por e-mail ou através de um aviso na Plataforma antes de entrarem em vigor. A utilização continuada dos Serviços após tais alterações constitui a sua aceitação da Política atualizada."
        ]
      },
      {
        id: "contact",
        number: "14",
        title: "14. Contacte-nos",
        description: "Para questões sobre esta Política ou para exercer os seus direitos sobre os seus dados, por favor contacte-nos:"
      }
    ]
  }
};
