
    if (!requirement) {
      if (accountType === 'admin') {
        return false;
      }
      return true;
    }

    const hasAccess = can(requirement.action, requirement.resource);
    return hasAccess;
  };

  // Filter group items based on permissions
  const filterGroupItems = (items: any[], can: any): any[] => {
    return items.filter(item => {
      // If item has a permission requirement defined in the config object itself (for the new config system)
      if (item.permission) {
        return can(item.permission.action, item.permission.resource);
      }
      // Fallback to the old mapping system (for legacy/other account types)
      return hasPermissionForMenuItem(item.id, can);
    });
  };

  const getMenuGroups = () => {
    // If Admin, use the new centralized configuration
    if (accountType === 'admin') {
      const adminGroups = ADMIN_DASHBOARD_MENU.map(group => ({
        ...group,
        items: filterGroupItems(group.items, can)
      })).filter(group => group.items.length > 0);

      return adminGroups;
    }

    // --- Base Group for All ---
    const baseGroup = {
      id: 'main',
      title: 'القائمة الرئيسية',
      icon: Home,
      items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: Home, href: `/dashboard/${accountType}`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
        { id: 'profile', label: 'الملف الشخصي', icon: User, href: `/dashboard/${accountType}/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
        { id: 'messages', label: 'الرسائل', icon: MessageSquare, href: `/dashboard/${accountType}/messages`, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
        { id: 'notifications', label: 'الإشعارات', icon: Bell, href: `/dashboard/${accountType}/notifications`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      ]
    };

    // --- Account Specific Groups ---
    const accountGroups: Record<string, any[]> = {
      player: [
        {
          id: 'content',
          title: 'المحتوى والفيديوهات',
          icon: Video,
          items: [
            { id: 'videos', label: 'فيديوهاتي', icon: Video, href: `/dashboard/player/videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
            { id: 'upload-video', label: 'رفع فيديو', icon: Video, href: `/dashboard/player/videos/upload`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Play, href: `/dashboard/player/player-videos`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'discovery',
          title: 'الاكتشاف والبحث',
          icon: Search,
          items: [
            { id: 'search', label: 'البحث عن فرص', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'academy', label: 'أكاديمية الحلم', icon: GraduationCap, href: `/dashboard/player/academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        {
          id: 'reports',
          title: 'الإدارة والتقارير',
          icon: FileText,
          items: [
            { id: 'reports', label: 'تقاريري', icon: FileText, href: `/dashboard/player/reports`, color: 'text-orange-600', bgColor: 'bg-orange-50' },
            { id: 'stats', label: 'إحصائياتي', icon: BarChart3, href: `/dashboard/player/stats`, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
          ]
        },
        {
          id: 'payments',
          title: 'الاشتراكات والمدفوعات',
          icon: CreditCard,
          items: [
            { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCard, href: `/dashboard/player/bulk-payment`, color: 'text-violet-600', bgColor: 'bg-violet-50' },
            { id: 'subscription-status', label: 'حالة الاشتراك', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'store', label: 'المتجر', icon: DollarSign, href: `/dashboard/player/store`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
             { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/player/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
          ]
        },
        {
          id: 'rewards',
          title: 'المكافآت والإحالات',
          icon: UserPlus,
          items: [
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/player/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        }
      ],
      club: [
        {
          id: 'players',
          title: 'إدارة اللاعبين',
          icon: Users,
          items: [
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Search, href: `/dashboard/club/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'players', label: 'قائمة اللاعبين', icon: Users, href: `/dashboard/club/players`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'content',
          title: 'المحتوى والفيديوهات',
          icon: Video,
          items: [
            { id: 'videos', label: 'مكتبة الفيديوهات', icon: Video, href: `/dashboard/club/videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
            { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Play, href: `/dashboard/club/player-videos`, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
          ]
        },
        {
          id: 'management',
          title: 'الإدارة والتقارير',
          icon: BarChart3,
          items: [
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3, href: `/dashboard/club/stats`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'finances', label: 'المالية', icon: DollarSign, href: `/dashboard/club/finances`, color: 'text-green-600', bgColor: 'bg-green-50' },
             { id: 'billing', label: 'الفواتير', icon: FileText, href: `/dashboard/club/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
             { id: 'subscription-status', label: 'حالة الاشتراك', icon: TrendingUp, href: '/dashboard/club/subscription-status', color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'rewards',
          title: 'المكافآت والإحالات',
          icon: UserPlus,
          items: [
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/club/referrals`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
          ]
        }
      ],
      academy: [
        {
          id: 'students',
          title: 'إدارة الطلاب',
          icon: Users,
          items: [
            { id: 'students', label: 'الطلاب', icon: Users, href: `/dashboard/academy/students`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
            { id: 'trainers', label: 'المدربين', icon: Users, href: `/dashboard/academy/trainers`, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
          ]
        },
        {
          id: 'content',
          title: 'المحتوى والدورات',
          icon: FileText,
          items: [
            { id: 'courses', label: 'الدورات', icon: FileText, href: `/dashboard/academy/courses`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'videos', label: 'الفيديوهات', icon: Video, href: `/dashboard/academy/videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
          ]
        },
        {
          id: 'management',
          title: 'الإدارة والتقارير',
          icon: BarChart3,
          items: [
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3, href: `/dashboard/academy/stats`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'finances', label: 'المالية', icon: DollarSign, href: `/dashboard/academy/finances`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'billing', label: 'الفواتير', icon: FileText, href: `/dashboard/academy/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'subscription-status', label: 'حالة الاشتراك', icon: TrendingUp, href: '/dashboard/academy/subscription-status', color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'rewards',
          title: 'المكافآت والإحالات',
          icon: UserPlus,
          items: [
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/academy/referrals`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
          ]
        }
      ],
      trainer: [
        {
          id: 'sessions',
          title: 'الجلسات واللاعبين',
          icon: Clock,
          items: [
            { id: 'sessions', label: 'الجلسات', icon: Clock, href: `/dashboard/trainer/sessions`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'players', label: 'اللاعبين', icon: Users, href: `/dashboard/trainer/players`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'content',
          title: 'المحتوى والبرامج',
          icon: FileText,
          items: [
            { id: 'videos', label: 'الفيديوهات', icon: Video, href: `/dashboard/trainer/videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
            { id: 'programs', label: 'البرامج', icon: FileText, href: `/dashboard/trainer/programs`, color: 'text-orange-600', bgColor: 'bg-orange-50' },
          ]
        },
        {
          id: 'management',
          title: 'الإدارة والتقارير',
          icon: BarChart3,
          items: [
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3, href: `/dashboard/trainer/stats`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'billing', label: 'الفواتير', icon: FileText, href: `/dashboard/trainer/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'subscription-status', label: 'حالة الاشتراك', icon: TrendingUp, href: '/dashboard/trainer/subscription-status', color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'rewards',
          title: 'المكافآت والإحالات',
          icon: UserPlus,
          items: [
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/trainer/referrals`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
          ]
        }
      ],
      agent: [
        {
          id: 'clients',
          title: 'إدارة العملاء',
          icon: Users,
          items: [
            { id: 'players', label: 'اللاعبين', icon: Users, href: `/dashboard/agent/players`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
            { id: 'clubs', label: 'الأندية', icon: Users, href: `/dashboard/agent/clubs`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          ]
        },
        {
          id: 'business',
          title: 'الأعمال والعقود',
          icon: FileText,
          items: [
            { id: 'negotiations', label: 'المفاوضات', icon: MessageSquare, href: `/dashboard/agent/negotiations`, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
            { id: 'contracts', label: 'العقود', icon: FileText, href: `/dashboard/agent/contracts`, color: 'text-orange-600', bgColor: 'bg-orange-50' },
          ]
        },
        {
          id: 'finances',
          title: 'المالية والعمولات',
          icon: DollarSign,
          items: [
            { id: 'commissions', label: 'العمولات', icon: DollarSign, href: `/dashboard/agent/commissions`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3, href: `/dashboard/agent/stats`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'billing', label: 'الفواتير', icon: FileText, href: `/dashboard/agent/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'subscription-status', label: 'حالة الاشتراك', icon: TrendingUp, href: '/dashboard/agent/subscription-status', color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'rewards',
          title: 'المكافآت والإحالات',
          icon: UserPlus,
          items: [
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/agent/referrals`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
          ]
        }
      ],
    };

    const specificGroups = accountGroups[accountType] || [];
    
    // Combine base group with account specific groups
    const finalGroups = [
      { ...baseGroup, items: filterGroupItems(baseGroup.items, can) },
      ...specificGroups.map(group => ({ ...group, items: filterGroupItems(group.items, can) }))
    ].filter(group => group.items.length > 0);

    return finalGroups;
  };

  const menuGroups = useMemo(() => getMenuGroups(), [accountType, userData, can]);

  const showText = useMemo(() => shouldShowText(), [isMobile, isTablet, isSidebarCollapsed]);
  const sidebarWidth = useMemo(() => getSidebarWidth(), [isMobile, isTablet, isSidebarCollapsed]);

  useEffect(() => {
