'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Home,
  User,
  MessageSquare,
  Users,
  Search,
  Video,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  BarChart3,
  CreditCard,
  Clock,
  Play,
  BookOpen,
  ShoppingCart,
  Upload
} from 'lucide-react';
import { getPlayerAvatarUrl } from '@/lib/supabase/image-utils';

// دالة ترجمة مبسطة - تُرجع النص المترجم من مفتاح الترجمة
const translations: Record<string, string> = {
  'sidebar.player.home': 'الرئيسية',
  'sidebar.player.profile': 'الملف الشخصي',
  'sidebar.player.reports': 'التقارير',
  'sidebar.player.referrals': 'الإحالات',
  'sidebar.player.store': 'المتجر',
  'sidebar.player.academy': 'الأكاديمية',
  'sidebar.player.videos': 'الفيديوهات',
  'sidebar.player.uploadVideos': 'رفع فيديو',
  'sidebar.player.playerVideos': 'فيديوهات اللاعبين',
  'sidebar.player.search': 'البحث',
  'sidebar.player.stats': 'الإحصائيات',
  'sidebar.common.messages': 'الرسائل',
  'sidebar.player.subscriptions': 'الاشتراكات',
  'sidebar.player.subscriptionStatus': 'حالة الاشتراك',
  'sidebar.player.notifications': 'الإشعارات'
};

const t = (key: string): string => translations[key] || key;

