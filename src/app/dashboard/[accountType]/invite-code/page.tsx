'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { OrganizationReferral } from '@/types/organization-referral';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, Copy, Share2, QrCode, ToggleLeft, ToggleRight,
  RefreshCw, X, ChevronDown, ChevronUp, Building, GraduationCap,
  Briefcase, Target, Users, Calendar, Infinity, Link2,
  CheckCircle2, Clock, Zap, Gift, ShieldCheck, BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrgName(userData: any, accountType: string): string {
  if (!userData) return '';
  switch (accountType) {
    case 'club':     return userData.club_name     || userData.full_name || userData.name || '';
    case 'academy':  return userData.academy_name  || userData.full_name || userData.name || '';
    case 'trainer':  return userData.trainer_name  || userData.full_name || userData.name || '';
    case 'agent':    return userData.agent_name    || userData.full_name || userData.name || '';
    case 'marketer': return userData.full_name     || userData.name      || '';
    default:         return userData.full_name     || userData.name      || '';
  }
}

function isOrgAccount(accountType: string) {
  return ['club', 'academy', 'trainer', 'agent', 'marketer'].includes(accountType);
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  club: Building, academy: GraduationCap, trainer: Target, agent: Briefcase, marketer: Zap,
};

const INVITE_COPY = {
  ar: {
    types: ['نادي','أكاديمية','مدرب','وكيل','مسوّق','لاعب'], error: 'حدث خطأ، يرجى المحاولة مجدداً', createSuccess: 'تم إنشاء كود الدعوة بنجاح',
    createTitle: 'إنشاء كود دعوة جديد', createSub: 'سيتم توليد كود فريد تلقائياً', description: 'وصف الكود', optional: '(اختياري)', descriptionPh: 'مثال: كود الموسم الجديد 2026', maxUsage: 'الحد الأقصى للاستخدام', unlimited: 'غير محدود', expires: 'تاريخ الانتهاء', howUse: 'كيف تستخدم الكود؟', tips: ['شارك الكود مع اللاعبين الذين تريد دعوتهم','يدخل اللاعب الكود في صفحة كود الانضمام','يصلك طلب انضمام للموافقة عليه أو رفضه'], creating: 'جاري الإنشاء...', create: 'إنشاء كود الدعوة',
    copiedCode: 'تم نسخ الكود', copiedLink: 'تم نسخ الرابط', active: 'نشط', expired: 'منتهي', disabled: 'معطل', used: 'استُخدم', from: 'من', available: 'المتاح', ends: 'ينتهي', open: 'مفتوح', user: 'مستخدم', inviteLink: 'رابط الدعوة',
    invalidCode: 'الكود غير صحيح أو منتهي الصلاحية', joinSuccess: 'تم إرسال طلب الانضمام إلى {{name}} بنجاح', enterCode: 'أدخل كود الانضمام', enterCodeSub: 'هل لديك كود دعوة من نادٍ أو أكاديمية؟ أدخله هنا للانضمام إليهم.', codeLabel: 'كود الدعوة', verify: 'تحقق', playersJoined: 'لاعب انضم بهذا الكود', sending: 'جاري الإرسال...', sendJoin: 'إرسال طلب الانضمام', howWorks: 'كيف تعمل؟', steps: ['أدخل الكود الذي أرسله لك النادي أو الأكاديمية','تحقق من البيانات ثم أرسل طلب الانضمام','انتظر موافقة المنظمة على طلبك','بعد القبول ستنضم رسمياً إلى المنظمة'],
    loadError: 'حدث خطأ في تحميل الأكواد', enabled: 'تم تفعيل الكود', disabledToast: 'تم تعطيل الكود', playerTitle: 'كود الانضمام', playerSub: 'انضم إلى نادٍ أو أكاديمية بكود الدعوة', orgTitle: 'أكواد الدعوة', orgSub: 'أنشئ أكواداً لدعوة اللاعبين للانضمام إليك', newCode: 'كود جديد', totalCodes: 'إجمالي الأكواد', activeCodes: 'أكواد نشطة', totalJoins: 'إجمالي الانضمامات', noCodes: 'لا توجد أكواد بعد', noCodesSub: 'أنشئ أول كود لدعوة اللاعبين للانضمام إليك', createFirst: 'إنشاء أول كود',
  },
  en: {
    types: ['Club','Academy','Coach','Agent','Marketer','Player'], error: 'Something went wrong. Please try again.', createSuccess: 'Invitation code created successfully',
    createTitle: 'Create a New Invitation Code', createSub: 'A unique code will be generated automatically', description: 'Code Description', optional: '(optional)', descriptionPh: 'Example: New season 2026', maxUsage: 'Maximum Uses', unlimited: 'Unlimited', expires: 'Expiry Date', howUse: 'How do you use the code?', tips: ['Share the code with players you want to invite','The player enters it on the Join Code page','You receive a join request to approve or reject'], creating: 'Creating...', create: 'Create Invitation Code',
    copiedCode: 'Code copied', copiedLink: 'Link copied', active: 'Active', expired: 'Expired', disabled: 'Disabled', used: 'Used', from: 'of', available: 'Available', ends: 'Expires', open: 'Open', user: 'user', inviteLink: 'Invitation Link',
    invalidCode: 'The code is invalid or expired', joinSuccess: 'Join request sent to {{name}} successfully', enterCode: 'Enter Join Code', enterCodeSub: 'Do you have an invitation code from a club or academy? Enter it here to join.', codeLabel: 'Invitation Code', verify: 'Verify', playersJoined: 'players joined with this code', sending: 'Sending...', sendJoin: 'Send Join Request', howWorks: 'How does it work?', steps: ['Enter the code sent by the club or academy','Verify the details and send your join request','Wait for the organization to approve your request','Once approved, you officially join the organization'],
    loadError: 'Failed to load invitation codes', enabled: 'Code activated', disabledToast: 'Code disabled', playerTitle: 'Join Code', playerSub: 'Join a club or academy using an invitation code', orgTitle: 'Invitation Codes', orgSub: 'Create codes to invite players to join you', newCode: 'New Code', totalCodes: 'Total Codes', activeCodes: 'Active Codes', totalJoins: 'Total Joins', noCodes: 'No codes yet', noCodesSub: 'Create your first code to invite players', createFirst: 'Create First Code',
  },
  es: {
    types: ['Club','Academia','Entrenador','Agente','Especialista en marketing','Jugador'], error: 'Se produjo un error. Inténtalo de nuevo.', createSuccess: 'Código de invitación creado correctamente',
    createTitle: 'Crear un nuevo código', createSub: 'Se generará automáticamente un código único', description: 'Descripción del código', optional: '(opcional)', descriptionPh: 'Ejemplo: Nueva temporada 2026', maxUsage: 'Usos máximos', unlimited: 'Ilimitado', expires: 'Fecha de caducidad', howUse: '¿Cómo se utiliza?', tips: ['Comparte el código con los jugadores que quieras invitar','El jugador lo introduce en la página Código de unión','Recibirás una solicitud para aprobarla o rechazarla'], creating: 'Creando...', create: 'Crear código de invitación',
    copiedCode: 'Código copiado', copiedLink: 'Enlace copiado', active: 'Activo', expired: 'Caducado', disabled: 'Desactivado', used: 'Usado', from: 'de', available: 'Disponible', ends: 'Caduca', open: 'Abierto', user: 'usuario', inviteLink: 'Enlace de invitación',
    invalidCode: 'El código no es válido o ha caducado', joinSuccess: 'Solicitud enviada a {{name}} correctamente', enterCode: 'Introduce el código de unión', enterCodeSub: '¿Tienes un código de un club o academia? Introdúcelo aquí para unirte.', codeLabel: 'Código de invitación', verify: 'Verificar', playersJoined: 'jugadores se unieron con este código', sending: 'Enviando...', sendJoin: 'Enviar solicitud', howWorks: '¿Cómo funciona?', steps: ['Introduce el código enviado por el club o academia','Verifica los datos y envía la solicitud','Espera la aprobación de la organización','Tras la aprobación te unirás oficialmente'],
    loadError: 'Error al cargar los códigos', enabled: 'Código activado', disabledToast: 'Código desactivado', playerTitle: 'Código de unión', playerSub: 'Únete a un club o academia mediante un código', orgTitle: 'Códigos de invitación', orgSub: 'Crea códigos para invitar jugadores', newCode: 'Nuevo código', totalCodes: 'Total de códigos', activeCodes: 'Códigos activos', totalJoins: 'Total de uniones', noCodes: 'Aún no hay códigos', noCodesSub: 'Crea el primer código para invitar jugadores', createFirst: 'Crear primer código',
  },
  pt: {
    types: ['Clube','Academia','Treinador','Agente','Profissional de marketing','Jogador'], error: 'Ocorreu um erro. Tente novamente.', createSuccess: 'Código de convite criado com sucesso',
    createTitle: 'Criar novo código', createSub: 'Será gerado automaticamente um código único', description: 'Descrição do código', optional: '(opcional)', descriptionPh: 'Exemplo: Nova época 2026', maxUsage: 'Utilizações máximas', unlimited: 'Ilimitado', expires: 'Data de validade', howUse: 'Como utilizar o código?', tips: ['Partilhe o código com os jogadores que pretende convidar','O jogador introduz o código na página de adesão','Receberá um pedido para aprovar ou rejeitar'], creating: 'A criar...', create: 'Criar código de convite',
    copiedCode: 'Código copiado', copiedLink: 'Ligação copiada', active: 'Ativo', expired: 'Expirado', disabled: 'Desativado', used: 'Utilizado', from: 'de', available: 'Disponível', ends: 'Expira', open: 'Aberto', user: 'utilizador', inviteLink: 'Ligação do convite',
    invalidCode: 'O código é inválido ou expirou', joinSuccess: 'Pedido enviado para {{name}} com sucesso', enterCode: 'Introduza o código de adesão', enterCodeSub: 'Tem um código de um clube ou academia? Introduza-o aqui para aderir.', codeLabel: 'Código de convite', verify: 'Verificar', playersJoined: 'jogadores aderiram com este código', sending: 'A enviar...', sendJoin: 'Enviar pedido', howWorks: 'Como funciona?', steps: ['Introduza o código enviado pelo clube ou academia','Verifique os dados e envie o pedido','Aguarde a aprovação da organização','Após a aprovação aderirá oficialmente'],
    loadError: 'Falha ao carregar os códigos', enabled: 'Código ativado', disabledToast: 'Código desativado', playerTitle: 'Código de adesão', playerSub: 'Adira a um clube ou academia com um código', orgTitle: 'Códigos de convite', orgSub: 'Crie códigos para convidar jogadores', newCode: 'Novo código', totalCodes: 'Total de códigos', activeCodes: 'Códigos ativos', totalJoins: 'Total de adesões', noCodes: 'Ainda não existem códigos', noCodesSub: 'Crie o primeiro código para convidar jogadores', createFirst: 'Criar primeiro código',
  },
};

