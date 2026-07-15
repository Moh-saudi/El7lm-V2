'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Headphones,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { PublicLandingShell } from '@/components/layout/PublicLandingShell';
import { useTranslation } from '@/lib/i18n';
import { SUPPORT_CONTACT, getEmailLink, getWhatsAppLink } from '@/lib/support-contact';

export default function SupportPage() {
  const { t, isRTL } = useTranslation();
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
    `${item.question} ${item.answer}`.toLocaleLowerCase().includes(faqQuery.trim().toLocaleLowerCase()),
  );

  const topics = [
    {
      icon: UserRound,
      title: t('support.topicAccount'),
      description: t('support.topicAccountDesc'),
      className: 'bg-violet-100 text-violet-700',
    },
    {
      icon: KeyRound,
      title: t('support.topicAccess'),
      description: t('support.topicAccessDesc'),
      className: 'bg-amber-100 text-amber-700',
    },
    {
      icon: CreditCard,
      title: t('support.topicPayments'),
      description: t('support.topicPaymentsDesc'),
      className: 'bg-emerald-100 text-emerald-700',
    },
    {
      icon: Wrench,
      title: t('support.topicTechnical'),
      description: t('support.topicTechnicalDesc'),
      className: 'bg-sky-100 text-sky-700',
    },
  ];

  const channels = [
    {
      icon: MessageCircle,
      title: t('support.channelChat'),
      value: SUPPORT_CONTACT.whatsapp.qatar,
      status: t('support.channelChatStatus'),
      href: getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, t('support.whatsappMessage')),
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      icon: Phone,
      title: t('support.channelPhone'),
      value: SUPPORT_CONTACT.whatsapp.egypt,
      status: t('support.channelPhoneStatus'),
      href: `tel:${SUPPORT_CONTACT.whatsapp.egypt}`,
      color: 'text-sky-700 bg-sky-50',
    },
    {
      icon: Mail,
      title: t('support.channelEmail'),
      value: SUPPORT_CONTACT.email,
      status: t('support.channelEmailStatus'),
      href: getEmailLink(),
      color: 'text-indigo-700 bg-indigo-50',
    },
  ];

  const chooseTopic = (title: string) => {
    setFormData((current) => ({ ...current, subject: title }));
    document.getElementById('support-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priorityKey = `support.priority${formData.priority.charAt(0).toUpperCase()}${formData.priority.slice(1)}`;
    const body = [
      `${t('support.fullName')}: ${formData.name}`,
      `${t('support.email')}: ${formData.email}`,
      `${t('support.priority')}: ${t(priorityKey)}`,
      '',
      formData.message,
    ].join('\n');

    setEmailPrepared(true);
    window.location.href = getEmailLink(formData.subject, body);
  };

  return (
    <PublicLandingShell>
      <main className="bg-[#f7f7f5]" dir={isRTL ? 'rtl' : 'ltr'}>
        <section className="relative overflow-hidden bg-[#101828] text-white">
          <div className="absolute inset-0 opacity-40" aria-hidden="true">
            <div className="absolute -start-32 -top-32 h-80 w-80 rounded-full border-[64px] border-emerald-400/20" />
            <div className="absolute -end-24 bottom-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-emerald-300">
              <Headphones className="h-4 w-4" />
              {t('support.eyebrow')}
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {t('support.helpSearchTitle')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              {t('support.helpSearchSubtitle')}
            </p>

            <div className="relative mx-auto mt-9 max-w-2xl text-slate-950">
              <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-5' : 'left-5'}`} />
              <input
                value={faqQuery}
                onChange={(event) => setFaqQuery(event.target.value)}
                placeholder={t('support.searchFaq')}
                className={`h-16 w-full rounded-2xl border-0 bg-white text-base shadow-2xl outline-none ring-4 ring-white/10 transition focus:ring-emerald-400/40 ${isRTL ? 'pr-14 pl-5' : 'pl-14 pr-5'}`}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-bold text-slate-300">{t('support.popularLabel')}</span>
              {[t('support.topicAccount'), t('support.topicAccess'), t('support.topicTechnical')].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseTopic(item)}
                  className="rounded-full border border-white/15 px-3 py-1.5 transition hover:border-emerald-300 hover:text-emerald-300"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white">
                  <Headphones className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-black text-slate-950">{t('support.directSupportTitle')}</h2>
                  <p className="mt-1 text-xs text-slate-500">{t('support.directSupportDesc')}</p>
                </div>
              </div>

              <div className="mt-2 divide-y divide-slate-100">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <a
                      key={channel.title}
                      href={channel.href}
                      target={channel.href.startsWith('http') ? '_blank' : undefined}
                      rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="group flex items-start gap-3 py-4"
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${channel.color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-900">{channel.title}</span>
                          <ArrowUpRight className={`h-4 w-4 text-slate-300 group-hover:text-indigo-600 ${isRTL ? '-rotate-90' : ''}`} />
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500" dir="ltr">{channel.value}</span>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {channel.status}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-emerald-700 p-5 text-white">
              <Clock3 className="h-6 w-6 text-emerald-200" />
              <h2 className="mt-4 font-black">{t('support.workingHours')}</h2>
              <p className="mt-2 text-sm leading-7 text-emerald-100">{t('support.workingHoursDesc')}</p>
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600">{t('support.quickHelp')}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t('support.chooseTopicTitle')}</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-500">{t('support.chooseTopicDescription')}</p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {topics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() => chooseTopic(topic.title)}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 text-start transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                    >
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${topic.className}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-black text-slate-900">{topic.title}</span>
                          <ArrowUpRight className={`h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-600 ${isRTL ? '-rotate-90' : ''}`} />
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-slate-500">{topic.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section id="faq" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">{t('support.tabFaq')}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{t('support.faqTitle')}</h2>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 sm:block">
                  {visibleFaqs.length} / {faqItems.length}
                </span>
              </div>

              <div className="mt-7 divide-y divide-slate-100 border-y border-slate-100">
                {visibleFaqs.map((item) => {
                  const originalIndex = faqItems.indexOf(item);
                  const isOpen = openFaq === originalIndex;
                  return (
                    <div key={item.question}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? -1 : originalIndex)}
                        className="flex w-full items-center justify-between gap-5 py-5 text-start"
                        aria-expanded={isOpen}
                      >
                        <span className="font-black leading-7 text-slate-900">{item.question}</span>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {isOpen && <p className="max-w-3xl pb-6 text-sm leading-7 text-slate-600">{item.answer}</p>}
                    </div>
                  );
                })}
              </div>
              {visibleFaqs.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  {t('support.noFaqResults')}
                </div>
              )}
            </section>

            <section id="support-request" className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-indigo-50 px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white">
                    <Send className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">{t('support.sendRequestTitle')}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t('support.formDescription')}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">{t('support.fullName')}</span>
                    <input
                      required
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      placeholder={t('support.fullNamePlaceholder')}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">{t('support.email')}</span>
                    <input
                      required
                      type="email"
                      dir="ltr"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      placeholder={t('support.emailPlaceholder')}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-slate-800">{t('support.subject')}</span>
                    <input
                      required
                      value={formData.subject}
                      onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                      placeholder={t('support.subjectPlaceholder')}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-slate-800">{t('support.priority')}</span>
                    <select
                      value={formData.priority}
                      onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    >
                      <option value="low">{t('support.priorityLow')}</option>
                      <option value="medium">{t('support.priorityMedium')}</option>
                      <option value="high">{t('support.priorityHigh')}</option>
                      <option value="urgent">{t('support.priorityUrgent')}</option>
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-black text-slate-800">{t('support.message')}</span>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                      placeholder={t('support.messagePlaceholder')}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    {t('support.privacyNote')}
                  </div>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                    <Send className="h-4 w-4" />
                    {t('support.sendRequest')}
                  </button>
                </div>

                {emailPrepared && (
                  <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('support.emailPrepared')}
                  </p>
                )}
              </form>
            </section>
          </div>
        </div>
      </main>
    </PublicLandingShell>
  );
}
