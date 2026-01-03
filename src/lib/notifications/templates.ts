import { MessageTemplate } from '@/app/dashboard/admin/send-notifications/types';

export const messageTemplates: MessageTemplate[] = [
    // نماذج الدفع والاشتراكات
    {
        id: 'payment-confirmation',
        title: 'تأكيد دفع الإيصال',
        message: 'تم تأكيد دفع إيصال الاشتراك بنجاح! شكراً لك على ثقتك في منصة الحلم. اضغط هنا للتجديد.',
        type: 'success',
        priority: 'medium',
        category: 'دفع واشتراكات',
        description: 'تأكيد دفع إيصال الاشتراك'
    },
    {
        id: 'subscription-renewal',
        title: 'تجديد الاشتراك',
        message: 'حان موعد تجديد اشتراكك! احرص على التجديد للاستمرار في الاستمتاع بجميع المميزات. اضغط هنا للتجديد.',
        type: 'warning',
        priority: 'high',
        category: 'دفع واشتراكات',
        description: 'تذكير بتجديد الاشتراك'
    },
    {
        id: 'payment-failed',
        title: 'فشل في الدفع',
        message: 'عذراً، حدث خطأ في عملية الدفع. يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى. اضغط هنا للمحاولة.',
        type: 'error',
        priority: 'high',
        category: 'دفع واشتراكات',
        description: 'إشعار فشل الدفع'
    },

    // نماذج الملف الشخصي
    {
        id: 'profile-views',
        title: 'مشاهدات الملف الشخصي',
        message: '🎉 تم مشاهدة ملفك الشخصي من قبل مدربين وأندية! ملفك يلفت الانتباه. اضغط هنا لتحسين ملفك.',
        type: 'success',
        priority: 'medium',
        category: 'الملف الشخصي',
        description: 'إشعار مشاهدات الملف الشخصي'
    },
    {
        id: 'profile-ranking',
        title: 'الترتيب الحالي للملف',
        message: '📊 ترتيب ملفك الشخصي: {ranking} من أصل {total}. استمر في تطوير مهاراتك! اضغط هنا للتحسين.',
        type: 'info',
        priority: 'medium',
        category: 'الملف الشخصي',
        description: 'إشعار الترتيب الحالي'
    },
    {
        id: 'incomplete-profile',
        title: 'استكمال بيانات الملف الشخصي',
        message: '⚠️ ملفك الشخصي غير مكتمل! استكمل بياناتك للحصول على فرص أفضل. اضغط هنا للإكمال.',
        type: 'warning',
        priority: 'high',
        category: 'الملف الشخصي',
        description: 'تذكير باستكمال البيانات'
    },
    {
        id: 'profile-updated',
        title: 'تم تحديث الملف الشخصي',
        message: '✅ تم تحديث ملفك الشخصي بنجاح! البيانات الجديدة ستظهر للمدربين والأندية. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'low',
        category: 'الملف الشخصي',
        description: 'تأكيد تحديث الملف'
    },

    // نماذج الاختبارات
    {
        id: 'test-invitation',
        title: 'دعوة للاختبارات - منصة الحلم',
        message: '🏆 تم إرسال دعوة لك للمشاركة في اختبارات منصة الحلم! فرصة رائعة لإظهار مهاراتك. اضغط هنا للمشاركة.',
        type: 'success',
        priority: 'high',
        category: 'الاختبارات',
        description: 'دعوة للمشاركة في الاختبارات'
    },
    {
        id: 'test-reminder',
        title: 'تذكير بالاختبار',
        message: '⏰ تذكير: لديك اختبار غداً في الساعة {time}. تأكد من الاستعداد الجيد! اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'high',
        category: 'الاختبارات',
        description: 'تذكير بموعد الاختبار'
    },
    {
        id: 'test-results',
        title: 'نتائج الاختبار',
        message: '📋 نتائج اختبارك جاهزة! يمكنك الاطلاع عليها في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'info',
        priority: 'medium',
        category: 'الاختبارات',
        description: 'إشعار جاهزية النتائج'
    },

    // نماذج رسائل تشجيعية
    {
        id: 'motivational-1',
        title: 'رسالة تشجيعية',
        message: '💪 أنت تمتلك موهبة رائعة! استمر في التدريب والعمل الجاد، وستحقق أحلامك قريباً. اضغط هنا للتقدم.',
        type: 'success',
        priority: 'medium',
        category: 'رسائل تشجيعية',
        description: 'رسالة تحفيزية عامة'
    },
    {
        id: 'motivational-2',
        title: 'تطوير المهارات',
        message: '🌟 كل يوم تدريب هو خطوة نحو التميز! استمر في تطوير مهاراتك وستصبح لاعباً استثنائياً. اضغط هنا للتحسين.',
        type: 'success',
        priority: 'medium',
        category: 'رسائل تشجيعية',
        description: 'تشجيع على تطوير المهارات'
    },
    {
        id: 'motivational-3',
        title: 'النجاح قريب',
        message: '🎯 النجاح ليس بعيداً! استمر في العمل الجاد والتدريب المستمر، وستحقق أهدافك. اضغط هنا للأهداف.',
        type: 'success',
        priority: 'medium',
        category: 'رسائل تشجيعية',
        description: 'تشجيع على الاستمرار'
    },

    // نماذج الدعوة للأصدقاء
    {
        id: 'referral-program',
        title: 'احصل على عائد مالي - دعوة الأصدقاء',
        message: '💰 احصل على عائد مالي من خلال دعوة أصدقائك! لكل صديق تدعوه، تحصل على {amount} ريال. اضغط هنا للدعوة.',
        type: 'success',
        priority: 'medium',
        category: 'دعوة الأصدقاء',
        description: 'برنامج الدعوة والعائد المالي'
    },
    {
        id: 'referral-success',
        title: 'تم تسجيل صديقك بنجاح',
        message: '🎉 تم تسجيل صديقك بنجاح! سيتم إضافة {amount} ريال إلى رصيدك قريباً. اضغط هنا للرصيد.',
        type: 'success',
        priority: 'medium',
        category: 'دعوة الأصدقاء',
        description: 'تأكيد تسجيل صديق'
    },
    {
        id: 'referral-bonus',
        title: 'تم إضافة المكافأة',
        message: '💵 تم إضافة مكافأة دعوة الأصدقاء إلى رصيدك! استمر في دعوة المزيد من الأصدقاء. اضغط هنا للمزيد.',
        type: 'success',
        priority: 'medium',
        category: 'دعوة الأصدقاء',
        description: 'إشعار إضافة المكافأة'
    },

    // نماذج عامة
    {
        id: 'welcome-message',
        title: 'مرحباً بك في منصة الحلم',
        message: '🌟 مرحباً بك في منصة الحلم! نحن سعداء بانضمامك إلينا. نتمنى لك رحلة تدريبية ممتعة. اضغط هنا للاستكشاف.',
        type: 'success',
        priority: 'medium',
        category: 'رسائل عامة',
        description: 'رسالة ترحيب للمستخدمين الجدد'
    },
    {
        id: 'maintenance-notice',
        title: 'إشعار صيانة النظام',
        message: '🔧 سيتم إجراء صيانة للنظام يوم {date} من الساعة {start} إلى {end}. نعتذر عن الإزعاج. اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'high',
        category: 'رسائل عامة',
        description: 'إشعار صيانة النظام'
    },
    {
        id: 'new-feature',
        title: 'ميزة جديدة متاحة',
        message: '✨ ميزة جديدة متاحة الآن! {feature_name}. جربها الآن واستمتع بالتجربة المحسنة. اضغط هنا للتجربة.',
        type: 'info',
        priority: 'medium',
        category: 'رسائل عامة',
        description: 'إشعار ميزة جديدة'
    },
    {
        id: 'achievement-unlocked',
        title: 'إنجاز جديد!',
        message: '🏆 مبروك! لقد حققت إنجاز {achievement_name}! استمر في التقدم. اضغط هنا للإنجازات.',
        type: 'success',
        priority: 'medium',
        category: 'رسائل عامة',
        description: 'إشعار إنجاز جديد'
    },

    // نماذج التدريب والتطوير
    {
        id: 'training-schedule',
        title: 'جدول التدريب الأسبوعي',
        message: '📅 جدول تدريبك الأسبوعي جاهز! تحقق من المواعيد الجديدة وكن مستعداً للتدريب. اضغط هنا للجدول.',
        type: 'info',
        priority: 'medium',
        category: 'التدريب والتطوير',
        description: 'إشعار جدول التدريب'
    },
    {
        id: 'training-reminder',
        title: 'تذكير بموعد التدريب',
        message: '⏰ تذكير: لديك تدريب غداً في الساعة {time} مع المدرب {coach_name}. كن مستعداً! اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'high',
        category: 'التدريب والتطوير',
        description: 'تذكير بموعد التدريب'
    },
    {
        id: 'training-cancelled',
        title: 'إلغاء موعد التدريب',
        message: '❌ تم إلغاء موعد التدريب المقرر يوم {date}. سيتم إعادة جدولته قريباً. اضغط هنا للجدولة.',
        type: 'warning',
        priority: 'high',
        category: 'التدريب والتطوير',
        description: 'إشعار إلغاء التدريب'
    },
    {
        id: 'training-completed',
        title: 'تم إكمال التدريب',
        message: '✅ تم إكمال جلسة التدريب بنجاح! استمر في العمل الجاد لتطوير مهاراتك. اضغط هنا للتقدم.',
        type: 'success',
        priority: 'medium',
        category: 'التدريب والتطوير',
        description: 'تأكيد إكمال التدريب'
    },

    // نماذج المسابقات والبطولات
    {
        id: 'competition-invitation',
        title: 'دعوة للمسابقة',
        message: '🏆 تم إرسال دعوة لك للمشاركة في مسابقة {competition_name}! فرصة رائعة لإظهار مهاراتك. اضغط هنا للمشاركة.',
        type: 'success',
        priority: 'high',
        category: 'المسابقات والبطولات',
        description: 'دعوة للمشاركة في مسابقة'
    },
    {
        id: 'competition-reminder',
        title: 'تذكير بالمسابقة',
        message: '⏰ تذكير: المسابقة {competition_name} غداً! تأكد من الاستعداد الجيد. اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'high',
        category: 'المسابقات والبطولات',
        description: 'تذكير بموعد المسابقة'
    },
    {
        id: 'competition-results',
        title: 'نتائج المسابقة',
        message: '📊 نتائج مسابقة {competition_name} جاهزة! تحقق من ترتيبك في الموقع. اضغط هنا للنتائج.',
        type: 'info',
        priority: 'medium',
        category: 'المسابقات والبطولات',
        description: 'إشعار نتائج المسابقة'
    },

    // نماذج العروض والخصومات
    {
        id: 'special-offer',
        title: 'عرض خاص!',
        message: '🎉 عرض خاص! احصل على خصم {discount}% على جميع الاشتراكات لمدة محدودة فقط. اضغط هنا للاستفادة.',
        type: 'success',
        priority: 'high',
        category: 'العروض والخصومات',
        description: 'عرض خاص وخصومات'
    },
    {
        id: 'limited-offer',
        title: 'عرض محدود',
        message: '⏰ عرض محدود! احصل على {offer_description} بسعر مخفض. العرض ينتهي قريباً! اضغط هنا للاستفادة.',
        type: 'warning',
        priority: 'high',
        category: 'العروض والخصومات',
        description: 'عرض محدود الوقت'
    },
    {
        id: 'loyalty-reward',
        title: 'مكافأة الولاء',
        message: '💎 مكافأة خاصة للعملاء المخلصين! احصل على {reward_description} مجاناً. اضغط هنا للاستلام.',
        type: 'success',
        priority: 'medium',
        category: 'العروض والخصومات',
        description: 'مكافأة الولاء'
    },

    // نماذج الدعم والمساعدة
    {
        id: 'support-ticket',
        title: 'تم فتح تذكرة الدعم',
        message: '🎫 تم فتح تذكرة الدعم رقم #{ticket_number}. سنقوم بالرد عليك في أقرب وقت ممكن. اضغط هنا للمتابعة.',
        type: 'info',
        priority: 'medium',
        category: 'الدعم والمساعدة',
        description: 'تأكيد فتح تذكرة الدعم'
    },
    {
        id: 'support-response',
        title: 'رد على تذكرة الدعم',
        message: '📧 تم الرد على تذكرة الدعم رقم #{ticket_number}. تحقق من الرد الجديد. اضغط هنا للرد.',
        type: 'info',
        priority: 'medium',
        category: 'الدعم والمساعدة',
        description: 'إشعار رد الدعم'
    },
    {
        id: 'support-resolved',
        title: 'تم حل المشكلة',
        message: '✅ تم حل مشكلتك بنجاح! إذا كنت بحاجة لمزيد من المساعدة، لا تتردد في التواصل معنا. اضغط هنا للتواصل.',
        type: 'success',
        priority: 'medium',
        category: 'الدعم والمساعدة',
        description: 'تأكيد حل المشكلة'
    },

    // نماذج الأمان والحماية
    {
        id: 'login-alert',
        title: 'تنبيه تسجيل الدخول',
        message: '🔒 تم تسجيل الدخول إلى حسابك من جهاز جديد. إذا لم تكن أنت، يرجى تغيير كلمة المرور. اضغط هنا للتغيير.',
        type: 'warning',
        priority: 'high',
        category: 'الأمان والحماية',
        description: 'تنبيه تسجيل دخول جديد'
    },
    {
        id: 'password-changed',
        title: 'تم تغيير كلمة المرور',
        message: '🔐 تم تغيير كلمة المرور بنجاح! إذا لم تقم بهذا التغيير، يرجى التواصل مع الدعم. اضغط هنا للتواصل.',
        type: 'warning',
        priority: 'high',
        category: 'الأمان والحماية',
        description: 'إشعار تغيير كلمة المرور'
    },
    {
        id: 'account-verified',
        title: 'تم التحقق من الحساب',
        message: '✅ تم التحقق من حسابك بنجاح! يمكنك الآن الاستمتاع بجميع المميزات. اضغط هنا للاستكشاف.',
        type: 'success',
        priority: 'medium',
        category: 'الأمان والحماية',
        description: 'تأكيد التحقق من الحساب'
    },

    // نماذج خدمة العملاء والدعم
    {
        id: 'customer-support-contact',
        title: 'تواصل مع خدمة العملاء',
        message: '📞 نحن هنا لمساعدتك! للاستفسارات أو المساعدة، تواصل معنا على: 01000940321 (خدمة عملاء مصر). اضغط هنا للتواصل.',
        type: 'info',
        priority: 'medium',
        category: 'خدمة العملاء',
        description: 'معلومات التواصل مع خدمة العملاء'
    },
    {
        id: 'customer-support-hours',
        title: 'أوقات عمل خدمة العملاء',
        message: '⏰ خدمة العملاء متاحة من الأحد إلى الخميس من 9 صباحاً حتى 6 مساءً. للتواصل: 01000940321. اضغط هنا للتواصل.',
        type: 'info',
        priority: 'low',
        category: 'خدمة العملاء',
        description: 'إشعار بأوقات عمل خدمة العملاء'
    },
    {
        id: 'customer-support-urgent',
        title: 'دعم فوري - خدمة العملاء',
        message: '🚨 تحتاج مساعدة فورية؟ تواصل معنا الآن على 01000940321 (خدمة عملاء مصر). فريقنا جاهز لمساعدتك! اضغط هنا للتواصل.',
        type: 'warning',
        priority: 'high',
        category: 'خدمة العملاء',
        description: 'طلب دعم فوري'
    },

    // نماذج إشعارات الرفض والموافقة
    {
        id: 'media-approved',
        title: 'تم الموافقة على المحتوى',
        message: '✅ تمت الموافقة على محتواك! شكراً لمشاركتك. يمكنك الآن الاطلاع على المحتوى في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'medium',
        category: 'المحتوى والوسائط',
        description: 'إشعار الموافقة على المحتوى'
    },
    {
        id: 'media-rejected',
        title: 'تم رفض المحتوى',
        message: '❌ تم رفض محتواك. يرجى مراجعة الشروط والمحاولة مرة أخرى. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
        type: 'error',
        priority: 'high',
        category: 'المحتوى والوسائط',
        description: 'إشعار رفض المحتوى'
    },
    {
        id: 'media-pending',
        title: 'محتوى قيد المراجعة',
        message: '⏳ المحتوى الخاص بك قيد المراجعة. سنقوم بالرد عليك قريباً. للاستفسار: 01000940321. اضغط هنا للمتابعة.',
        type: 'info',
        priority: 'medium',
        category: 'المحتوى والوسائط',
        description: 'إشعار محتوى قيد المراجعة'
    },

    // نماذج التذكيرات والإشعارات المهمة
    {
        id: 'account-suspension-warning',
        title: 'تنبيه: حسابك معرض للإيقاف',
        message: '⚠️ حسابك معرض للإيقاف المؤقت بسبب عدم الالتزام بالشروط. يرجى مراجعة ملفك. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
        type: 'error',
        priority: 'critical',
        category: 'التذكيرات المهمة',
        description: 'تنبيه إيقاف الحساب'
    },
    {
        id: 'account-activated',
        title: 'تم تفعيل حسابك',
        message: '🎉 تم تفعيل حسابك بنجاح! يمكنك الآن استخدام جميع المميزات. للاستفسار: 01000940321. اضغط هنا للبدء.',
        type: 'success',
        priority: 'high',
        category: 'التذكيرات المهمة',
        description: 'إشعار تفعيل الحساب'
    },
    {
        id: 'account-deactivated',
        title: 'تم إيقاف حسابك مؤقتاً',
        message: '⛔ تم إيقاف حسابك مؤقتاً. للاستفسار عن السبب أو استعادة الحساب، تواصل معنا: 01000940321. اضغط هنا للتواصل.',
        type: 'error',
        priority: 'critical',
        category: 'التذكيرات المهمة',
        description: 'إشعار إيقاف الحساب'
    },

    // نماذج إشعارات الملفات والوثائق
    {
        id: 'document-uploaded',
        title: 'تم رفع الوثيقة',
        message: '📄 تم رفع وثيقتك بنجاح! جاري مراجعتها. سنقوم بإشعارك عند الانتهاء. للاستفسار: 01000940321. اضغط هنا للمتابعة.',
        type: 'success',
        priority: 'medium',
        category: 'الملفات والوثائق',
        description: 'تأكيد رفع الوثيقة'
    },
    {
        id: 'document-approved',
        title: 'تم اعتماد الوثيقة',
        message: '✅ تم اعتماد وثيقتك بنجاح! يمكنك الآن استخدامها في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'medium',
        category: 'الملفات والوثائق',
        description: 'إشعار اعتماد الوثيقة'
    },
    {
        id: 'document-rejected',
        title: 'تم رفض الوثيقة',
        message: '❌ تم رفض وثيقتك. يرجى التأكد من صحة البيانات وإعادة الرفع. للاستفسار: 01000940321. اضغط هنا للمراجعة.',
        type: 'error',
        priority: 'high',
        category: 'الملفات والوثائق',
        description: 'إشعار رفض الوثيقة'
    },

    // نماذج إشعارات الرسائل والتواصل
    {
        id: 'new-message',
        title: 'رسالة جديدة',
        message: '💬 لديك رسالة جديدة من {sender_name}. اضغط هنا للاطلاع على الرسالة والرد.',
        type: 'info',
        priority: 'medium',
        category: 'الرسائل والتواصل',
        description: 'إشعار رسالة جديدة'
    },
    {
        id: 'offer-received',
        title: 'عرض جديد',
        message: '🎁 تلقيت عرضاً جديداً! تحقق من التفاصيل في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'high',
        category: 'الرسائل والتواصل',
        description: 'إشعار عرض جديد'
    },
    {
        id: 'connection-request',
        title: 'طلب اتصال جديد',
        message: '🤝 تلقيت طلب اتصال من {sender_name}. اضغط هنا للموافقة أو الرفض.',
        type: 'info',
        priority: 'medium',
        category: 'الرسائل والتواصل',
        description: 'إشعار طلب اتصال'
    },

    // نماذج إشعارات التقييمات والمراجعات
    {
        id: 'rating-received',
        title: 'تقييم جديد',
        message: '⭐ تلقيت تقييماً جديداً! شكراً لك. يمكنك الاطلاع على التقييم في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'low',
        category: 'التقييمات والمراجعات',
        description: 'إشعار تقييم جديد'
    },
    {
        id: 'review-request',
        title: 'طلب تقييم',
        message: '📝 نحن نرغب في معرفة رأيك! ساعدنا في تحسين الخدمة من خلال تقييم تجربتك. اضغط هنا للتقييم.',
        type: 'info',
        priority: 'medium',
        category: 'التقييمات والمراجعات',
        description: 'طلب تقييم الخدمة'
    },

    // نماذج إشعارات الأحداث والمناسبات
    {
        id: 'event-invitation',
        title: 'دعوة لحضور حدث',
        message: '🎪 تم إرسال دعوة لك لحضور حدث {event_name}! فرصة رائعة للتعلم والاستمتاع. اضغط هنا للمشاركة.',
        type: 'success',
        priority: 'high',
        category: 'الأحداث والمناسبات',
        description: 'دعوة لحضور حدث'
    },
    {
        id: 'event-reminder',
        title: 'تذكير بالحدث',
        message: '📅 تذكير: حدث {event_name} غداً في الساعة {time}. لا تفوت الفرصة! اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'high',
        category: 'الأحداث والمناسبات',
        description: 'تذكير بموعد حدث'
    },
    {
        id: 'event-cancelled',
        title: 'تم إلغاء الحدث',
        message: '❌ تم إلغاء حدث {event_name}. نعتذر عن الإزعاج. سيتم إعادة جدولته قريباً. للاستفسار: 01000940321.',
        type: 'warning',
        priority: 'high',
        category: 'الأحداث والمناسبات',
        description: 'إشعار إلغاء حدث'
    },

    // نماذج إشعارات البرامج والخطط
    {
        id: 'program-enrolled',
        title: 'تم التسجيل في البرنامج',
        message: '🎓 تم تسجيلك في برنامج {program_name} بنجاح! نتمنى لك رحلة تعليمية ممتعة. اضغط هنا للبدء.',
        type: 'success',
        priority: 'high',
        category: 'البرامج والخطط',
        description: 'تأكيد التسجيل في برنامج'
    },
    {
        id: 'program-completed',
        title: 'تم إكمال البرنامج',
        message: '🏅 مبروك! لقد أكملت برنامج {program_name} بنجاح. يمكنك الآن الحصول على شهادة الإتمام. اضغط هنا للشهادة.',
        type: 'success',
        priority: 'high',
        category: 'البرامج والخطط',
        description: 'إشعار إكمال برنامج'
    },
    {
        id: 'program-reminder',
        title: 'تذكير بموعد البرنامج',
        message: '⏰ تذكير: لديك جلسة في برنامج {program_name} غداً. تأكد من الاستعداد! اضغط هنا للتفاصيل.',
        type: 'warning',
        priority: 'medium',
        category: 'البرامج والخطط',
        description: 'تذكير بموعد برنامج'
    },

    // نماذج إشعارات الشهادات والاعتمادات
    {
        id: 'certificate-ready',
        title: 'شهادة جاهزة',
        message: '📜 شهادتك جاهزة الآن! يمكنك تحميلها من ملفك الشخصي. للاستفسار: 01000940321. اضغط هنا للتحميل.',
        type: 'success',
        priority: 'medium',
        category: 'الشهادات والاعتمادات',
        description: 'إشعار جاهزية الشهادة'
    },
    {
        id: 'certificate-verified',
        title: 'تم التحقق من الشهادة',
        message: '✅ تم التحقق من شهادتك بنجاح! يمكنك الآن استخدامها في ملفك الشخصي. اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'medium',
        category: 'الشهادات والاعتمادات',
        description: 'تأكيد التحقق من الشهادة'
    },

    // نماذج إشعارات التحديثات والتطويرات
    {
        id: 'app-update',
        title: 'تحديث التطبيق متاح',
        message: '🔄 تحديث جديد للتطبيق متاح الآن! احصل على آخر المميزات والتحسينات. اضغط هنا للتحديث.',
        type: 'info',
        priority: 'medium',
        category: 'التحديثات والتطويرات',
        description: 'إشعار تحديث التطبيق'
    },
    {
        id: 'feature-update',
        title: 'تحديث ميزة',
        message: '✨ تم تحديث ميزة {feature_name}! جرب الميزات الجديدة الآن. اضغط هنا للاستكشاف.',
        type: 'info',
        priority: 'low',
        category: 'التحديثات والتطويرات',
        description: 'إشعار تحديث ميزة'
    },

    // نماذج إشعارات الطوارئ والمهام العاجلة
    {
        id: 'urgent-action-required',
        title: 'إجراء عاجل مطلوب',
        message: '🚨 يرجى تنفيذ إجراء عاجل: {action_description}. للاستفسار: 01000940321. اضغط هنا للتنفيذ.',
        type: 'error',
        priority: 'critical',
        category: 'الطوارئ والمهام العاجلة',
        description: 'طلب إجراء عاجل'
    },
    {
        id: 'deadline-approaching',
        title: 'اقتراب الموعد النهائي',
        message: '⏰ تنبيه: الموعد النهائي لـ {task_name} يقترب! يرجى الإكمال قبل انتهاء الوقت. اضغط هنا للإكمال.',
        type: 'warning',
        priority: 'high',
        category: 'الطوارئ والمهام العاجلة',
        description: 'تذكير بالموعد النهائي'
    },

    // نماذج إشعارات التهنئة والمناسبات
    {
        id: 'birthday-greeting',
        title: 'عيد ميلاد سعيد!',
        message: '🎂 عيد ميلاد سعيد! نتمنى لك عاماً مليئاً بالنجاح والفرح. استمر في السعي لتحقيق أحلامك!',
        type: 'success',
        priority: 'low',
        category: 'التهنئة والمناسبات',
        description: 'تهنئة بعيد الميلاد'
    },
    {
        id: 'achievement-congratulations',
        title: 'تهنئة بالإنجاز',
        message: '🎉 مبروك على إنجازك الرائع! استمر في التقدم والنجاح. نحن فخورون بك!',
        type: 'success',
        priority: 'medium',
        category: 'التهنئة والمناسبات',
        description: 'تهنئة بالإنجاز'
    },

    // نماذج إشعارات الاستطلاعات والاستبيانات
    {
        id: 'survey-request',
        title: 'طلب المشاركة في استطلاع',
        message: '📊 نحن نرغب في معرفة رأيك! شاركنا في استطلاع قصير لمساعدتنا في تحسين الخدمة. اضغط هنا للمشاركة.',
        type: 'info',
        priority: 'low',
        category: 'الاستطلاعات والاستبيانات',
        description: 'طلب المشاركة في استطلاع'
    },
    {
        id: 'survey-thanks',
        title: 'شكراً لمشاركتك',
        message: '🙏 شكراً لمشاركتك في الاستطلاع! رأيك مهم جداً لنا. للاستفسار: 01000940321.',
        type: 'success',
        priority: 'low',
        category: 'الاستطلاعات والاستبيانات',
        description: 'شكر على المشاركة'
    },

    // نماذج إشعارات الإعلانات والتسويق
    {
        id: 'new-partner',
        title: 'شريك جديد',
        message: '🤝 مرحباً بك كشريك جديد في منصة الحلم! نتمنى لك تجربة رائعة. للاستفسار: 01000940321. اضغط هنا للبدء.',
        type: 'success',
        priority: 'medium',
        category: 'الإعلانات والتسويق',
        description: 'ترحيب بشريك جديد'
    },
    {
        id: 'partnership-benefits',
        title: 'مميزات الشراكة',
        message: '💼 استمتع بمميزات الشراكة الحصرية! احصل على خصومات وعروض خاصة. للاستفسار: 01000940321. اضغط هنا للمميزات.',
        type: 'info',
        priority: 'medium',
        category: 'الإعلانات والتسويق',
        description: 'إشعار مميزات الشراكة'
    },

    // نماذج إشعارات التقييمات والتحسينات
    {
        id: 'profile-featured',
        title: 'ملفك مميز الآن',
        message: '⭐ تم تمييز ملفك الشخصي! ملفك يظهر في الصفحة الرئيسية. استمر في التميز! اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'high',
        category: 'التقييمات والتحسينات',
        description: 'إشعار تمييز الملف'
    },
    {
        id: 'rank-improved',
        title: 'تحسن ترتيبك',
        message: '📈 مبروك! تحسن ترتيبك في المنصة. استمر في التقدم لتحقيق المزيد من النجاح! اضغط هنا للمراجعة.',
        type: 'success',
        priority: 'medium',
        category: 'التقييمات والتحسينات',
        description: 'إشعار تحسن الترتيب'
    },
    {
        id: 'top-ten-ranking',
        title: 'أنت من العشرة الأوائل!',
        message: '🏆 حسابك الآن في ترتيب رقم {ranking} - أنت من العشرة الأوائل! يمكن للأندية والأكاديميات العالمية مشاهدتك الآن. اضغط هنا.',
        type: 'success',
        priority: 'high',
        category: 'الملف الشخصي',
        description: 'إشعار ترتيب من العشرة الأوائل'
    }
];