function useInviteCopy() {
  const { locale, isRTL } = useTranslation();
  return { copy: INVITE_COPY[locale], locale, isRTL };
}

// ─── Create Code Sheet ────────────────────────────────────────────────────────

interface CreateSheetProps {
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
  organizationType: string;
  organizationName: string;
}

function CreateSheet({ onClose, onCreated, organizationId, organizationType, organizationName }: CreateSheetProps) {
  const { copy, isRTL } = useInviteCopy();
  const [description, setDescription] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await organizationReferralService.createOrganizationReferral(
        organizationId,
        organizationType,
        organizationName,
        {
          description: description || undefined,
          maxUsage: maxUsage ? parseInt(maxUsage) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        }
      );
      toast.success(copy.createSuccess);
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || copy.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">{copy.createTitle}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{copy.createSub}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Org badge */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-indigo-900 text-sm">{organizationName}</p>
              <p className="text-xs text-indigo-500">{copy.types[['club','academy','trainer','agent','marketer','player'].indexOf(organizationType)] || organizationType}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">{copy.description} <span className="text-gray-400 font-normal">{copy.optional}</span></label>
              <Input
                placeholder={copy.descriptionPh}
                className="rounded-xl h-12 border-gray-200 text-gray-900"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ fontSize: '16px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{copy.maxUsage}</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    placeholder={copy.unlimited}
                    className="rounded-xl h-12 border-gray-200 pr-10"
                    value={maxUsage}
                    onChange={e => setMaxUsage(e.target.value)}
                    style={{ fontSize: '16px' }}
                  />
                  <Infinity className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{copy.expires}</label>
                <Input
                  type="date"
                  className="rounded-xl h-12 border-gray-200"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  style={{ fontSize: '16px' }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> {copy.howUse}
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              {copy.tips.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
          </div>

          {/* Action */}
          <Button
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-100"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> {copy.creating}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> {copy.create}
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Code Card ────────────────────────────────────────────────────────────────

function CodeCard({ code, onToggle }: { code: OrganizationReferral; onToggle: (id: string, active: boolean) => void }) {
  const { copy, locale } = useInviteCopy();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    toast.success(type === 'code' ? copy.copiedCode : copy.copiedLink);
  };

  const pct = code.maxUsage ? Math.min((code.currentUsage / code.maxUsage) * 100, 100) : 0;
  const expDate = code.expiresAt
    ? new Date((code.expiresAt as any).toDate ? (code.expiresAt as any).toDate() : code.expiresAt)
    : null;
  const isExpired = expDate ? expDate < new Date() : false;

  return (
    <motion.div
      layout
      className={cn(
        'bg-white rounded-3xl border-2 overflow-hidden transition-all',
        code.isActive && !isExpired ? 'border-indigo-100 shadow-sm hover:shadow-md' : 'border-gray-100 opacity-60',
      )}
    >
      {/* Top bar */}
      <div className={cn('h-1.5', code.isActive && !isExpired ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-200')} />

      <div className="p-5 space-y-4">
        {/* Code + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-black text-gray-900 tracking-widest">{code.referralCode}</span>
              <button
                onClick={() => copyToClipboard(code.referralCode, 'code')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  copied ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-gray-100 text-gray-400',
                )}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {code.description && (
              <p className="text-xs text-gray-500 font-medium">{code.description}</p>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => onToggle(code.id, code.isActive)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all',
              code.isActive && !isExpired
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
            )}
          >
            {code.isActive && !isExpired
              ? <><ToggleRight className="w-3.5 h-3.5" /> {copy.active}</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> {isExpired ? copy.expired : copy.disabled}</>}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> {copy.used}</p>
            <p className="font-black text-gray-900 text-lg">{code.currentUsage}</p>
            {code.maxUsage && <p className="text-[10px] text-gray-400">{copy.from} {code.maxUsage}</p>}
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Infinity className="w-3 h-3" /> {copy.available}</p>
            <p className="font-black text-gray-900 text-lg">
              {code.maxUsage ? Math.max(0, code.maxUsage - code.currentUsage) : '∞'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-400 font-bold mb-1 flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> {copy.ends}</p>
            <p className="font-black text-gray-900 text-xs leading-tight">
              {expDate ? expDate.toLocaleDateString({ ar: 'ar-EG', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' }[locale], { day: '2-digit', month: 'short' }) : copy.open}
            </p>
          </div>
        </div>

        {/* Progress bar (if maxUsage set) */}
        {code.maxUsage && code.maxUsage > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>{code.currentUsage} {copy.user}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-indigo-500')}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Expand for invite link */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-between w-full text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors pt-1"
        >
          <span className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> {copy.inviteLink}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-3">
                <p className="flex-1 text-xs text-gray-600 font-mono truncate">{code.inviteLink}</p>
                <button
                  onClick={() => copyToClipboard(code.inviteLink, 'link')}
                  className={cn('p-1.5 rounded-lg flex-shrink-0 transition-colors',
                    copiedLink ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-white text-gray-400')}
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) navigator.share({ title: copy.inviteLink, url: code.inviteLink });
                    else copyToClipboard(code.inviteLink, 'link');
                  }}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Player Join Form ─────────────────────────────────────────────────────────

function PlayerJoinForm() {
  const { copy } = useInviteCopy();
  const { user, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<any>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const ref = await organizationReferralService.findReferralByCode(code.trim().toUpperCase());
      if (ref) {
        setFound(ref);
      } else {
        toast.error(copy.invalidCode);
        setFound(null);
      }
    } catch {
      toast.error(copy.error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!found || !user?.id || !userData) return;
    setLoading(true);
    try {
      await organizationReferralService.createJoinRequest(user.id, userData, code.trim().toUpperCase());
      toast.success(copy.joinSuccess.replace('{{name}}', found.organizationName));
      setCode('');
      setFound(null);
    } catch (e: any) {
      toast.error(e.message || copy.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 text-white text-center space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
          <QrCode className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black">{copy.enterCode}</h2>
        <p className="text-indigo-200 text-sm leading-relaxed">
          {copy.enterCodeSub}
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-700">{copy.codeLabel}</label>
        <div className="flex gap-3">
          <Input
            placeholder="CLB4A2X9"
            className="flex-1 h-14 rounded-2xl border-gray-200 text-center text-xl font-mono font-black tracking-widest uppercase"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setFound(null); }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            maxLength={9}
            style={{ fontSize: '18px', letterSpacing: '0.15em' }}
          />
          <Button
            className="h-14 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold"
            onClick={handleVerify}
            disabled={loading || !code.trim()}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : copy.verify}
          </Button>
        </div>
      </div>

      {/* Found result */}
      <AnimatePresence>
        {found && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                {found.organizationType === 'academy'
                  ? <GraduationCap className="w-7 h-7 text-emerald-600" />
                  : found.organizationType === 'trainer'
                  ? <Target className="w-7 h-7 text-emerald-600" />
                  : found.organizationType === 'agent'
                  ? <Briefcase className="w-7 h-7 text-emerald-600" />
                  : <Building className="w-7 h-7 text-emerald-600" />}
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg">{found.organizationName}</p>
                <p className="text-sm text-emerald-600 font-bold">{copy.types[['club','academy','trainer','agent','marketer','player'].indexOf(found.organizationType)] || found.organizationType}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 ml-auto flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 bg-white/70 rounded-2xl p-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{found.currentUsage} {copy.playersJoined}</span>
            </div>
            <Button
              className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base"
              onClick={handleJoin}
              disabled={loading}
            >
              {loading
                ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{copy.sending}</span>
                : <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />{copy.sendJoin}</span>}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <div className="space-y-3">
        <p className="text-sm font-black text-gray-700">{copy.howWorks}</p>
        {[
          { icon: QrCode, label: copy.steps[0], color: 'bg-indigo-50 text-indigo-600' },
          { icon: CheckCircle2, label: copy.steps[1], color: 'bg-emerald-50 text-emerald-600' },
          { icon: Clock, label: copy.steps[2], color: 'bg-amber-50 text-amber-600' },
          { icon: Gift, label: copy.steps[3], color: 'bg-purple-50 text-purple-600' },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', step.color)}>
              <step.icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-gray-700 font-medium">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InviteCodePage() {
  const { copy, isRTL } = useInviteCopy();
  const params = useParams();
  const accountType = (params?.accountType as string) || 'player';
  const { user, userData } = useAuth();

  const isOrg = isOrgAccount(accountType);
  const OrgIcon = TYPE_ICONS[accountType] || Building;

  const [codes, setCodes] = useState<OrganizationReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const orgName = getOrgName(userData, accountType);

  const loadCodes = useCallback(async () => {
    if (!user?.id || !isOrg) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await organizationReferralService.getOrganizationReferrals(user.id);
      setCodes(list);
    } catch {
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOrg, copy.loadError]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await organizationReferralService.updateOrganizationReferral(id, user!.id, { isActive: !currentActive });
      setCodes(prev => prev.map(c => c.id === id ? { ...c, isActive: !currentActive } : c));
      toast.success(!currentActive ? copy.enabled : copy.disabledToast);
    } catch {
      toast.error(copy.error);
    }
  };

  const activeCount = codes.filter(c => c.isActive).length;
  const totalUsage = codes.reduce((s, c) => s + c.currentUsage, 0);

  // ─── Player View ───────────────────────────────────────────────────────────
  if (!isOrg) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <header className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{copy.playerTitle}</h1>
            <p className="text-sm text-gray-500">{copy.playerSub}</p>
          </div>
        </header>
        <PlayerJoinForm />
      </div>
    );
  }

  // ─── Org View ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <OrgIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{copy.orgTitle}</h1>
            <p className="text-sm text-gray-500">{copy.orgSub}</p>
          </div>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 h-11 font-bold shadow-lg shadow-indigo-100 flex-shrink-0"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 ml-1.5" />
          {copy.newCode}
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: copy.totalCodes, value: codes.length, icon: QrCode, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: copy.activeCodes, value: activeCount, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: copy.totalJoins, value: totalUsage, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Code List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-300 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <p className="font-black text-gray-700 text-lg">{copy.noCodes}</p>
            <p className="text-sm text-gray-400 mt-1">{copy.noCodesSub}</p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 font-bold"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 ml-2" /> {copy.createFirst}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map(code => (
            <CodeCard key={code.id} code={code} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Create Sheet */}
      <AnimatePresence>
        {showCreate && user?.id && orgName && (
          <CreateSheet
            onClose={() => setShowCreate(false)}
            onCreated={loadCodes}
            organizationId={user.id}
            organizationType={accountType}
            organizationName={orgName}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