interface PlayerModernSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const PlayerModernSidebar: React.FC<PlayerModernSidebarProps> = ({
  collapsed,
  setCollapsed
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, logout } = useAuth();

  const [activeItem, setActiveItem] = useState('');

  // إضافة console.log للتأكد من عمل القائمة الجانبية
  useEffect(() => {
    console.log('🎯 PlayerModernSidebar component mounted');
    console.log('🎯 Current pathname:', pathname);
    console.log('🎯 User data:', userData);
    console.log('🎯 Collapsed state:', collapsed);
  }, [pathname, userData, collapsed]);

  // تحديث العنصر النشط بناءً على المسار الحالي
  useEffect(() => {
    const currentPath = pathname.split('/').pop() || 'dashboard';
    setActiveItem(currentPath);
    console.log('🎯 Active item set to:', currentPath);
  }, [pathname]);

  // الحصول على معلومات المستخدم
  const getUserDisplayName = () => {
    if (!userData) return 'لاعب';

    // إضافة console.log للتأكد من البيانات
    console.log('🎯 getUserDisplayName - userData:', userData);

    // البحث في جميع الحقول المحتملة للاسم
    let displayName = '';

    if (userData) {
      displayName = userData.full_name ||
        (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
        userData.name ||
        userData.displayName ||
        '';
    }

    // إذا لم نجد اسم في userData، جرب user object
    if (!displayName && user) {
      displayName = user.displayName || '';
    }

    // إذا لم نجد اسم، استخدم اسم افتراضي
    if (!displayName) {
      displayName = 'لاعب';
    }

    console.log('🎯 getUserDisplayName - displayName:', displayName);
    return displayName;
  };

  const getUserAvatar = () => {
    // استخدام الدالة الجديدة للحصول على الصورة من Supabase
    return getPlayerAvatarUrl(userData, user);
  };

  // قائمة العناصر الرئيسية
  const mainMenuItems = [
    {
      id: 'dashboard',
      title: 'sidebar.player.home',
      href: '/dashboard/player',
      icon: Home,
      badge: null
    },
    {
      id: 'profile',
      title: 'sidebar.player.profile',
      href: '/dashboard/player/profile',
      icon: User,
      badge: null
    },
    {
      id: 'reports',
      title: 'sidebar.player.reports',
      href: '/dashboard/player/reports',
      icon: FileText,
      badge: null
    }
  ];

  // قائمة الإحالات والجوائز
  const referralsMenuItems = [
    {
      id: 'referrals',
      title: 'sidebar.player.referrals',
      href: '/dashboard/player/referrals',
      icon: Users,
      badge: 'جديد'
    },
    {
      id: 'store',
      title: 'sidebar.player.store',
      href: '/dashboard/player/store',
      icon: ShoppingCart,
      badge: null
    },
    {
      id: 'academy',
      title: 'sidebar.player.academy',
      href: '/dashboard/player/academy',
      icon: BookOpen,
      badge: 'مميز'
    }
  ];

  // قائمة الفيديوهات
  const videosMenuItems = [
    {
      id: 'videos',
      title: 'sidebar.player.videos',
      href: '/dashboard/player/videos',
      icon: Video,
      badge: null
    },
    {
      id: 'upload-videos',
      title: 'sidebar.player.uploadVideos',
      href: '/dashboard/player/videos/upload',
      icon: Upload,
      badge: '+10 نقاط'
    },
    {
      id: 'player-videos',
      title: 'sidebar.player.playerVideos',
      href: '/dashboard/player/player-videos',
      icon: Play,
      badge: null
    }
  ];

  // قائمة البحث والفرص
  const searchMenuItems = [
    {
      id: 'search',
      title: 'sidebar.player.search',
      href: '/dashboard/player/search',
      icon: Search,
      badge: null
    },
    {
      id: 'stats',
      title: 'sidebar.player.stats',
      href: '/dashboard/player/stats',
      icon: BarChart3,
      badge: null
    }
  ];

  // قائمة التواصل والاشتراكات
  const communicationMenuItems = [
    {
      id: 'messages',
      title: 'sidebar.common.messages',
      href: '/dashboard/messages',
      icon: MessageSquare,
      badge: null
    },
    {
      id: 'subscriptions',
      title: 'sidebar.player.subscriptions',
      href: '/dashboard/player/bulk-payment',
      icon: CreditCard,
      badge: null
    },
    {
      id: 'subscription-status',
      title: 'sidebar.player.subscriptionStatus',
      href: '/dashboard/subscription',
      icon: CreditCard,
      badge: null
    }
  ];

  // دالة التنقل
  const handleNavigation = (href: string, id: string) => {
    try {
      console.log('🎯 Navigating to:', href);
      setActiveItem(id);

      // إضافة تأخير صغير لتجنب مشاكل التوجيه
      setTimeout(() => {
        router.push(href);
      }, 100);
    } catch (error) {
      console.error('خطأ في التوجيه:', error);
      // استخدام window.location كبديل
      window.location.href = href;
    }
  };

  // دالة تسجيل الخروج
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  console.log('🎯 Rendering PlayerModernSidebar with collapsed:', collapsed);

  return (
    <motion.div
      initial={false}
      animate={{
        width: collapsed ? 80 : 280,
        x: collapsed ? 0 : 0
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-16 right-0 bottom-24 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-white shadow-2xl z-[60]"
      style={{ direction: 'rtl' }}
    >
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-500">
          <div className="flex items-center space-x-3 space-x-reverse">
            <Avatar className="w-12 h-12 ring-2 ring-white/50 shadow-lg">
              <AvatarImage
                src={getUserAvatar()}
                alt={getUserDisplayName()}
                onError={(e) => {
                  console.log('❌ Error loading avatar image in sidebar:', e);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('✅ Avatar image loaded successfully in sidebar');
                }}
              />
              <AvatarFallback className="bg-blue-500 text-white font-bold">
                {getUserDisplayName().slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{getUserDisplayName()}</h3>
                <p className="text-xs text-blue-200 truncate">لاعب</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white hover:bg-blue-600"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 pb-6">
          <div className="space-y-6">

            {/* القائمة الرئيسية */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    الرئيسية
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                {mainMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleNavigation(item.href, item.id)}
                        className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                          }`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-right font-medium">
                              {t(item.title)}
                            </span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* الإحالات والجوائز */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    الإحالات والجوائز
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                {referralsMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleNavigation(item.href, item.id)}
                        className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                          }`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-right font-medium">
                              {t(item.title)}
                            </span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* الفيديوهات */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    الفيديوهات
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                {videosMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleNavigation(item.href, item.id)}
                        className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                          }`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-right font-medium">
                              {t(item.title)}
                            </span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* البحث والفرص */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    البحث والفرص
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                {searchMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleNavigation(item.href, item.id)}
                        className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                          }`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-right font-medium">
                              {t(item.title)}
                            </span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* التواصل والاشتراكات */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    التواصل والاشتراكات
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                {communicationMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        onClick={() => handleNavigation(item.href, item.id)}
                        className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-white text-blue-600 shadow-lg'
                            : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                          }`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-right font-medium">
                              {t(item.title)}
                            </span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* الإشعارات */}
            <div>
              <div className="px-4 mb-2">
                {!collapsed && (
                  <h4 className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    الإشعارات
                  </h4>
                )}
              </div>
              <div className="space-y-1">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={() => handleNavigation('/dashboard/player/notifications', 'notifications')}
                    className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 group ${activeItem === 'notifications'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-white hover:bg-blue-600 hover:bg-opacity-20'
                      }`}
                  >
                    <Bell className={`w-5 h-5 ${activeItem === 'notifications' ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'
                      }`} />
                    {!collapsed && (
                      <span className="flex-1 text-right font-medium">
                        {t('sidebar.player.notifications')}
                      </span>
                    )}
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-500">
          <div className="space-y-2">
            {/* إعدادات سريعة */}
            {!collapsed && (
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard/player/settings')}
                  className="flex-1 text-white hover:bg-blue-600"
                >
                  <Settings className="w-4 h-4 ml-2" />
                  الإعدادات
                </Button>
              </div>
            )}

            {/* تسجيل الخروج */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-white hover:bg-red-600 hover:bg-opacity-20"
            >
              <LogOut className="w-4 h-4 ml-2" />
              {!collapsed && 'تسجيل الخروج'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerModernSidebar; 
