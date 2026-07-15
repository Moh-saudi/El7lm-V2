'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
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

  const channels = [
    {
      icon: MessageCircle,
      title: t('support.channelChat'),
      description: t('support.channelChatDesc'),
      status: t('support.channelChatStatus'),
      value: SUPPORT_CONTACT.whatsapp.qatar,
      href: getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, t('support.whatsappMessage')),
      iconStyle: 'bg-emerald-100 text-emerald-700',
      hoverStyle: 'hover:border-emerald-200',
    },
    {
      icon: Phone,
      title: t('support.channelPhone'),
      description: t('support.channelPhoneDesc'),
      status: t('support.channelPhoneStatus'),
      value: SUPPORT_CONTACT.whatsapp.egypt,
      href: `tel:${SUPPORT_CONTACT.whatsapp.egypt}`,
      iconStyle: 'bg-sky-100 text-sky-700',
      hoverStyle: 'hover:border-sky-200',
    },
    {
      icon: Mail,
      title: t('support.channelEmail'),
      description: t('support.channelEmailDesc'),
      status: t('support.channelEmailStatus'),
      value: SUPPORT_CONTACT.email,
      href: getEmailLink(),
      iconStyle: 'bg-indigo-100 text-indigo-700',
      hoverStyle: 'hover:border-indigo-200',
    },
  ];

  const heroMetrics = [
    { icon: CheckCircle2, label: t('support.metricFast'), className: 'bg-emerald-50 text-emerald-600' },
    { icon: ShieldCheck, label: t('support.metricSecure'), className: 'bg-indigo-50 text-indigo-600' },
    { icon: Clock3, label: t('support.metricAvailable'), className: 'bg-sky-50 text-sky-600' },
  ];

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
      <main className="overflow-hidden bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
        <section className="relative border-b border-slate-100 bg-gradient-to-b from-indigo-50/80 via-white to-white">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -start-24 top-8 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="absolute -end-20 top-24 h-72 w-72 rounded-full bg-indigo-200/35 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-sm">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                {t('support.eyebrow')}
              </span>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {t('support.title')}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {t('support.subtitle')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={getWhatsAppLink(SUPPORT_CONTACT.whatsapp.qatar, t('support.whatsappMessage'))}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/15 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t('support.contactNow')}
                </a>
                <a
                  href="#support-form"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                >
                  <Mail className="h-5 w-5" />
                  {t('support.sendAMessage')}
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-3 rotate-2 rounded-[2rem] bg-gradient-to-br from-emerald-200 to-indigo-200 opacity-60" />
              <div className="relative rounded-[2rem] border border-white/80 bg-white p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white">
                    <Headphones className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-black text-slate-950">{t('support.quickSupport')}</p>
                    <p className="mt-1 text-sm text-slate-500">{t('support.chooseChannel')}</p>
                  </div>
                </div>
                <div className="mt-7 space-y-4">
                  {heroMetrics.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-xl ${item.className}`}>
                          <ItemIcon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-emerald-700">{t('support.contactChannels')}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('support.contactHeading')}</h2>
            <p className="mt-4 leading-7 text-slate-600">{t('support.contactDescription')}</p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.title}
                  href={channel.href}
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                  rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                  className={`group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${channel.hoverStyle}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${channel.iconStyle}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <ArrowUpRight className={`h-5 w-5 text-slate-300 transition group-hover:text-indigo-600 ${isRTL ? '-rotate-90' : ''}`} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">{channel.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{channel.description}</p>
                  <p className="mt-5 text-sm font-bold text-slate-800" dir="ltr">{channel.value}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {channel.status}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section id="support-form" className="bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-black text-indigo-700">
                <Send className="h-4 w-4" />
                {t('support.formEyebrow')}
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('support.sendAMessage')}</h2>
              <p className="mt-5 max-w-lg leading-8 text-slate-600">{t('support.formDescription')}</p>
              <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
                  <p className="text-sm font-semibold leading-6 text-indigo-900">{t('support.privacyNote')}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">{t('support.fullName')}</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder={t('support.fullNamePlaceholder')}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">{t('support.email')}</span>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    placeholder={t('support.emailPlaceholder')}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    dir="ltr"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-800">{t('support.subject')}</span>
                  <input
                    required
                    value={formData.subject}
                    onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                    placeholder={t('support.subjectPlaceholder')}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-800">{t('support.priority')}</span>
                  <select
                    value={formData.priority}
                    onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="low">{t('support.priorityLow')}</option>
                    <option value="medium">{t('support.priorityMedium')}</option>
                    <option value="high">{t('support.priorityHigh')}</option>
                    <option value="urgent">{t('support.priorityUrgent')}</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-800">{t('support.message')}</span>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    placeholder={t('support.messagePlaceholder')}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              </div>

              {emailPrepared && (
                <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  {t('support.emailPrepared')}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {t('support.sendRequest')}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">{t('support.emailClientNote')}</p>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
              <HelpCircle className="h-4 w-4" />
              {t('support.quickHelp')}
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('support.faqTitle')}</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">{t('support.faqDescription')}</p>
          </div>

          <div className="relative mx-auto mt-8 max-w-2xl">
            <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              value={faqQuery}
              onChange={(event) => setFaqQuery(event.target.value)}
              placeholder={t('support.searchFaq')}
              className={`h-14 w-full rounded-2xl border border-slate-200 bg-white py-4 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
            />
          </div>

          <div className="mt-8 space-y-3">
            {visibleFaqs.map((item) => {
              const originalIndex = faqItems.indexOf(item);
              const isOpen = openFaq === originalIndex;
              return (
                <div key={item.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : originalIndex)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-start sm:px-6"
                    aria-expanded={isOpen}
                  >
                    <span className="font-black text-slate-900">{item.question}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>
                  {isOpen && <p className="border-t border-slate-100 px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6">{item.answer}</p>}
                </div>
              );
            })}
            {visibleFaqs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
                {t('support.noFaqResults')}
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl bg-indigo-700 px-6 py-7 text-center text-white sm:flex-row sm:text-start">
            <div>
              <h3 className="text-lg font-black">{t('support.stillNeedHelp')}</h3>
              <p className="mt-1 text-sm text-indigo-100">{t('support.responsePromise')}</p>
            </div>
            <Link href="#support-form" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700">
              {t('support.sendAMessage')}
              <ArrowUpRight className={`h-4 w-4 ${isRTL ? '-rotate-90' : ''}`} />
            </Link>
          </div>
        </section>
      </main>
    </PublicLandingShell>
  );
}
