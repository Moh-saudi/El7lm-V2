'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  Heart,
  ArrowRight,
  CheckCircle,
  DollarSign,
  Globe,
  Award,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CareersPage() {
  const jobCategories = [
    {
      category: 'التطوير والتقنية',
      icon: '💻',
      color: 'from-blue-500 to-blue-600',
      jobs: [
        {
          title: 'مطور Next.js',
          location: 'القاهرة، مصر / الدوحة، قطر',
          type: 'دوام كامل',
          experience: '2-4 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'nextjsDevelopers'
        },
        {
          title: 'محلل أداء رياضي',
          location: 'الدوحة، قطر',
          type: 'دوام كامل', 
          experience: '3-5 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'performanceAnalysts'
        }
      ]
    },
    {
      category: 'الإدارة والتسويق',
      icon: '📈',
      color: 'from-green-500 to-green-600',
      jobs: [
        {
          title: 'مدير نادي',
          location: 'الخليج العربي',
          type: 'دوام كامل',
          experience: '5+ سنوات',
          salary: 'يحدد لاحقاً',
          key: 'clubManagement'
        },
        {
          title: 'مدير أكاديمية',
          location: 'قطر / الإمارات',
          type: 'دوام كامل',
          experience: '4-7 سنوات', 
          salary: 'يحدد لاحقاً',
          key: 'academyManagement'
        },
        {
          title: 'مندوب مبيعات',
          location: 'مصر / قطر',
          type: 'دوام كامل',
          experience: '1-3 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'sales'
        }
      ]
    },
    {
      category: 'الرياضة والتدريب',
      icon: '⚽',
      color: 'from-purple-500 to-purple-600',
      jobs: [
        {
          title: 'مدير كشافين',
          location: 'الخليج وأوروبا',
          type: 'دوام كامل',
          experience: '5+ سنوات',
          salary: 'يحدد لاحقاً',
          key: 'scoutsManagement'
        },
        {
          title: 'مدير بطولات',
          location: 'قطر / تركيا',
          type: 'دوام كامل',
          experience: '3-6 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'tournamentsManagement'
        },
        {
          title: 'مدير تجارب اللاعبين',
          location: 'متعدد الدول',
          type: 'دوام كامل',
          experience: '4+ سنوات',
          salary: 'يحدد لاحقاً',
          key: 'trialsManagement'
        }
      ]
    },
    {
      category: 'خدمة العملاء والدعم',
      icon: '🤝',
      color: 'from-orange-500 to-orange-600',
      jobs: [
        {
          title: 'علاقات عملاء',
          location: 'الدوحة، قطر',
          type: 'دوام كامل',
          experience: '2-4 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'customerRelations'
        },
        {
          title: 'مركز اتصال',
          location: 'القاهرة، مصر',
          type: 'دوام كامل',
          experience: '1-2 سنوات',
          salary: 'يحدد لاحقاً',
          key: 'callCenter'
        },
        {
          title: 'رعاية عملاء مباشرة',
          location: 'عن بُعد',
          type: 'دوام جزئي',
          experience: '1+ سنوات',
          salary: 'يحدد لاحقاً',
          key: 'directCustomerCare'
        }
      ]
    }
  ];

  const benefits = [
    {
      icon: <Heart className="w-6 h-6 text-red-500" />,
      title: 'تأمين صحي شامل',
      description: 'تغطية طبية كاملة لك ولعائلتك'
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      title: 'نمو مهني',
      description: 'فرص تطوير وتدريب مستمرة'
    },
    {
      icon: <Users className="w-6 h-6 text-blue-500" />,
      title: 'بيئة عمل مميزة',
      description: 'فريق شغوف ومتعاون'
    },
    {
      icon: <Globe className="w-6 h-6 text-purple-500" />,
      title: 'عمل دولي',
      description: 'فرص العمل في قطر ومصر والخليج'
    },
    {
      icon: <DollarSign className="w-6 h-6 text-yellow-500" />,
      title: 'رواتب تنافسية',
      description: 'رواتب مميزة مع حوافز ومكافآت'
    },
    {
      icon: <Zap className="w-6 h-6 text-indigo-500" />,
      title: 'تقنيات متقدمة',
      description: 'العمل مع أحدث التقنيات الرياضية'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="py-20 px-4 text-center relative overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 w-20 h-20 bg-blue-200/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-200/30 rounded-full"
          />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-6xl mb-6"
          >
            💼
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            انضم إلى
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {' '}فريقنا
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            كن جزءاً من رؤيتنا لتطوير الرياضة العربية وصناعة المستقبل
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block"
          >
            <Button 
              onClick={() => document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg inline-flex items-center space-x-2 space-x-reverse"
            >
              <span>تصفح الوظائف</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Company Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '25+', label: 'موظف', icon: '👥' },
              { number: '8', label: 'دول', icon: '🌍' },
              { number: '150+', label: 'لاعب', icon: '⚽' },
              { number: '25+', label: 'نادي شريك', icon: '🏆' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              لماذا تعمل معنا؟
            </h2>
            <p className="text-xl text-gray-600">
              نوفر بيئة عمل مثالية لتحقيق طموحاتك المهنية
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="text-center h-full">
                  <CardContent className="p-6">
                    <div className="mb-4 flex justify-center">
                      {benefit.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs by Category */}
      <section id="jobs" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              الوظائف المتاحة
            </h2>
            <p className="text-xl text-gray-600">
              اكتشف الفرص المثيرة المتاحة في فريقنا
            </p>
          </motion.div>

          <div className="space-y-12">
            {jobCategories.map((category, categoryIndex) => (
              <motion.div
                key={categoryIndex}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: categoryIndex * 0.2 }}
              >
                {/* Category Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-3 space-x-reverse mb-4">
                    <span className="text-4xl">{category.icon}</span>
                    <h3 className="text-2xl font-bold text-gray-900">{category.category}</h3>
                  </div>
                </div>

                {/* Jobs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.jobs.map((job, jobIndex) => (
                    <motion.div
                      key={jobIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: jobIndex * 0.1 }}
                      whileHover={{ scale: 1.02, y: -5 }}
                    >
                      <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-0">
                          {/* Job Header */}
                          <div className={`bg-gradient-to-r ${category.color} p-6 text-white`}>
                            <h4 className="text-xl font-bold mb-2">{job.title}</h4>
                            <div className="flex items-center space-x-2 space-x-reverse text-sm opacity-90">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          </div>

                          {/* Job Details */}
                          <div className="p-6">
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-1 space-x-reverse">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">نوع العمل</span>
                                </div>
                                <span className="text-gray-600">{job.type}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-1 space-x-reverse">
                                  <Award className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">الخبرة</span>
                                </div>
                                <span className="text-gray-600">{job.experience}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-1 space-x-reverse">
                                  <DollarSign className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">الراتب</span>
                                </div>
                                <span className="text-green-600 font-semibold">{job.salary}</span>
                              </div>
                            </div>

                            <Button 
                              onClick={() => window.location.href = `/careers/apply?role=${job.key}`}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
                            >
                              تقدم الآن
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">
              لم تجد الوظيفة المناسبة؟
            </h2>
            <p className="text-xl mb-8 opacity-90">
              أرسل لنا سيرتك الذاتية وسنتواصل معك عند توفر فرصة مناسبة
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/careers/apply'}
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold"
              >
                أرسل سيرتك الذاتية
              </Button>
              <Button 
                onClick={() => window.location.href = '/contact'}
                variant="outline" 
                className="border-black text-black hover:bg-black hover:text-white px-8 py-4 rounded-full text-lg font-semibold"
              >
                تواصل معنا
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}



