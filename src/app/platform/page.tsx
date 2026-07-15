'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  DollarSign,
  GraduationCap,
  MessageSquare,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useTranslation } from '@/lib/i18n';

const featureIcons = [Users, BarChart3, Target, MessageSquare, GraduationCap, DollarSign];
const featureColors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-indigo-500', 'text-emerald-500'];
const audienceStyles = [
  { icon: '⚽', color: 'from-blue-500 to-blue-600' },
  { icon: '🏆', color: 'from-green-500 to-green-600' },
  { icon: '🧑‍🏫', color: 'from-purple-500 to-purple-600' },
  { icon: '💼', color: 'from-orange-500 to-orange-600' },
];
const stepIcons = [Users, Trophy, BarChart3, Target];

type Feature = { title: string; description: string; details: string[] };
type Audience = { title: string; benefits: string[] };
type Step = { title: string; description: string };

export default function PlatformGuidePage() {
  const { isRTL, getTranslations } = useTranslation();
  const t = getTranslations<any>('platformGuide');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`fixed top-4 z-50 ${isRTL ? 'left-4' : 'right-4'}`}>
        <LanguageSwitcher />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden px-4 py-20 text-center"
      >
        <div className="relative z-10 mx-auto max-w-4xl">
          <motion.h1
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl"
          >
            {t.hero.prefix}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t.hero.accent}
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-8 text-xl text-gray-600">
            {t.hero.subtitle}
          </motion.p>
        </div>
      </motion.section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title={t.features.title} subtitle={t.features.subtitle} />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((feature: Feature, index: number) => {
              const Icon = featureIcons[index];
              return (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }}>
                  <Card className="h-full transition-all duration-300 hover:shadow-xl">
                    <CardContent className="p-8">
                      <div className="mb-6 flex justify-center"><Icon className={`h-8 w-8 ${featureColors[index]}`} /></div>
                      <h3 className="mb-4 text-center text-xl font-bold text-gray-900">{feature.title}</h3>
                      <p className="mb-6 text-center leading-relaxed text-gray-600">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" /><span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title={t.audiences.title} subtitle={t.audiences.subtitle} />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {t.audiences.items.map((audience: Audience, index: number) => (
              <motion.div key={audience.title} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -10 }}>
                <Card className="h-full overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br p-6 text-center text-white ${audienceStyles[index].color}`}>
                      <div className="mb-3 text-4xl">{audienceStyles[index].icon}</div><h3 className="text-xl font-bold">{audience.title}</h3>
                    </div>
                    <ul className="space-y-3 p-6">
                      {audience.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600"><Star className="h-4 w-4 flex-shrink-0 text-yellow-500" /><span>{benefit}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle title={t.steps.title} subtitle={t.steps.subtitle} light />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {t.steps.items.map((step: Step, index: number) => {
              const Icon = stepIcons[index];
              return (
                <motion.div key={step.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.2 }} className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20"><span className="text-2xl font-bold">{String(index + 1).padStart(2, '0')}</span></div>
                  <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                    <div className="mb-4 flex justify-center text-white/80"><Icon className="h-6 w-6" /></div>
                    <h3 className="mb-3 text-xl font-bold">{step.title}</h3><p className="leading-relaxed text-white/80">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">{t.cta.title}</h2>
          <p className="mb-8 text-xl text-gray-600">{t.cta.subtitle}</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button onClick={() => { window.location.href = '/auth/register'; }} className="inline-flex rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700">
              <span>{t.cta.start}</span><ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <Button onClick={() => { window.location.href = '/contact'; }} variant="outline" className="rounded-full border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 hover:bg-gray-100">
              {t.cta.contact}
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function SectionTitle({ title, subtitle, light = false }: { title: string; subtitle: string; light?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 text-center">
      <h2 className={`mb-6 text-4xl font-bold md:text-5xl ${light ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      <p className={`mx-auto max-w-3xl text-xl ${light ? 'text-white/90' : 'text-gray-600'}`}>{subtitle}</p>
    </motion.div>
  );
}
