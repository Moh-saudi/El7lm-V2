'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Settings,
  FolderOpen,
  BarChart3,
  Plus,
  Users,
  BookOpen,
  Megaphone,
  Sparkles,
  ChevronRight,
  TrendingUp,
  PlayCircle,
  Library
} from 'lucide-react';
import Link from 'next/link';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/config';

export default function AdminDreamAcademyPage() {
  const [counts, setCounts] = useState({ videos: 0, categories: 0, views: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: videoCount }, { count: catCount }] = await Promise.all([
          supabase.from('dream_academy_sources').select('*', { count: 'exact', head: true }),
          supabase.from('dream_academy_categories').select('*', { count: 'exact', head: true })
        ]);

        setCounts({
          videos: videoCount || 0,
          categories: catCount || 0,
          views: 0 // Placeholder for now
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const adminSections = [
    {
      title: "إدارة الفيديوهات",
      description: "إضافة وتحرير وحذف فيديوهات الأكاديمية والمكتبة الرقمية",
      icon: Video,
      href: "/dashboard/admin/dream-academy/videos",
      color: "from-blue-500 to-indigo-600",
      lightColor: "bg-blue-50",
      badge: "المحتوى"
    },
    {
      title: "إدارة الفئات",
      description: "تنظيم وتصنيف محتوى الأكاديمية لتسهيل الوصول إليها",
      icon: FolderOpen,
      href: "/dashboard/admin/dream-academy/categories",
      color: "from-emerald-500 to-teal-600",
      lightColor: "bg-emerald-50",
      badge: "التصنيف"
    },
    {
      title: "إدارة الإعلانات",
      description: "التحكم في المساحات الإعلانية داخل الأكاديمية",
      icon: Megaphone,
      href: "/dashboard/admin/ads",
      color: "from-orange-500 to-amber-600",
      lightColor: "bg-orange-50",
      badge: "الإعلانات"
    },
    {
      title: "إعدادات الأكاديمية",
      description: "تخصيص تجربة المستخدم وإعدادات العرض العامة",
      icon: Settings,
      href: "/dashboard/admin/dream-academy/settings",
      color: "from-purple-500 to-violet-600",
      lightColor: "bg-purple-50",
      badge: "النظام"
    }
  ];

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 sm:p-10" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 sm:p-12 text-white shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 text-sm font-bold">
                  <Sparkles className="w-4 h-4" />
                  مركز التحكم في المحتوى
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight">إدارة أكاديمية الحلم</h1>
                <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
                  منصة شاملة لإدارة فيديوهات التدريب، الفئات التعليمية، والتفاعل مع اللاعبين عبر المحتوى الرقمي المتميز.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/admin/dream-academy/videos">
                  <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 font-bold gap-2">
                    <Plus className="w-5 h-5" />
                    إضافة فيديو جديد
                  </Button>
                </Link>
                <Link href="/dashboard/admin">
                  <Button variant="outline" className="h-14 px-8 bg-white/5 border-white/20 hover:bg-white/10 text-white rounded-2xl backdrop-blur-sm transition-all font-bold">
                    لوحة التحكم الرئيسية
                  </Button>
                </Link>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[100px] -mr-48 -mt-48 rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 blur-[80px] -ml-32 -mb-32 rounded-full" />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي الفيديوهات', value: counts.videos, icon: Video, color: 'text-blue-600', trend: '+12%' },
              { label: 'الفئات التعليمية', value: counts.categories, icon: FolderOpen, color: 'text-emerald-600', trend: 'نشط' },
              { label: 'إجمالي المشاهدات', value: '---', icon: BarChart3, color: 'text-purple-600', trend: 'قريباً' },
              { label: 'الطلاب النشطين', value: '450+', icon: Users, color: 'text-orange-600', trend: '+5%' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-[2rem] ring-1 ring-slate-100">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                        <span className="text-[10px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-50 rounded-md">{stat.trend}</span>
                      </div>
                    </div>
                    <div className={`p-4 rounded-2xl bg-slate-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Management Grid */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Library className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-black text-slate-900">أدوات الإدارة</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminSections.map((section, index) => (
                <motion.div
                  key={index}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link href={section.href} className="block group">
                    <Card className="h-full border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white ring-1 ring-slate-100 relative">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-6">
                          <div className={`p-4 rounded-2xl bg-gradient-to-br ${section.color} text-white shadow-lg shadow-indigo-200`}>
                            <section.icon className="w-7 h-7" />
                          </div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold px-3 py-1">
                            {section.badge}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-8 pb-8 pt-0">
                        <CardTitle className="text-xl font-black mb-3 text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {section.title}
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium leading-relaxed mb-6">
                          {section.description}
                        </CardDescription>

                        <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
                          <span>فتح الإدارة</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>

                      {/* Hover background effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-500" />
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">إجراءات سريعة</h3>
                  <p className="text-slate-500 text-sm">مهام شائعة للوصول السريع</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard/admin/dream-academy/videos">
                  <Button variant="outline" className="rounded-2xl h-12 bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-700 gap-2 font-bold transition-all">
                    <PlayCircle className="w-4 h-4 text-indigo-600" /> مراجعة الفيديوهات
                  </Button>
                </Link>
                <Link href="/dashboard/admin/dream-academy/categories">
                  <Button variant="outline" className="rounded-2xl h-12 bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-700 gap-2 font-bold transition-all">
                    <Plus className="w-4 h-4 text-emerald-600" /> إنشاء فئة جديدة
                  </Button>
                </Link>
                <Link href="/dashboard/admin/media">
                  <Button variant="outline" className="rounded-2xl h-12 bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-700 gap-2 font-bold transition-all">
                    <Users className="w-4 h-4 text-blue-600" /> مراجعة طلبات الانضمام
                  </Button>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AccountTypeProtection>
  );
}
