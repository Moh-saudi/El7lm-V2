'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Table as TableIcon,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type CareerApplication = {
  id: string
  fullName: string
  email: string
  phone: string
  country?: string
  governorate?: string
  experience?: string
  linkedin?: string
  facebook?: string
  roles?: string[]
  role?: string
  notes?: string
  collection?: string
  createdAt?: Date | string | { seconds: number }
  status?: 'pending' | 'contacted' | 'shortlisted' | 'hired' | string
}

type JobTemplate = {
  key: string
  title: string
  location: string
  type: string
  experience: string
  salary?: string
  description?: string
  category: string
  contactEmail?: string
  contactWhatsApp?: string
}

type JobCategory = {
  id: string
  name: string
  description: string
  accent: string
  icon: React.ReactNode
  roles: JobTemplate[]
}

const defaultJobCategories: JobCategory[] = [
  {
    id: 'tech',
    name: 'التقنية والمنتج',
    description: 'فرق التطوير، البيانات، وتجربة المستخدم',
    accent: 'from-indigo-500 to-blue-500',
    icon: <Sparkles className="w-5 h-5" />,
    roles: [
      {
        key: 'nextjsDevelopers',
        title: 'مطور Next.js',
        location: 'القاهرة، مصر / الدوحة، قطر',
        type: 'دوام كامل',
        experience: '2-4 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'التقنية والمنتج',
        description: 'تطوير الواجهات الحديثة، تحسين الأداء، والعمل مع فريق المنتج.'
      },
      {
        key: 'performanceAnalysts',
        title: 'محلل أداء رياضي',
        location: 'الدوحة، قطر',
        type: 'دوام كامل',
        experience: '3-5 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'التقنية والمنتج',
        description: 'تحليل بيانات اللاعبين والبطولات وتقديم تقارير ذكية للمدربين.'
      }
    ]
  },
  {
    id: 'management',
    name: 'الإدارة والتطوير',
    description: 'الوظائف القيادية وتنمية الأعمال',
    accent: 'from-emerald-500 to-teal-500',
    icon: <Building2 className="w-5 h-5" />,
    roles: [
      {
        key: 'clubManagement',
        title: 'مدير نادي',
        location: 'الخليج العربي',
        type: 'دوام كامل',
        experience: '5+ سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الإدارة والتطوير',
        description: 'إدارة عمليات النادي، الإشراف على الفرق، وضمان تجربة مميزة للأعضاء.'
      },
      {
        key: 'academyManagement',
        title: 'مدير أكاديمية',
        location: 'قطر / الإمارات',
        type: 'دوام كامل',
        experience: '4-7 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الإدارة والتطوير',
        description: 'تأسيس البرامج التدريبية وتطوير بيئة تعليمية عالية الجودة.'
      },
      {
        key: 'sales',
        title: 'مندوب مبيعات',
        location: 'مصر / قطر',
        type: 'دوام كامل',
        experience: '1-3 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الإدارة والتطوير',
        description: 'بناء علاقات مع العملاء وتوسيع الشراكات التجارية.'
      }
    ]
  },
  {
    id: 'sports',
    name: 'الرياضة والتدريب',
    description: 'الوظائف الفنية وعمليات البطولات',
    accent: 'from-purple-500 to-pink-500',
    icon: <Users className="w-5 h-5" />,
    roles: [
      {
        key: 'scoutsManagement',
        title: 'مدير كشافين',
        location: 'الخليج وأوروبا',
        type: 'دوام كامل',
        experience: '5+ سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الرياضة والتدريب',
        description: 'إدارة شبكة الكشافين وتنسيق خطط اكتشاف المواهب.'
      },
      {
        key: 'tournamentsManagement',
        title: 'مدير بطولات',
        location: 'قطر / تركيا',
        type: 'دوام كامل',
        experience: '3-6 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الرياضة والتدريب',
        description: 'تنظيم بطولات احترافية وضمان تجربة سلسة للفرق المشاركة.'
      },
      {
        key: 'trialsManagement',
        title: 'مدير تجارب اللاعبين',
        location: 'متعدد الدول',
        type: 'دوام كامل',
        experience: '4+ سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الرياضة والتدريب',
        description: 'تنسيق تجارب اللاعبين الدولية وإدارة التواصل مع الأندية.'
      }
    ]
  },
  {
    id: 'support',
    name: 'الدعم وخدمة العملاء',
    description: 'واجهة العملاء وتجربة المستخدم',
    accent: 'from-orange-500 to-amber-500',
    icon: <Phone className="w-5 h-5" />,
    roles: [
      {
        key: 'customerRelations',
        title: 'مدير علاقات العملاء',
        location: 'الدوحة، قطر',
        type: 'دوام كامل',
        experience: '2-4 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الدعم وخدمة العملاء',
        description: 'قيادة تجربة العملاء وتعزيز رضا الشركاء واللاعبين.'
      },
      {
        key: 'callCenter',
        title: 'أخصائي مركز اتصال',
        location: 'القاهرة، مصر',
        type: 'دوام كامل',
        experience: '1-2 سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الدعم وخدمة العملاء',
        description: 'الرد على استفسارات العملاء ومتابعة الطلبات اليومية.'
      },
      {
        key: 'directCustomerCare',
        title: 'رعاية عملاء مباشرة',
        location: 'عن بُعد',
        type: 'دوام جزئي',
        experience: '1+ سنوات',
        salary: 'يحدد لاحقاً',
        category: 'الدعم وخدمة العملاء',
        description: 'تقديم دعم مخصص عبر القنوات الرقمية (البريد، الواتساب، التطبيق).'
      }
    ]
  }
]

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'بانتظار المراجعة', color: 'text-amber-700', bg: 'bg-amber-50' },
  contacted: { label: 'تم التواصل', color: 'text-blue-700', bg: 'bg-blue-50' },
  shortlisted: { label: 'قائمة مختصرة', color: 'text-purple-700', bg: 'bg-purple-50' },
  hired: { label: 'تم التوظيف', color: 'text-emerald-700', bg: 'bg-emerald-50' }
}

