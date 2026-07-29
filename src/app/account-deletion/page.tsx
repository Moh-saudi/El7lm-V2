'use client';

import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout.jsx';
import { useTranslation } from '@/lib/i18n';

type PageContent = {
  title: string;
  subtitle: string;
  requestTitle: string;
  steps: string[];
  emailButton: string;
  emailNote: string;
  deletedTitle: string;
  deletedItems: string[];
  retainedTitle: string;
  retainedItems: string[];
  timingTitle: string;
  timingText: string;
  cancelTitle: string;
  cancelText: string;
  contactTitle: string;
  contactText: string;
  privacyLink: string;
};

const content: Record<'ar' | 'en' | 'es' | 'pt', PageContent> = {
  ar: {
    title: 'طلب حذف حساب منصة الحلم',
    subtitle: 'يمكن لجميع مستخدمي El7lm Platform طلب حذف حساباتهم والبيانات المرتبطة بها نهائياً.',
    requestTitle: 'كيفية طلب حذف الحساب',
    steps: [
      'أرسل رسالة من البريد الإلكتروني المرتبط بحسابك إلى info@el7lm.com بعنوان: طلب حذف حساب El7lm.',
      'اذكر في الرسالة الاسم الكامل، رقم الهاتف المسجل بصيغته الدولية، ونوع الحساب.',
      'أكّد بوضوح أنك تريد حذف الحساب وجميع البيانات المرتبطة به.',
      'قد نطلب رمز تحقق لمرة واحدة أو معلومات محدودة للتأكد من ملكيتك للحساب قبل تنفيذ الحذف.',
    ],
    emailButton: 'إرسال طلب حذف الحساب',
    emailNote: 'إذا لم يكن للحساب بريد إلكتروني، يمكنك مراسلتنا من أي بريد متاح مع ذكر رقم الهاتف المسجل.',
    deletedTitle: 'البيانات التي يتم حذفها',
    deletedItems: [
      'الحساب وبيانات تسجيل الدخول ومعرّفات المصادقة المرتبطة به.',
      'الملف الشخصي وبيانات التواصل والبيانات الرياضية والتعليمية.',
      'الصور ومقاطع الفيديو والمستندات التي رفعها المستخدم.',
      'المفضلة والعناصر المحفوظة وسجل نشاط الحساب المرتبط مباشرة بالمستخدم.',
    ],
    retainedTitle: 'البيانات التي قد نحتفظ بها',
    retainedItems: [
      'السجلات المالية والفواتير والسجلات المطلوبة قانونياً لمدة تصل إلى 5 سنوات، أو للمدة التي يفرضها القانون المعمول به.',
      'سجلات الأمان ومكافحة الاحتيال والدعم لمدة لا تتجاوز 90 يوماً، ما لم يلزم القانون بمدة أطول.',
      'قد تبقى نسخة مشفرة في النسخ الاحتياطية لمدة تصل إلى 90 يوماً قبل استبدالها تلقائياً.',
      'قد نحتفظ بإحصاءات مجهولة الهوية لا يمكن ربطها بحسابك.',
    ],
    timingTitle: 'مدة تنفيذ الطلب',
    timingText: 'نراجع الطلب ونبدأ تنفيذه بعد التحقق من ملكية الحساب. يكتمل حذف البيانات النشطة عادةً خلال 30 يوماً.',
    cancelTitle: 'إلغاء طلب الحذف',
    cancelText: 'يمكنك طلب إلغاء الحذف قبل اكتماله عن طريق الرد على رسالة التأكيد. بعد اكتمال الحذف لا يمكن استعادة الحساب أو المحتوى.',
    contactTitle: 'هل تحتاج إلى مساعدة؟',
    contactText: 'لأي استفسار عن حذف الحساب أو البيانات، تواصل معنا عبر info@el7lm.com.',
    privacyLink: 'قراءة سياسة الخصوصية',
  },
  en: {
    title: 'Delete Your El7lm Platform Account',
    subtitle: 'All El7lm Platform users can request permanent deletion of their account and associated data.',
    requestTitle: 'How to request account deletion',
    steps: [
      'Email info@el7lm.com from the email address associated with your account. Use the subject: El7lm Account Deletion Request.',
      'Include your full name, registered phone number in international format, and account type.',
      'Clearly confirm that you want your account and all associated data deleted.',
      'We may request a one-time verification code or limited information to verify account ownership before deletion.',
    ],
    emailButton: 'Request account deletion',
    emailNote: 'If your account has no email address, contact us from any available email address and include the registered phone number.',
    deletedTitle: 'Data that will be deleted',
    deletedItems: [
      'Your account, login data, and associated authentication identifiers.',
      'Your profile, contact details, sports information, and education information.',
      'Photos, videos, and documents uploaded by you.',
      'Favorites, saved items, and account activity directly associated with you.',
    ],
    retainedTitle: 'Data we may retain',
    retainedItems: [
      'Financial records, invoices, and legally required records for up to 5 years, or longer when required by applicable law.',
      'Security, fraud-prevention, and support records for up to 90 days, unless a longer period is legally required.',
      'Encrypted copies may remain in backups for up to 90 days before automatic replacement.',
      'We may retain anonymous statistics that can no longer be linked to your account.',
    ],
    timingTitle: 'Deletion timeframe',
    timingText: 'We review the request after verifying account ownership. Active account data is normally deleted within 30 days.',
    cancelTitle: 'Canceling a deletion request',
    cancelText: 'You may cancel before deletion is completed by replying to the confirmation email. Once completed, the account and its content cannot be restored.',
    contactTitle: 'Need help?',
    contactText: 'For questions about account or data deletion, contact info@el7lm.com.',
    privacyLink: 'Read our Privacy Policy',
  },
  es: {
    title: 'Eliminar tu cuenta de El7lm Platform',
    subtitle: 'Todos los usuarios de El7lm Platform pueden solicitar la eliminación permanente de su cuenta y los datos asociados.',
    requestTitle: 'Cómo solicitar la eliminación de la cuenta',
    steps: [
      'Envía un correo a info@el7lm.com desde el correo asociado a tu cuenta con el asunto: Solicitud de eliminación de cuenta El7lm.',
      'Incluye tu nombre completo, número de teléfono registrado en formato internacional y tipo de cuenta.',
      'Confirma claramente que deseas eliminar la cuenta y todos los datos asociados.',
      'Podemos solicitar un código de verificación de un solo uso o información limitada para verificar que eres titular de la cuenta.',
    ],
    emailButton: 'Solicitar eliminación de la cuenta',
    emailNote: 'Si tu cuenta no tiene correo, escríbenos desde cualquier correo disponible e incluye el número de teléfono registrado.',
    deletedTitle: 'Datos que se eliminarán',
    deletedItems: [
      'La cuenta, los datos de acceso y los identificadores de autenticación asociados.',
      'El perfil, los datos de contacto y la información deportiva y educativa.',
      'Las fotos, los vídeos y los documentos que hayas subido.',
      'Los favoritos, los elementos guardados y la actividad vinculada directamente a tu cuenta.',
    ],
    retainedTitle: 'Datos que podemos conservar',
    retainedItems: [
      'Registros financieros, facturas y registros exigidos por ley hasta 5 años, o más si lo exige la legislación aplicable.',
      'Registros de seguridad, prevención del fraude y soporte hasta 90 días, salvo obligación legal de conservarlos por más tiempo.',
      'Las copias cifradas pueden permanecer en respaldos hasta 90 días antes de su sustitución automática.',
      'Podemos conservar estadísticas anónimas que ya no puedan vincularse a tu cuenta.',
    ],
    timingTitle: 'Plazo de eliminación',
    timingText: 'Revisamos la solicitud tras verificar la titularidad. Los datos activos normalmente se eliminan en un plazo de 30 días.',
    cancelTitle: 'Cancelar una solicitud',
    cancelText: 'Puedes cancelar antes de que termine el proceso respondiendo al correo de confirmación. Después, la cuenta y su contenido no podrán recuperarse.',
    contactTitle: '¿Necesitas ayuda?',
    contactText: 'Para consultas sobre la eliminación de cuentas o datos, contacta con info@el7lm.com.',
    privacyLink: 'Leer la Política de Privacidad',
  },
  pt: {
    title: 'Eliminar a sua conta da El7lm Platform',
    subtitle: 'Todos os utilizadores da El7lm Platform podem solicitar a eliminação permanente da conta e dos dados associados.',
    requestTitle: 'Como solicitar a eliminação da conta',
    steps: [
      'Envie um email para info@el7lm.com a partir do endereço associado à conta com o assunto: Pedido de eliminação da conta El7lm.',
      'Inclua o nome completo, o número de telefone registado em formato internacional e o tipo de conta.',
      'Confirme claramente que pretende eliminar a conta e todos os dados associados.',
      'Podemos solicitar um código de verificação único ou informações limitadas para confirmar a titularidade da conta.',
    ],
    emailButton: 'Solicitar eliminação da conta',
    emailNote: 'Se a conta não tiver email, contacte-nos a partir de qualquer endereço disponível e indique o número de telefone registado.',
    deletedTitle: 'Dados que serão eliminados',
    deletedItems: [
      'A conta, os dados de acesso e os identificadores de autenticação associados.',
      'O perfil, os dados de contacto e as informações desportivas e educativas.',
      'Fotografias, vídeos e documentos carregados pelo utilizador.',
      'Favoritos, itens guardados e atividade diretamente associada à conta.',
    ],
    retainedTitle: 'Dados que podemos conservar',
    retainedItems: [
      'Registos financeiros, faturas e registos legalmente exigidos até 5 anos, ou por mais tempo quando exigido pela lei aplicável.',
      'Registos de segurança, prevenção de fraude e suporte até 90 dias, salvo obrigação legal de conservação mais longa.',
      'Cópias encriptadas podem permanecer em backups até 90 dias antes da substituição automática.',
      'Podemos conservar estatísticas anónimas que já não possam ser associadas à conta.',
    ],
    timingTitle: 'Prazo de eliminação',
    timingText: 'Analisamos o pedido após verificar a titularidade. Os dados ativos são normalmente eliminados no prazo de 30 dias.',
    cancelTitle: 'Cancelar um pedido',
    cancelText: 'Pode cancelar antes da conclusão respondendo ao email de confirmação. Depois disso, a conta e o conteúdo não poderão ser recuperados.',
    contactTitle: 'Precisa de ajuda?',
    contactText: 'Para questões sobre eliminação de contas ou dados, contacte info@el7lm.com.',
    privacyLink: 'Ler a Política de Privacidade',
  },
};

