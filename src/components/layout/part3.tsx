    if (accountType !== 'club' || !user?.uid) {
      return;
    }

    const clubRef = doc(db, 'clubs', user.uid);

    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            if (data.logo) {
              if (data.logo.startsWith('http')) {
                setClubLogo(data.logo);
              } else {
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  setClubLogo(null);
                }
              }
            } else {
              setClubLogo(null);
            }
          } else {
            setClubLogo(null);
          }
        } catch (error) {
          console.error('❌ ResponsiveSidebar: Error processing club logo:', error);
          setClubLogo(null);
        }
      },
      (error) => {
        console.error('❌ ResponsiveSidebar: Error listening to club logo updates:', error);
        setClubLogo(null);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('🔄 ResponsiveSidebar: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  const getUserAvatar = () => {
    // If club type and logo exists in Firestore, use it
    if (accountType === 'club' && clubLogo) {
      console.log('✅ ResponsiveSidebar: Using club logo from Firestore:', clubLogo);
      return clubLogo;
    }

    if (accountType === 'club') {
      console.log('⚠️ ResponsiveSidebar: Club account but no logo found, clubLogo:', clubLogo, 'falling back to getPlayerAvatarUrl');
    }

    // Use optimized function to find image in Supabase
    return getPlayerAvatarUrl(userData, user);
  };

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';

    // Search all potential fields for name based on account type
    switch (userData.accountType) {
      case 'player':
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'لاعب';
      case 'club':
        return userData.club_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'نادي رياضي';
      case 'academy':
        return userData.academy_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'أكاديمية رياضية';
      case 'agent':
        return userData.agent_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'وكيل رياضي';
      case 'trainer':
        return userData.trainer_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'مدرب';
      default:
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'مستخدم';
    }
  };

  const handleNavigation = (href: string, id: string) => {
    setActiveItem(id);
    router.push(href);
    if (isMobile) {
      closeSidebar();
    }
  };

  const [showLogoutScreen, setShowLogoutScreen] = useState(false);

  const handleLogout = async () => {
    const confirmed = window.confirm('هل أنت متأكد من تسجيل الخروج؟');
    if (confirmed) {
      try {
        await logout();
        setShowLogoutScreen(true);
        console.log('✅ Logout successful, displaying logout screen');
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Even if logout fails, show logout screen
        setShowLogoutScreen(true);
      }
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupId)) {
      newExpandedGroups.delete(groupId);
    } else {
      newExpandedGroups.add(groupId);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // Determine active item
  useEffect(() => {
    for (const group of menuGroups) {
      const currentItem = group.items.find(item => item.href === pathname);
      if (currentItem) {
        setActiveItem(currentItem.id);
        setExpandedGroups(prev => new Set([...prev, group.id]));
        break;
      }
    }
  }, [pathname]);

  // Don't show sidebar until component mounted on client
  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={isMobile ? { x: '100%' } : { width: isSidebarCollapsed ? 64 : 256 }}
        animate={isMobile ? { x: isSidebarOpen ? 0 : '100%' } : { width: isSidebarCollapsed ? (isTablet ? 56 : 64) : (isTablet ? 224 : 256) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-0 right-0 h-full bg-gradient-to-b ${accountInfo.color} z-50 shadow-xl backdrop-blur-xl border-l border-white/20 ${isMobile ? 'w-72' : sidebarWidth
          }`}
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-3 border-b border-white/20">
            <div className="flex gap-2 items-center">
              <div className={`p-1.5 rounded-lg ${accountInfo.bgColor}`}>
                <IconComponent className={`w-5 h-5 ${accountInfo.textColor}`} />
              </div>
              <AnimatePresence>
                {showText && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col"
                  >
                    <h2 className="text-base font-bold text-white">{accountInfo.title}</h2>
                    <p className="text-xs text-white/70">{accountInfo.subtitle}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 items-center">
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="text-white hover:bg-white/20"
                >
                  {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
              )}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSidebar}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-3 border-b border-white/20">
            <div className="flex gap-2 items-center">
              <Avatar className="w-10 h-10 ring-2 ring-white/30">
                <AvatarImage
                  key={getUserAvatar() || 'default'}
                  src={getUserAvatar() || undefined}
                  alt={getUserDisplayName()}
                  onError={(e) => {
                    console.error('❌ ResponsiveSidebar: Error loading avatar image:', getUserAvatar());
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('✅ ResponsiveSidebar: Avatar image loaded successfully:', getUserAvatar());
                  }}
                />
                <AvatarFallback className={`${accountInfo.bgColor} ${accountInfo.textColor} font-bold text-sm`}>
                  {getUserDisplayName().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence>
                {showText && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="text-sm font-semibold text-white truncate">{getUserDisplayName()}</h3>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex gap-1 items-center">
                        <Badge variant="secondary" className={`${accountInfo.bgColor} ${accountInfo.textColor} border-0 text-xs px-1.5 py-0.5`}>
                          {(!userData?.isEmployee && !userData?.employeeId && !userData?.roleId && !userData?.employeeRole && !userData?.role) ? '👑' : '👤'} {userData?.roleName || userData?.jobTitle || (userData?.roleId && DEFAULT_ROLES.find(r => r.id === userData.roleId)?.name) || userData?.role || accountInfo.subtitle}
                        </Badge>
                      </div>
                      {userData?.department && (
                        <div className="text-[10px] text-white/70 px-1 truncate max-w-[150px]">
                          {userData.department}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          <nav className="overflow-y-auto flex-1 py-3">
            <div className="px-3 space-y-1">
              {menuGroups.map((group, groupIndex) => {
                const isGroupExpanded = expandedGroups.has(group.id);
                const GroupIcon = group.icon;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                    className="space-y-1"
                  >
                    {/* Group Header */}
                    <Button
                      variant="ghost"
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full justify-between h-8 px-2 text-white hover:bg-white/20 ${group.id === 'main' ? 'font-semibold' : 'font-medium'
                        }`}
                    >
                      <div className="flex gap-2 items-center">
                        <GroupIcon className="w-3.5 h-3.5" />
                        <AnimatePresence>
                          {showText && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="text-xs"
                            >
                              {group.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {showText && (
                          <motion.div
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: isGroupExpanded ? 180 : 0 }}
                            exit={{ opacity: 0, rotate: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>

                    {/* Group Items */}
                    <AnimatePresence>
                      {isGroupExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pr-3 space-y-1">
                            {group.items.map((item, itemIndex) => {
                              const isActive = activeItem === item.id;
                              const IconComponent = item.icon;

                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: itemIndex * 0.05 }}
                                >
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleNavigation(item.href, item.id)}
                                    className={`w-full justify-start gap-2 h-8 px-2 transition-all duration-500 ease-out ${isActive
                                      ? 'text-gray-900 bg-white shadow-lg'
                                      : 'text-white hover:bg-white/20'
                                      }`}
                                  >
                                    <div className={`p-1 rounded-md transition-colors ${isActive ? item.bgColor : (item.isHighlighted ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-white/10')
                                      }`}>
                                      <IconComponent className={`w-3 h-3 ${isActive ? item.color : (item.isHighlighted ? 'text-yellow-300' : 'text-white')
                                        }`} />
                                    </div>

                                    <AnimatePresence>
                                      {showText && (
                                        <motion.span
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: -10 }}
                                          className={`text-xs font-medium ${isActive ? 'text-gray-900' : (item.isHighlighted ? 'text-yellow-300 font-bold' : 'text-white')
                                            }`}
                                        >
                                          {item.label}
                                        </motion.span>
                                      )}
                                    </AnimatePresence>

                                    {isActive && (
                                      <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute left-0 w-1 h-5 bg-white rounded-r-full"
                                      />
                                    )}
                                  </Button>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-white/20">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="gap-2 justify-start px-3 w-full h-10 text-white hover:bg-red-600/20 hover:text-red-200"
            >
              <div className="p-1.5 rounded-md bg-red-600/20">
                <LogOut className="w-3.5 h-3.5 text-red-200" />
              </div>

              <AnimatePresence>
                {showText && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium"
                  >
                    تسجيل الخروج
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* شاشة تسجيل الخروج */}
      {showLogoutScreen && <LogoutScreen />}
    </>
  );
};

// ===== Professional Header Component =====
const ResponsiveHeader: React.FC = () => {

  const { user, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar, isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  const [clubLogo, setClubLogo] = useState<string | null>(null);

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';
    switch (userData.accountType) {
      case 'player': return userData.full_name || userData.name || 'لاعب';
      case 'club': return userData.club_name || userData.name || 'نادي';
      case 'academy': return userData.academy_name || userData.name || 'أكاديمية';
      default: return userData.full_name || userData.name || user?.displayName || 'مستخدم';
    }
  };

  const getUserAvatar = () => {
    if (accountType === 'club' && clubLogo) return clubLogo;
    return getPlayerAvatarUrl(userData, user);
  };

  const resolvedAccountType = useMemo(() => {
    if (userData?.accountType) return userData.accountType;

    const pathSegments = pathname.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'dashboard') {
      const segment = pathSegments[2];
      // Check if it's one of the known types
      const knownTypes = ['player', 'admin', 'club', 'academy', 'trainer', 'agent', 'marketer', 'dream-academy'];
      if (knownTypes.includes(segment)) return segment;
    }
    return 'player';
  }, [userData?.accountType, pathname]);

  const accountType = resolvedAccountType;

  const getHeaderMargin = () => {
    if (!isClient) return ''; // Don't apply margin on server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  useEffect(() => {
    if (accountType !== 'club' || !user?.uid) {
      return;
    }

    const clubRef = doc(db, 'clubs', user.uid);

    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            if (data.logo) {
              if (data.logo.startsWith('http')) {
                setClubLogo(data.logo);
              } else {
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  setClubLogo(null);
                }
              }
            } else {
              setClubLogo(null);
            }
          } else {
            setClubLogo(null);
          }
        } catch (error) {
          console.error('❌ ResponsiveHeader: Error processing club logo:', error);
          setClubLogo(null);
        }
      },
      (error) => {
        console.error('❌ ResponsiveHeader: Error listening to club logo updates:', error);
        setClubLogo(null);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log('🔄 ResponsiveHeader: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  // Fetch notification data or other header requirements
  useEffect(() => {
    // Additional logic can be added here
  }, []);

  // Account theming information based on type
  const getAccountTheming = () => {
    switch (accountType) {
      case 'admin': return { label: 'منصة الإدارة', color: 'text-red-600', bg: 'bg-red-500/10' };
      case 'academy': return { label: 'منصة الأكاديمية', color: 'text-indigo-600', bg: 'bg-indigo-500/10' };
      case 'club': return { label: 'منصة النادي', color: 'text-emerald-600', bg: 'bg-emerald-500/10' };
      case 'trainer': return { label: 'منصة المدرب', color: 'text-pink-600', bg: 'bg-pink-500/10' };
      default: return { label: 'منصة اللاعب', color: 'text-blue-600', bg: 'bg-blue-500/10' };
    }
  };

  const theme = getAccountTheming();

  return (
    <header className={cn(
      "sticky top-0 z-40 transition-all duration-700 ease-in-out",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl",
      "border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm",
      getHeaderMargin()
    )}>
      <div className="flex relative justify-between items-center px-4 h-16 lg:px-10 max-w-[2200px] mx-auto">
        {/* Left Side: Navigation & Title */}
        <div className="flex gap-6 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="group relative h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-500 active:scale-90"
          >
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-2xl transition-all duration-500" />
            {isMobile ? (
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
            ) : (
              isSidebarCollapsed ?
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" /> :
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
            )}
          </Button>

          <div className="hidden sm:flex flex-col">
            <h1 className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {userData?.full_name?.split(' ')[0] || 'أهلاً بك'} 👋
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md", theme.bg, theme.color)}>
                {theme.label}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar (Premium Mockup) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="البحث عن لاعبين، أندية، أو عمليات..."
              className="w-full h-11 pr-11 pl-4 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500/30 rounded-2xl text-sm font-medium text-slate-900 dark:text-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex overflow-visible gap-4 items-center">
          <div className="flex items-center gap-2 pr-1">
            <UnifiedMessagesButton />
            <UnifiedNotificationsButton />
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-200/60 dark:bg-slate-800/60 mx-1"></div>

          <div className="flex items-center gap-3 pr-2 group cursor-pointer transition-all active:scale-95">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                {getUserDisplayName()}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest ring-1 ring-green-500/20 px-1.5 py-0.5 rounded-full bg-green-500/5">
                  نشط الآن
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.2rem] opacity-0 group-hover:opacity-20 blur-md transition-all duration-500" />
              <Avatar className="h-11 w-11 rounded-[1.1rem] border-2 border-white dark:border-slate-800 shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <AvatarImage
                  key={getUserAvatar() || 'default'}
                  src={getUserAvatar() || undefined}
                  alt={getUserDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm">
                  {getUserDisplayName().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ===== Professional Footer Component =====
const ResponsiveFooter: React.FC = () => {
  const { isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  // Determine footer margin to align with sidebar - compact sizes
  const getFooterMargin = () => {
    if (!isClient) return ''; // Don't apply margin on server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  return (
    <footer className={cn(
      "px-6 py-6 transition-all duration-700 ease-in-out",
      "bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60",
      getFooterMargin()
    )}>
      <div className="max-w-[2200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black text-xl">H</span>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">منصة الحلم 2024</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">جميع الحقوق محفوظة لشركة ميسك القطرية</p>
          </div>
        </div>

        <div className="flex gap-8 items-center">
          <div className="flex gap-6">
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الشروط</a>
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الخصوصية</a>
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الدعم</a>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Vers v1.0.0-PRO</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ===== Main Layout Component =====
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  accountType = 'player',
  showSidebar = true,
  showHeader = true,
  showFooter = true,
  noPadding = false
}) => {
  const { isSidebarOpen, isSidebarCollapsed, isMobile, isTablet, isDesktop, isClient } = useLayout();

  // Determine main content margin - compact sizes
  const getMainContentMargin = () => {
    if (!isClient) return '';
    if (!showSidebar) return '';
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  return (
    <div className={`flex flex-col min-h-screen ${noPadding ? 'bg-black h-screen overflow-hidden' : 'bg-gray-50'}`}>
      {/* Header */}
      {showHeader && <ResponsiveHeader />}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 h-full">
        {/* Sidebar */}
        {showSidebar && <ResponsiveSidebar accountType={accountType} />}

        {/* Content */}
        <main
          className={`overflow-auto flex-1 min-h-0 transition-all duration-300 ease-in-out ${getMainContentMargin()} rtl ${noPadding ? 'p-0 h-full flex flex-col overflow-hidden' : 'p-4 lg:p-6'}`}
        >
          <div className={`${noPadding ? 'h-full flex-1 flex flex-col' : 'h-full'}`}>
            <motion.div
              initial={noPadding ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`${noPadding ? 'h-full flex-1 flex flex-col' : 'h-full'}`}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Footer */}
      {showFooter && <ResponsiveFooter />}
    </div>
  );
};

// ===== Exported Main Layout Wrapper =====
interface ResponsiveLayoutWrapperProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
}

export const ResponsiveLayoutWrapper: React.FC<ResponsiveLayoutWrapperProps> = (props) => {
  return (
    <LayoutProvider>
      <ResponsiveLayout {...props} />
    </LayoutProvider>
  );
};

export default ResponsiveLayoutWrapper;
