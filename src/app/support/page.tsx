'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Headphones,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  PlayCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react';
import { PublicResponsiveLayoutWrapper } from '@/components/layout/PublicResponsiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/lib/i18n';
import { SUPPORT_CONTACT, getEmailLink, getWhatsAppLink } from '@/lib/support-contact';

type SupportTab = 'contact' | 'faq' | 'resources';

export default function SupportPage() {
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState<SupportTab>('contact');
  const [openFaq, setOpenFaq] = useState(0);
  const [faqQuery, setFaqQuery] = useState('');
  const [emailPrepared, setEmailPrepared] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium',
  });

  const faqItems = useMemo(() => [
    { question: t('support.faqQ1'), answer: t('support.faqA1') },
    { question: t('support.faqQ2'), answer: t('support.faqA2') },
    { question: t('support.faqQ3'), answer: t('support.faqA3') },
    { question: t('support.faqQ4'), answer: t('support.faqA4') },
  ], [t]);

  const visibleFaqs = faqItems.filter((item) =>
    `${item.question} ${item.answer}`.toLocaleLowerCase().includes(faqQuery.toLocaleLowerCase()),
  );

  const whatsappMessage = t('support.whatsappMessage');
  const supportChannels = [
    {
      icon: MessageCircle,
      title: t('support.channelChat'),
      description: t('support.channelChatDesc'),
      status: t('support.channelChatStatus'),
      value: SUPPORT_CONTACT.whatsapp.qatar,
      href: getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, whatsappMessage),
      accent: 'from-emerald-400 to-teal-500',
      soft: 'bg-emerald-50 text-emerald-700',
    },
    {
      icon: Phone,
      title: t('support.channelPhone'),
      description: t('support.channelPhoneDesc'),
      status: t('support.channelPhoneStatus'),
      value: SUPPORT_CONTACT.whatsapp.egypt,
      href: `tel:${SUPPORT_CONTACT.whatsapp.egypt}`,
      accent: 'from-sky-400 to-cyan-500',
      soft: 'bg-sky-50 text-sky-700',
    },
    {
      icon: Mail,
      title: t('support.channelEmail'),
      description: t('support.channelEmailDesc'),
      status: t('support.channelEmailStatus'),
      value: SUPPORT_CONTACT.email,
      href: getEmailLink(),
      accent: 'from-violet-400 to-indigo-500',
      soft: 'bg-violet-50 text-violet-700',
    },
  ];

  const tabs: Array<{ id: SupportTab; label: string; icon: React.ElementType }> = [
    { id: 'contact', label: t('support.tabContact'), icon: MessageCircle },
    { id: 'faq', label: t('support.tabFaq'), icon: HelpCircle },
    { id: 'resources', label: t('support.tabResources'), icon: BookOpen },
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priority = t(`support.priority${formData.priority.charAt(0).toUpperCase()}${formData.priority.slice(1)}`);
    const body = [
      `${t('support.fullName')}: ${formData.name}`,
      `${t('support.email')}: ${formData.email}`,
      `${t('support.priority')}: ${priority}`,
      '',
      formData.message,
    ].join('\n');

    setEmailPrepared(true);
    window.location.href = getEmailLink(formData.subject, body);
  };

  return (
    <PublicResponsiveLayoutWrapper>
      <main className="min-h-screen overflow-hidden bg-[#f4f7fa] text-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
        <section className="relative isolate overflow-hidden bg-[#071b2b] text-white">
          <div className="absolute inset-0 -z-10 opacity-60">
            <div className="absolute -start-32 top-12 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -end-24 bottom-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-12 lg:pb-32 lg:pt-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold tracking-wide text-cyan-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {t('support.eyebrow')}
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.12] sm:text-5xl lg:text-7xl">
                {t('support.title')}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                {t('support.subtitle')}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => setActiveTab('contact')}
                  className="h-12 rounded-full bg-cyan-400 px-6 font-black text-[#071b2b] shadow-lg shadow-cyan-950/30 hover:bg-cyan-300"
                >
                  <Headphones className="h-5 w-5" />
                  {t('support.contactNow')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setActiveTab('faq')}
                  className="h-12 rounded-full border-white/20 bg-white/5 px-6 font-bold text-white hover:bg-white/10 hover:text-white"
                >
                  {t('support.tabFaq')}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  [Zap, t('support.metricFast'), t('support.metricFastDesc')],
                  [ShieldCheck, t('support.metricSecure'), t('support.metricSecureDesc')],
                  [Clock3, t('support.metricAvailable'), t('support.metricAvailableDesc')],
                ].map(([Icon, title, description]) => {
                  const MetricIcon = Icon as React.ElementType;
                  return (
                    <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
                      <MetricIcon className="mb-3 h-5 w-5 text-cyan-300" />
                      <p className="font-black text-white">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{description as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-cyan-400/20 to-blue-600/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">{t('support.quickSupport')}</p>
                    <h2 className="mt-2 text-2xl font-black">{t('support.chooseChannel')}</h2>
                  </div>
                  <div className="rounded-2xl bg-cyan-300/15 p-3 text-cyan-200">
                    <LifeBuoy className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {supportChannels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <a
                        key={channel.title}
                        href={channel.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[.1]"
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${channel.soft}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-black text-white">{channel.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-400" dir="ltr">{channel.value}</span>
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:text-cyan-300" />
                      </a>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  {t('support.responsePromise')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-900/5 sm:justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition sm:flex-none sm:px-8 ${
                    selected ? 'bg-[#0b6f88] text-white shadow-lg shadow-cyan-900/15' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          {activeTab === 'contact' && (
            <div className="space-y-12">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[.18em] text-cyan-700">{t('support.contactChannels')}</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('support.contactHeading')}</h2>
                <p className="mt-4 leading-7 text-slate-600">{t('support.contactDescription')}</p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {supportChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <a
                      key={channel.title}
                      href={channel.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${channel.accent}`} />
                      <div className="flex items-start justify-between">
                        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${channel.soft}`}>
                          <Icon className="h-6 w-6" />
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-cyan-700" />
                      </div>
                      <h3 className="mt-6 text-xl font-black text-slate-950">{channel.title}</h3>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{channel.description}</p>
                      <p className="mt-5 truncate font-bold text-slate-800" dir="ltr">{channel.value}</p>
                      <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{channel.status}</span>
                    </a>
                  );
                })}
              </div>

              <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-[.72fr_1.28fr]">
                <div className="relative overflow-hidden bg-[#0a3045] p-7 text-white sm:p-10">
                  <div className="absolute -end-20 -top-20 h-64 w-64 rounded-full border-[42px] border-cyan-300/10" />
                  <div className="relative">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300 text-[#071b2b]">
                      <Send className="h-6 w-6" />
                    </span>
                    <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-cyan-300">{t('support.formEyebrow')}</p>
                    <h2 className="mt-3 text-3xl font-black">{t('support.sendAMessage')}</h2>
                    <p className="mt-4 leading-7 text-slate-300">{t('support.formDescription')}</p>

                    <div className="mt-10 space-y-4 text-sm text-slate-200">
                      <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-cyan-300" />{t('support.privacyNote')}</div>
                      <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-cyan-300" />{t('support.channelEmailStatus')}</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-10">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-bold text-slate-700">
                      <span>{t('support.fullName')}</span>
                      <Input
                        required
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        placeholder={t('support.fullNamePlaceholder')}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-cyan-600"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-700">
                      <span>{t('support.email')}</span>
                      <Input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        placeholder={t('support.emailPlaceholder')}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-cyan-600"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
                    <label className="space-y-2 text-sm font-bold text-slate-700">
                      <span>{t('support.subject')}</span>
                      <Input
                        required
                        value={formData.subject}
                        onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                        placeholder={t('support.subjectPlaceholder')}
                        className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-cyan-600"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-700">
                      <span>{t('support.priority')}</span>
                      <select
                        value={formData.priority}
                        onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                      >
                        <option value="low">{t('support.priorityLow')}</option>
                        <option value="medium">{t('support.priorityMedium')}</option>
                        <option value="high">{t('support.priorityHigh')}</option>
                        <option value="urgent">{t('support.priorityUrgent')}</option>
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-2 text-sm font-bold text-slate-700">
                    <span>{t('support.message')}</span>
                    <Textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                      placeholder={t('support.messagePlaceholder')}
                      className="resize-none rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-cyan-600"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">{emailPrepared ? t('support.emailPrepared') : t('support.emailClientNote')}</p>
                    <Button type="submit" className="h-12 rounded-xl bg-[#0b6f88] px-7 font-black text-white hover:bg-[#095c71]">
                      <Send className="h-4 w-4" />
                      {t('support.sendRequest')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="mx-auto max-w-4xl">
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-[.18em] text-cyan-700">{t('support.quickHelp')}</p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">{t('support.faqTitle')}</h2>
                <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">{t('support.faqDescription')}</p>
              </div>

              <div className="relative mx-auto mt-8 max-w-2xl">
                <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                <Input
                  value={faqQuery}
                  onChange={(event) => setFaqQuery(event.target.value)}
                  placeholder={t('support.searchFaq')}
                  className={`h-14 rounded-2xl border-slate-200 bg-white shadow-sm ${isRTL ? 'pr-12' : 'pl-12'}`}
                />
              </div>

              <div className="mt-10 space-y-3">
                {visibleFaqs.map((item, index) => {
                  const expanded = openFaq === index;
                  return (
                    <div key={item.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(expanded ? -1 : index)}
                        className="flex w-full items-center gap-4 p-5 text-start sm:p-6"
                        aria-expanded={expanded}
                      >
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${expanded ? 'bg-cyan-700 text-white' : 'bg-cyan-50 text-cyan-700'}`}>
                          <HelpCircle className="h-5 w-5" />
                        </span>
                        <span className="flex-1 font-black text-slate-900">{item.question}</span>
                        <ChevronDown className={`h-5 w-5 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && <p className="border-t border-slate-100 px-5 py-5 leading-8 text-slate-600 sm:px-20">{item.answer}</p>}
                    </div>
                  );
                })}
                {visibleFaqs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{t('support.noFaqResults')}</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-black uppercase tracking-[.18em] text-cyan-700">{t('support.learnAtYourPace')}</p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">{t('support.tabResources')}</h2>
                <p className="mt-4 leading-7 text-slate-600">{t('support.resourcesDescription')}</p>
              </div>

              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {[
                  { icon: BookOpen, title: t('support.userGuide'), description: t('support.userGuideDesc'), action: t('support.downloadGuide'), href: '/about', color: 'bg-cyan-50 text-cyan-700' },
                  { icon: PlayCircle, title: t('support.videoTutorials'), description: t('support.videoTutorialsDesc'), action: t('support.watchVideos'), href: '/videos', color: 'bg-emerald-50 text-emerald-700' },
                  { icon: Users2, title: t('support.userCommunity'), description: t('support.userCommunityDesc'), action: t('support.joinCommunity'), href: getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, whatsappMessage), color: 'bg-violet-50 text-violet-700', external: true },
                ].map((resource) => {
                  const Icon = resource.icon;
                  const content = (
                    <>
                      <span className={`grid h-14 w-14 place-items-center rounded-2xl ${resource.color}`}><Icon className="h-7 w-7" /></span>
                      <h3 className="mt-7 text-xl font-black">{resource.title}</h3>
                      <p className="mt-3 min-h-20 leading-7 text-slate-500">{resource.description}</p>
                      <span className="mt-8 inline-flex items-center gap-2 font-black text-cyan-800">
                        {resource.action}<ArrowUpRight className="h-4 w-4" />
                      </span>
                    </>
                  );
                  return resource.external ? (
                    <a key={resource.title} href={resource.href} target="_blank" rel="noreferrer" className="group rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">{content}</a>
                  ) : (
                    <Link key={resource.title} href={resource.href} className="group rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">{content}</Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-7 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#0a3045] to-[#0b6f88] p-7 text-white shadow-2xl shadow-cyan-950/15 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"><Clock3 className="h-6 w-6 text-cyan-300" /></span>
              <div>
                <h2 className="text-2xl font-black">{t('support.workingHours')}</h2>
                <p className="mt-2 max-w-2xl leading-7 text-cyan-50/80">{t('support.workingHoursDesc')}</p>
              </div>
            </div>
            <a
              href={getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 font-black text-[#0a3045] transition hover:bg-cyan-50"
            >
              <MessageCircle className="h-5 w-5" />
              {t('support.contactNow')}
            </a>
          </div>
        </section>
      </main>
    </PublicResponsiveLayoutWrapper>
  );
}