export default function AccountDeletionPage() {
  const { locale, isRTL } = useTranslation();
  const language = locale === 'ar' || locale === 'es' || locale === 'pt'
    ? locale
    : 'en';
  const copy = content[language];

  return (
    <PublicLayout>
      <main className="min-h-screen bg-gray-50 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-10">
            <header className="mb-10 border-b border-gray-200 pb-8 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-700">
                El7lm Platform
              </p>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{copy.title}</h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-600">
                {copy.subtitle}
              </p>
            </header>

            <div className="space-y-10">
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-gray-900">{copy.requestTitle}</h2>
                <ol className="list-decimal space-y-3 ps-6 text-gray-700">
                  {copy.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <a
                  href="mailto:info@el7lm.com?subject=El7lm%20Account%20Deletion%20Request"
                  className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
                >
                  {copy.emailButton}
                </a>
                <p className="mt-3 text-sm text-gray-500">{copy.emailNote}</p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-gray-900">{copy.deletedTitle}</h2>
                <ul className="list-disc space-y-2 ps-6 text-gray-700">
                  {copy.deletedItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-gray-900">{copy.retainedTitle}</h2>
                <ul className="list-disc space-y-2 ps-6 text-gray-700">
                  {copy.retainedItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">{copy.timingTitle}</h2>
                <p className="leading-7 text-gray-700">{copy.timingText}</p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">{copy.cancelTitle}</h2>
                <p className="leading-7 text-gray-700">{copy.cancelText}</p>
              </section>

              <section className="rounded-xl bg-blue-50 p-6">
                <h2 className="mb-3 text-xl font-semibold text-gray-900">{copy.contactTitle}</h2>
                <p className="text-gray-700">{copy.contactText}</p>
                <Link href="/privacy" className="mt-3 inline-block font-semibold text-blue-700 hover:underline">
                  {copy.privacyLink}
                </Link>
              </section>
            </div>
          </div>
        </article>
      </main>
    </PublicLayout>
  );
}