const templatePlaceholders = [
  { token: '{name}', description: 'اسم المتقدم' },
  { token: '{role}', description: 'المسمى الوظيفي' },
  { token: '{category}', description: 'القسم أو الفريق' },
  { token: '{location}', description: 'موقع العمل' },
  { token: '{company}', description: 'اسم الشركة/العلامة' }
]

const defaultJobsFlat = defaultJobCategories.flatMap((category) => category.roles)

const normalizePhoneForWhatsApp = (phone?: string) => {
  if (!phone) return ''
  const digits = phone.replace(/[^+\d]/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('+')) return digits.slice(1)
  return digits
}

const formatDate = (value?: CareerApplication['createdAt']) => {
  if (!value) return 'غير متوفر'
  if (value instanceof Date) return value.toLocaleString('ar-EG')
  if (typeof value === 'string') return new Date(value).toLocaleString('ar-EG')
  if ('seconds' in value) return new Date(value.seconds * 1000).toLocaleString('ar-EG')
  return 'غير متوفر'
}

const getPrimaryRole = (application: CareerApplication) => {
  if (Array.isArray(application.roles) && application.roles.length > 0) {
    return application.roles[0]
  }
  return application.role || ''
}

export default function CareersAdminPage() {
  const [applications, setApplications] = useState<CareerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [customJobs, setCustomJobs] = useState<JobTemplate[]>([])
  const [newJob, setNewJob] = useState<Omit<JobTemplate, 'key'>>({
    title: '',
    category: '',
    description: '',
    experience: '',
    location: '',
    salary: '',
    type: 'دوام كامل',
    contactEmail: '',
    contactWhatsApp: ''
  })

  const [messageSubject, setMessageSubject] = useState('فرصة عمل لدى منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية')
  const [messageTemplate, setMessageTemplate] = useState(
    'مرحباً {name},\nيسعدنا اهتمامك بوظيفة {role} ضمن فريق {category} في منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية. نود ترتيب مكالمة سريعة للتعرف عليك بشكل أفضل.\nالموقع: {location}\nشكراً لك!'
  )
  const [messageLanguage, setMessageLanguage] = useState<'ar' | 'en'>('ar')
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'grid'>('cards')

  const [jobCategoryFilter, setJobCategoryFilter] = useState('all')

  // قوالب الرسائل باللغتين
  const messageTemplates = {
    ar: {
      default: 'مرحباً {name},\nيسعدنا اهتمامك بوظيفة {role} ضمن فريق {category} في منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية. نود ترتيب مكالمة سريعة للتعرف عليك بشكل أفضل.\nالموقع: {location}\nشكراً لك!',
      interview: 'مرحباً {name},\nنحن متحمسون لاهتمامك بوظيفة {role} ضمن فريق {category} لدينا في منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية. نود دعوتك لمقابلة تمهيدية عن بُعد للتعرف عليك أكثر.\nالموقع: {location}\nطبيعة العمل: {type}\nبانتظار ردك،\nفريق منصة الحلم'
    },
    en: {
      default: 'Hello {name},\nWe are pleased with your interest in the {role} position within our {category} team at El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company. We would like to arrange a quick call to get to know you better.\nLocation: {location}\nThank you!',
      interview: 'Hello {name},\nWe are excited about your interest in the {role} position within our {category} team at El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company. We would like to invite you for a preliminary remote interview to get to know you more.\nLocation: {location}\nWork Type: {type}\nLooking forward to your response,\nEl7lm Platform Team'
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/careers/applications')
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'تعذر جلب الطلبات')
        setApplications(json.items || [])
      } catch (e: any) {
        setError(e?.message || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allJobs = useMemo(() => [...defaultJobsFlat, ...customJobs], [customJobs])

  const jobDictionary = useMemo(() => {
    const map = new Map<string, JobTemplate>()
    allJobs.forEach((job) => map.set(job.key, job))
    return map
  }, [allJobs])

  const roleOptions = useMemo(() => {
    const entries = new Map<string, string>()
    allJobs.forEach((job) => entries.set(job.key, job.title))
    applications.forEach((application) => {
      const primary = getPrimaryRole(application)
      if (primary && !entries.has(primary)) {
        entries.set(primary, primary)
      }
    })
    return Array.from(entries.entries()).map(([value, label]) => ({ value, label }))
  }, [allJobs, applications])

  const countryOptions = useMemo(() => {
    const set = new Set<string>()
    applications.forEach((application) => {
      if (application.country) set.add(application.country)
    })
    return Array.from(set)
  }, [applications])

  const stats = useMemo(() => {
    const total = applications.length
    const pending = applications.filter((app) => (app.status || 'pending') === 'pending').length
    const contacted = applications.filter((app) => app.status === 'contacted').length
    const uniqueCountries = new Set(applications.map((app) => app.country).filter(Boolean)).size
    return { total, pending, contacted, uniqueCountries }
  }, [applications])

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return applications.filter((application) => {
      const primaryRole = getPrimaryRole(application)
      const matchesSearch =
        !term ||
        [application.fullName, application.email, application.phone, application.experience]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))

      const matchesRole = roleFilter === 'all' || primaryRole === roleFilter
      const matchesCountry = countryFilter === 'all' || application.country === countryFilter
      const matchesStatus =
        statusFilter === 'all' || (application.status || 'pending') === statusFilter

      return matchesSearch && matchesRole && matchesCountry && matchesStatus
    })
  }, [applications, searchTerm, roleFilter, countryFilter, statusFilter])

  const filteredJobCategories = useMemo(() => {
    if (jobCategoryFilter === 'all') return defaultJobCategories
    return defaultJobCategories.filter((category) => category.id === jobCategoryFilter)
  }, [jobCategoryFilter])

  const getPersonalizedMessage = (application: CareerApplication, lang: 'ar' | 'en' = messageLanguage) => {
    const job = jobDictionary.get(getPrimaryRole(application))
    // استخدام القالب الحالي (messageTemplate) لأنه يمثل القالب الذي يعدله المستخدم
    const template = messageTemplate
    
    const replacements = {
      name: application.fullName || (lang === 'ar' ? 'المتقدم' : 'Applicant'),
      role: job?.title || application.role || (lang === 'ar' ? 'الوظيفة المتقدم لها' : 'Applied Position'),
      category: job?.category || (lang === 'ar' ? 'فريق منصة الحلم' : 'El7lm Platform Team'),
      location: job?.location || application.country || (lang === 'ar' ? 'عن بُعد' : 'Remote'),
      company: lang === 'ar' ? 'منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية' : 'El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company',
      type: job?.type || (lang === 'ar' ? 'دوام كامل' : 'Full Time')
    }
    
    return template
      .replace(/{name}/gi, replacements.name)
      .replace(/{role}/gi, replacements.role)
      .replace(/{category}/gi, replacements.category)
      .replace(/{location}/gi, replacements.location)
      .replace(/{company}/gi, replacements.company)
      .replace(/{type}/gi, replacements.type)
  }

  const sendWhatsAppMessage = async (application: CareerApplication) => {
    if (!application.phone) {
      toast.error('رقم الهاتف غير متوفر')
      return
    }

    setSendingWhatsApp(application.id)
    try {
      const message = getPersonalizedMessage(application, messageLanguage)
      const phone = normalizePhoneForWhatsApp(application.phone)
      
      if (!phone) {
        toast.error('رقم الهاتف غير صحيح')
        setSendingWhatsApp(null)
        return
      }

      const response = await fetch('/api/whatsapp/send-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: message,
          organizationName: 'منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية',
          accountType: 'admin'
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('تم إرسال الرسالة عبر واتساب بنجاح!')
        // تحديث حالة الطلب إلى "تم التواصل"
        setApplications(prev => 
          prev.map(app => 
            app.id === application.id 
              ? { ...app, status: 'contacted' }
              : app
          )
        )
      } else {
        toast.error(result.error || 'فشل في إرسال الرسالة')
      }
    } catch (error: any) {
      console.error('❌ خطأ في إرسال رسالة واتساب:', error)
      toast.error('حدث خطأ أثناء إرسال الرسالة')
    } finally {
      setSendingWhatsApp(null)
    }
  }

  const buildEmailLink = (application: CareerApplication) => {
    const subject = encodeURIComponent(messageSubject)
    const body = encodeURIComponent(getPersonalizedMessage(application, messageLanguage))
    return `mailto:${application.email}?subject=${subject}&body=${body}`
  }

  const buildWhatsAppLink = (application: CareerApplication) => {
    const phone = normalizePhoneForWhatsApp(application.phone)
    if (!phone) return '#'
    const text = encodeURIComponent(getPersonalizedMessage(application, messageLanguage))
    return `https://wa.me/${phone}?text=${text}`
  }

  const copyMessage = async (application: CareerApplication) => {
    try {
      await navigator.clipboard.writeText(getPersonalizedMessage(application, messageLanguage))
      toast.success(messageLanguage === 'ar' ? 'تم نسخ النص إلى الحافظة' : 'Message copied to clipboard')
    } catch {
      toast.error(messageLanguage === 'ar' ? 'تعذر نسخ النص. حاول مرة أخرى' : 'Failed to copy text. Please try again')
    }
  }

  const handleAddJob = () => {
    if (!newJob.title || !newJob.category || !newJob.location) {
      toast.error('يرجى تعبئة العنوان، القسم، والموقع')
      return
    }
    const key =
      newJob.title.trim().replace(/\s+/g, '-').toLowerCase() +
      '-' +
      Math.random().toString(36).slice(2, 6)
    setCustomJobs((prev) => [...prev, { ...newJob, key }])
    setNewJob({
      title: '',
      category: '',
      description: '',
      experience: '',
      location: '',
      salary: '',
      type: 'دوام كامل',
      contactEmail: '',
      contactWhatsApp: ''
    })
    toast.success('تمت إضافة الوظيفة إلى المكتبة الخاصة بك')
  }

  const handleUseJobInMessage = (job: JobTemplate) => {
    if (messageLanguage === 'ar') {
      setMessageSubject(`فرصة ${job.title} في منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية`)
      setMessageTemplate(
        `مرحباً {name},\nنحن متحمسون لاهتمامك بوظيفة ${job.title} ضمن فريق ${job.category} لدينا في منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية. نود دعوتك لمقابلة تمهيدية عن بُعد للتعرف عليك أكثر.\nالموقع: ${job.location}\nطبيعة العمل: ${job.type}\nبانتظار ردك،\nفريق منصة الحلم`
      )
    } else {
      setMessageSubject(`Job Opportunity: ${job.title} at El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company`)
      setMessageTemplate(
        `Hello {name},\nWe are excited about your interest in the ${job.title} position within our ${job.category} team at El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company. We would like to invite you for a preliminary remote interview to get to know you more.\nLocation: ${job.location}\nWork Type: ${job.type}\nLooking forward to your response,\nEl7lm Platform Team`
      )
    }
    toast.success(messageLanguage === 'ar' ? 'تم ضبط قالب الرسالة بناءً على الوظيفة المختارة' : 'Message template updated based on selected job')
  }

  // دالة مساعدة لعرض بطاقة المتقدم
  const renderApplicationCard = (application: CareerApplication, compact: boolean = false) => {
    const statusKey = (application.status || 'pending').toLowerCase()
    const statusStyle = statusMeta[statusKey] || statusMeta.pending
    const job = jobDictionary.get(getPrimaryRole(application))

    return (
      <div
        key={application.id}
        className={cn(
          'bg-white rounded-2xl border shadow-sm transition border-slate-100 hover:border-blue-200 hover:shadow-md',
          compact ? 'p-4' : 'p-5'
        )}
      >
        <div className={cn('flex flex-col gap-3', compact ? '':'md:flex-row md:items-start md:justify-between')}>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 items-center">
              <h3 className={cn('font-semibold text-slate-900', compact ? 'text-base' : 'text-lg')}>
                {application.fullName}
              </h3>
              <Badge className={cn('text-xs', statusStyle.bg, statusStyle.color)}>
                {statusStyle.label}
              </Badge>
              {application.collection && (
                <Badge variant="outline" className="text-xs text-slate-500">
                  {application.collection}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-2 text-sm text-slate-500">
              <Briefcase className="w-4 h-4 text-blue-400" />
              {job?.title || application.roles?.join('، ') || application.role || '—'}
              <span className="mx-2 w-1 h-1 rounded-full bg-slate-300" />
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              {formatDate(application.createdAt)}
            </div>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-2">
              {application.linkedin && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={application.linkedin} target="_blank" rel="noreferrer">
                    لينكدإن
                  </a>
                </Button>
              )}
              {application.facebook && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={application.facebook} target="_blank" rel="noreferrer">
                    فيسبوك
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className={cn('grid gap-4 mt-4', compact ? 'grid-cols-2' : 'md:grid-cols-4')}>
          <div>
            <p className="text-xs text-slate-500">البريد الإلكتروني</p>
            <a
              href={`mailto:${application.email}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {application.email}
            </a>
          </div>
          <div>
            <p className="text-xs text-slate-500">الهاتف</p>
            <a
              href={`tel:${application.phone}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {application.phone}
            </a>
          </div>
          <div>
            <p className="text-xs text-slate-500">الموقع</p>
            <p className="text-sm font-medium text-slate-900">
              {application.country || 'غير محدد'}
            </p>
            {application.governorate && (
              <p className="text-xs text-slate-500">{application.governorate}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">الخبرات</p>
            <p className="text-sm text-slate-900">
              {application.experience || '—'}
            </p>
          </div>
        </div>

        {!compact && application.notes && (
          <div className="p-3 mt-4 text-sm rounded-xl bg-slate-50 text-slate-600">
            {application.notes}
          </div>
        )}

        <div className={cn('mt-5 flex flex-wrap gap-3', compact && 'gap-2')}>
          <Button
            asChild
            size="sm"
            className={cn(
              'flex-1 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-sm',
              'hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-200',
              compact && 'text-xs'
            )}
          >
            <a href={buildEmailLink(application)}>
              <Mail className="w-4 h-4" />
              بريد مخصص
            </a>
          </Button>
          <Button
            size="sm"
            className={cn(
              'flex-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-sm',
              'hover:from-emerald-600 hover:via-green-600 hover:to-lime-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              compact && 'text-xs'
            )}
            onClick={() => sendWhatsAppMessage(application)}
            disabled={sendingWhatsApp === application.id || !application.phone}
          >
            <MessageCircle className="w-4 h-4" />
            {sendingWhatsApp === application.id ? 'جاري الإرسال...' : 'واتساب مباشر'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'flex-1 border-fuchsia-200 text-fuchsia-700',
              'hover:text-fuchsia-800 hover:border-fuchsia-300 hover:bg-fuchsia-50',
              compact && 'text-xs'
            )}
            onClick={() => copyMessage(application)}
          >
            نسخ نص الرسالة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="px-4 py-8 mx-auto space-y-8 max-w-7xl sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 p-8 text-white bg-gradient-to-l from-indigo-600 via-blue-600 to-sky-500 rounded-3xl shadow-xl">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
              <p className="text-sm tracking-widest uppercase text-white/80">
                لوحة تحكم التوظيف المتكاملة
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                إدارة وظائف حلم والمتقدمين
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="secondary"
                className="text-white bg-white/20 hover:bg-white/30"
              >
                <a
                  href="https://www.el7lm.com/dashboard/admin/careers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  معاينة الصفحة العامة
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </Button>
              <Button
                variant="default"
                className="bg-white text-slate-900 hover:bg-white/90"
                onClick={() =>
                  toast.info('سيتم قريباً دمج هذه اللوحة مع أنظمة الإشعارات المركزية')
                }
              >
                <Sparkles className="w-4 h-4" />
                تفعيل التنبيهات الذكية
              </Button>
            </div>
          </div>
          <p className="max-w-3xl text-base text-white/90">
            لوحة مُعاد تصميمها لعرض الوظائف المفتوحة، متابعة الطلبات، وإرسال رسائل مخصصة عبر البريد الإلكتروني والواتساب خلال ثوانٍ.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card className="border-none shadow-sm bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">إجمالي الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-end">
              <span className="text-3xl font-bold text-slate-900">{stats.total}</span>
              <Badge className="bg-slate-100 text-slate-800">
                {filteredApplications.length} بعد التصفية
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">بانتظار المتابعة</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-end">
              <span className="text-3xl font-bold text-amber-600">{stats.pending}</span>
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">تم التواصل معهم</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-end">
              <span className="text-3xl font-bold text-blue-600">{stats.contacted}</span>
              <Mail className="w-6 h-6 text-blue-400" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500">الدول الممثلة</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-end">
              <span className="text-3xl font-bold text-emerald-600">
                {stats.uniqueCountries}
              </span>
              <Globe className="w-6 h-6 text-emerald-400" />
            </CardContent>
          </Card>
        </section>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">إدارة الوظائف المفتوحة</p>
              <h2 className="text-xl font-semibold text-slate-900">مكتبة الوظائف الموصى بها</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={jobCategoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setJobCategoryFilter('all')}
                className={cn(
                  jobCategoryFilter === 'all'
                    ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white shadow-md hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700'
                    : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'
                )}
              >
                جميع الأقسام
              </Button>
              {defaultJobCategories.map((category) => {
                const isActive = jobCategoryFilter === category.id
                const buttonStyles = {
                  tech: isActive
                    ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white shadow-md hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600'
                    : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300',
                  management: isActive
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white shadow-md hover:from-emerald-600 hover:via-teal-600 hover:to-green-600'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300',
                  sports: isActive
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white shadow-md hover:from-purple-600 hover:via-pink-600 hover:to-rose-600'
                    : 'border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300',
                  support: isActive
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-md hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600'
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300'
                }
                
                const styleKey = category.id === 'tech' ? 'tech' 
                  : category.id === 'management' ? 'management'
                  : category.id === 'sports' ? 'sports'
                  : 'support'
                
                return (
                  <Button
                    key={category.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setJobCategoryFilter(category.id)}
                    className={buttonStyles[styleKey]}
                  >
                    {category.name}
                  </Button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="library" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="library">مكتبة الوظائف</TabsTrigger>
                <TabsTrigger value="create">إضافة وظيفة مخصصة</TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="space-y-10">
                {filteredJobCategories.map((category) => (
                  <div key={category.id} className="space-y-4">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                      <div className="flex gap-2 items-center text-slate-600">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-l ${category.accent} px-4 py-1 text-sm text-white`}
                        >
                          {category.icon}
                          {category.name}
                        </div>
                        <span className="text-xs text-slate-500">{category.description}</span>
                      </div>
                      <Badge variant="secondary">{category.roles.length} وظيفة</Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {category.roles.map((job) => (
                        <div
                          key={job.key}
                          className="p-5 bg-white rounded-2xl border shadow-sm transition border-slate-100 hover:-translate-y-1 hover:shadow-lg"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                              <p className="text-sm text-slate-500">{job.category}</p>
                            </div>
                            <Badge variant="outline" className="text-xs text-blue-600">
                              {job.type}
                            </Badge>
                          </div>
                          <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex gap-2 items-center">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              {job.location}
                            </li>
                            {job.experience && (
                              <li className="flex gap-2 items-center">
                                <Users className="w-4 h-4 text-indigo-400" />
                                الخبرة المطلوبة: {job.experience}
                              </li>
                            )}
                            {job.salary && (
                              <li className="flex gap-2 items-center">
                                <Briefcase className="w-4 h-4 text-emerald-400" />
                                الراتب: {job.salary}
                              </li>
                            )}
                          </ul>
                          {job.description && (
                            <p className="mt-4 text-sm text-slate-500">{job.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-5">
                            <Button
                              size="sm"
                              className={cn(
                                'flex-1 text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 shadow-sm',
                                'hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-200'
                              )}
                              onClick={() => handleUseJobInMessage(job)}
                            >
                              استخدام في الرسالة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                'flex-1 text-blue-700 border-blue-200',
                                'hover:text-blue-800 hover:border-blue-300 hover:bg-blue-50'
                              )}
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${job.title} - ${job.location}\n${job.description ?? ''}`
                                  )
                                  toast.success('تم نسخ ملخص الوظيفة')
                                } catch {
                                  toast.error('تعذر نسخ الملخص')
                                }
                              }}
                            >
                              نسخ التفاصيل
                            </Button>
                          </div>
                        </div>
                      ))}
              </div>
                  </div>
                ))}

                {customJobs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-2 items-center">
                      <BadgeCheck className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-lg font-semibold text-slate-900">وظائفك المحفوظة</h3>
                      <span className="text-sm text-slate-500">
                        {customJobs.length} وظيفة مخصصة
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {customJobs.map((job) => (
                        <div
                          key={job.key}
                          className="p-5 rounded-2xl border border-emerald-200 border-dashed bg-emerald-50/50"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-base font-semibold text-slate-900">{job.title}</h4>
                              <p className="text-xs text-slate-500">{job.category}</p>
                            </div>
                            <Badge variant="outline">{job.type}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{job.location}</p>
                          {job.description && (
                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">{job.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button size="sm" onClick={() => handleUseJobInMessage(job)}>
                              استخدام في الرسائل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setCustomJobs((prev) => prev.filter((item) => item.key !== job.key))
                              }
                            >
                              إزالة
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="create">
                <div className="space-y-5">
                  {/* معلومات أساسية */}
                  <Card className="bg-gradient-to-br border-2 border-blue-100 from-blue-50/50 to-indigo-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex gap-2 items-center text-lg">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        المعلومات الأساسية
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">عنوان الوظيفة *</label>
                        <Input
                          value={newJob.title}
                          onChange={(e) => setNewJob((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="مثال: مدير علاقات استراتيجية"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">القسم *</label>
                        <Input
                          value={newJob.category}
                          onChange={(e) => setNewJob((prev) => ({ ...prev, category: e.target.value }))}
                          placeholder="القسم أو الفريق"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">الموقع *</label>
                        <Input
                          value={newJob.location}
                          onChange={(e) => setNewJob((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="الدولة / المدينة / عن بُعد"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* تفاصيل الوظيفة */}
                  <Card className="bg-gradient-to-br border-2 border-purple-100 from-purple-50/50 to-pink-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex gap-2 items-center text-lg">
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                        تفاصيل الوظيفة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">طبيعة العمل</label>
                        <Select
                          value={newJob.type}
                          onValueChange={(value) => setNewJob((prev) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder="اختر نوع العمل" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="دوام كامل">دوام كامل</SelectItem>
                            <SelectItem value="دوام جزئي">دوام جزئي</SelectItem>
                            <SelectItem value="عقد مؤقت">عقد مؤقت</SelectItem>
                            <SelectItem value="عمل حر">عمل حر</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">الخبرة المطلوبة</label>
                        <Input
                          value={newJob.experience}
                          onChange={(e) =>
                            setNewJob((prev) => ({ ...prev, experience: e.target.value }))
                          }
                          placeholder="مثال: 3-5 سنوات"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">الراتب أو الامتيازات</label>
                        <Input
                          value={newJob.salary}
                          onChange={(e) => setNewJob((prev) => ({ ...prev, salary: e.target.value }))}
                          placeholder="اختياري"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">وصف مختصر</label>
                        <Textarea
                          rows={6}
                          value={newJob.description}
                          onChange={(e) =>
                            setNewJob((prev) => ({ ...prev, description: e.target.value }))
                          }
                          placeholder="أبرز المهام، الفريق، الأدوات..."
                          className="text-sm sm:text-base min-h-[120px] sm:min-h-[150px] max-h-[300px] resize-y border-slate-300 focus:border-purple-500 focus:ring-purple-500 leading-relaxed"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* معلومات التواصل */}
                  <Card className="bg-gradient-to-br border-2 border-emerald-100 from-emerald-50/50 to-teal-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex gap-2 items-center text-lg">
                        <Phone className="w-5 h-5 text-emerald-600" />
                        معلومات التواصل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">
                          بريد مسؤول التوظيف
                          <span className="ml-1 text-xs font-normal text-slate-500">(اختياري)</span>
                        </label>
                        <Input
                          type="email"
                          value={newJob.contactEmail ?? ''}
                          onChange={(e) =>
                            setNewJob((prev) => ({ ...prev, contactEmail: e.target.value }))
                          }
                          placeholder="talent@el7lm.com"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">
                          رقم واتساب مسؤول التوظيف
                          <span className="ml-1 text-xs font-normal text-slate-500">(اختياري)</span>
                        </label>
                        <Input
                          value={newJob.contactWhatsApp ?? ''}
                          onChange={(e) =>
                            setNewJob((prev) => ({ ...prev, contactWhatsApp: e.target.value }))
                          }
                          placeholder="+974XXXXXXXX"
                          className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* زر الإضافة */}
                  <div className="flex justify-center pt-2">
                    <Button 
                      onClick={handleAddJob}
                      size="lg"
                      className={cn(
                        'px-8 w-full h-12 text-base font-semibold sm:w-auto sm:px-12 sm:h-14 sm:text-lg',
                        'bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600',
                        'text-white shadow-xl hover:shadow-2xl hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
                        'transition-all duration-300 transform hover:scale-105'
                      )}
                    >
                      <Sparkles className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                      إضافة إلى المكتبة
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="space-y-3">
            <div className="flex gap-3 items-center text-slate-500">
              <ClipboardList className="w-5 h-5" />
              <div>
                <p className="text-sm tracking-widest uppercase text-slate-400">الطلبات</p>
                <h2 className="text-2xl font-semibold text-slate-900">مركز إدارة المتقدمين</h2>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              استخدم البحث والتصفية لتحديد أولويات المتابعة، ثم تواصل فوراً عبر البريد أو الواتساب.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 pointer-events-none text-slate-400" />
                  <Input
                    className="pl-10 h-11 text-sm"
                    placeholder="ابحث بالاسم، البريد، الهاتف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder="تصفية حسب الوظيفة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الوظائف</SelectItem>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder="الدولة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الدول</SelectItem>
                    {countryOptions.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder="حالة الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="pending">بانتظار المراجعة</SelectItem>
                    <SelectItem value="contacted">تم التواصل</SelectItem>
                    <SelectItem value="shortlisted">قائمة مختصرة</SelectItem>
                    <SelectItem value="hired">تم التوظيف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* أزرار اختيار طريقة العرض */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium text-slate-700">طريقة العرض:</span>
                  <div className="flex gap-2 p-1 rounded-lg border border-slate-200 bg-slate-50">
                    <Button
                      size="sm"
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        'h-8 gap-2',
                        viewMode === 'cards' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <List className="w-4 h-4" />
                      قائمة
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'h-8 gap-2',
                        viewMode === 'grid' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      شبكة
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      onClick={() => setViewMode('table')}
                      className={cn(
                        'h-8 gap-2',
                        viewMode === 'table' 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <TableIcon className="w-4 h-4" />
                      جدول
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {filteredApplications.length} طلب
                </div>
              </div>
            </div>

            {loading && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200">
                <p className="text-base text-slate-500">جاري تحميل الطلبات...</p>
              </div>
            )}

            {error && (
              <div className="p-6 text-center text-red-600 bg-red-50 rounded-2xl border border-red-200">
                {error}
              </div>
            )}

            {!loading && !error && filteredApplications.length === 0 && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-500">
                لا توجد طلبات مطابقة لخيارات البحث الحالية
              </div>
            )}

            {/* عرض القائمة (Cards) */}
            {viewMode === 'cards' && (
              <div className="space-y-4">
                {filteredApplications.map((application) => renderApplicationCard(application, false))}
              </div>
            )}

            {/* عرض الشبكة (Grid) */}
            {viewMode === 'grid' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredApplications.map((application) => renderApplicationCard(application, true))}
              </div>
            )}

            {/* عرض الجدول (Table) */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">الاسم</TableHead>
                      <TableHead>الوظيفة</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الدولة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => {
                      const statusKey = (application.status || 'pending').toLowerCase()
                      const statusStyle = statusMeta[statusKey] || statusMeta.pending
                      const job = jobDictionary.get(getPrimaryRole(application))

                      return (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col gap-1">
                              <span>{application.fullName}</span>
                              {application.collection && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  {application.collection}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <Briefcase className="w-3 h-3 text-blue-400" />
                              <span className="text-sm">
                                {job?.title || application.roles?.join('، ') || application.role || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${application.email}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {application.email}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`tel:${application.phone}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {application.phone}
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{application.country || 'غير محدد'}</span>
                              {application.governorate && (
                                <span className="text-xs text-slate-500">{application.governorate}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs', statusStyle.bg, statusStyle.color)}>
                              {statusStyle.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="px-2 h-8"
                                title="بريد مخصص"
                              >
                                <a href={buildEmailLink(application)} aria-label="بريد مخصص">
                                  <Mail className="w-3 h-3" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2 h-8"
                                onClick={() => sendWhatsAppMessage(application)}
                                disabled={sendingWhatsApp === application.id || !application.phone}
                                title="واتساب مباشر"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2 h-8"
                                onClick={() => copyMessage(application)}
                                title="نسخ نص الرسالة"
                              >
                                <ClipboardList className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <div className="flex gap-3 items-center">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">قوالب المراسلة</p>
                <h2 className="text-xl font-semibold text-slate-900">
                  أرسل رسائل ذكية عبر البريد أو الواتساب
                </h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* رأس الفورم */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex gap-2 items-center text-sm font-semibold text-slate-700">
                  <Mail className="w-4 h-4 text-blue-500" />
                  عنوان الرسالة
                </label>
                <Input
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="عنوان الرسالة..."
                />
              </div>
              <div className="space-y-2">
                <label className="flex gap-2 items-center text-sm font-semibold text-slate-700">
                  <Globe className="w-4 h-4 text-purple-500" />
                  لغة الرسالة
                </label>
                <Select value={messageLanguage} onValueChange={(value: 'ar' | 'en') => {
                  setMessageLanguage(value)
                  if (value === 'ar') {
                    setMessageTemplate(messageTemplates.ar.default)
                    setMessageSubject('فرصة عمل لدى منصة الحلم - متجر الكتروني لتسويق وبيع الاعبين التابع لشركة ميسك القطرية')
                  } else {
                    setMessageTemplate(messageTemplates.en.default)
                    setMessageSubject('Job Opportunity at El7lm Platform - An e-commerce platform for marketing and selling players, affiliated with Mesk Qatari Company')
                  }
                }}>
                  <SelectTrigger className="h-11 text-sm sm:h-12 sm:text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* محتوى الرسالة */}
            <Card className="bg-gradient-to-br border-2 border-blue-100 from-blue-50/30 to-indigo-50/20">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2">
                  <CardTitle className="flex gap-2 items-center text-sm sm:text-base">
                    <MessageCircle className="w-4 h-4 text-blue-600 sm:w-5 sm:h-5" />
                    نص الرسالة
                  </CardTitle>
                  <span className="px-2 py-1 text-xs bg-white rounded-md border text-slate-500 border-slate-200 w-fit">
                    استخدم المتغيرات الديناميكية
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={14}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="text-sm min-h-[240px] sm:min-h-[320px] max-h-[400px] sm:max-h-[500px] resize-y leading-relaxed w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="اكتب نص الرسالة هنا..."
                  style={{ 
                    wordBreak: 'break-word', 
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-10 text-sm border-blue-200 hover:bg-blue-50"
                    onClick={() => {
                      setMessageTemplate(
                        'مرحباً {name},\nشكراً لتقديمك على وظيفة {role}. نود ترتيب مكالمة تعريفية للتعرف عليك بشكل أكبر ومشاركة تفاصيل الوظيفة في {location}.\nبانتظار ردك.'
                      )
                      toast.info('تمت إعادة تعيين القالب الأساسي')
                    }}
                  >
                    <Sparkles className="ml-2 w-4 h-4" />
                    إعادة التعيين
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-10 text-sm border-emerald-200 hover:bg-emerald-50"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(messageTemplate)
                        toast.success('تم نسخ قالب الرسالة')
                      } catch {
                        toast.error('تعذر نسخ القالب')
                      }
                    }}
                  >
                    <BadgeCheck className="ml-2 w-4 h-4" />
                    نسخ القالب الحالي
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* المتغيرات المتاحة */}
            <Card className="bg-gradient-to-br border-2 border-purple-100 from-purple-50/30 to-pink-50/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex gap-2 items-center text-base">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  المتغيرات المتاحة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templatePlaceholders.map((placeholder) => (
                    <div
                      key={placeholder.token}
                      className="flex flex-col gap-3 p-3 bg-white rounded-xl border-2 transition-all sm:p-4 border-slate-200 hover:border-purple-300 hover:shadow-md"
                    >
                      <div className="flex-1 w-full min-w-0">
                        <p className="mb-1.5 text-xs sm:text-sm font-bold text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block break-all">
                          {placeholder.token}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{placeholder.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-9 text-xs hover:bg-purple-50"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(placeholder.token)
                            toast.success(`تم نسخ ${placeholder.token}`)
                          } catch {
                            toast.error('تعذر النسخ')
                          }
                        }}
                      >
                        نسخ
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="p-3 mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100 sm:p-4">
                  <p className="flex gap-2 items-center mb-2 text-xs font-semibold sm:text-sm text-slate-900">
                    💡 نصيحة سريعة
                  </p>
                  <p className="text-xs leading-relaxed text-slate-700">
                    يمكنك اختيار وظيفة من مكتبة الوظائف أعلاه ليتم ملء تفاصيل الرسالة تلقائياً
                    (العنوان، الفريق، الموقع) قبل إرسالها.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
