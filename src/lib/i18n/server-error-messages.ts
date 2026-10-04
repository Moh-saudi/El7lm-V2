import { NextRequest, NextResponse } from 'next/server';

export type MessageKey =
  | 'otpTemplateRejected'
  | 'otpDeliveryNotConfigured'
  | 'accountNotFoundRegisterFirst'
  | 'accountAlreadyExistsLogin'
  | 'accountTypeMismatch'
  | 'tooManyRequests'
  | 'serviceUnavailable'
  | 'accountLookupUnavailable';

export type SupportedLocale = 'ar' | 'en' | 'fr' | 'es' | 'pt';

export const DEFAULT_LOCALE: SupportedLocale = 'ar';

export const SERVER_MESSAGES: Record<SupportedLocale, Record<MessageKey, string>> = {
  ar: {
    otpTemplateRejected: 'لم نتمكن من إرسال رمز التحقق عبر واتساب في الوقت الحالي. يرجى المحاولة بعد قليل، وإذا استمرت المشكلة تواصل مع الدعم.',
    otpDeliveryNotConfigured: 'خدمة رمز التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم.',
    accountNotFoundRegisterFirst: 'لم نعثر على حساب بهذا الرقم. يمكنك إنشاء حساب جديد للبدء.',
    accountAlreadyExistsLogin: 'هذا الرقم مسجّل لدينا بالفعل. سجّل الدخول للمتابعة.',
    accountTypeMismatch: 'هذا الرقم مرتبط بنوع حساب مختلف. يرجى اختيار نوع الحساب المناسب للمتابعة.',
    tooManyRequests: 'لحماية حسابك، أوقفنا المحاولات مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
    serviceUnavailable: 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة بعد قليل.',
    accountLookupUnavailable: 'يرجى المحاولة بعد لحظات أو التأكد من اتصال الإنترنت.',
  },
  en: {
    otpTemplateRejected: "We couldn't send the verification code via WhatsApp right now. Please try again shortly, and contact Support if the problem continues.",
    otpDeliveryNotConfigured: 'The verification service is currently unavailable. Please try again later or contact Support.',
    accountNotFoundRegisterFirst: "We couldn't find an account with this number. You can create a new account to get started.",
    accountAlreadyExistsLogin: 'This number is already registered. Log in to continue.',
    accountTypeMismatch: 'This number is linked to a different account type. Please select the right account type to continue.',
    tooManyRequests: "To protect your account, we've temporarily paused attempts. Please wait a moment and try again.",
    serviceUnavailable: 'This service is temporarily unavailable. Please try again shortly.',
    accountLookupUnavailable: 'Please try again in a few moments or check your internet connection.',
  },
  fr: {
    otpTemplateRejected: "Nous n'avons pas pu envoyer le code de vérification via WhatsApp pour le moment. Veuillez réessayer dans quelques instants ou contacter l'assistance si le problème persiste.",
    otpDeliveryNotConfigured: "Le service de vérification est actuellement indisponible. Veuillez réessayer plus tard ou contacter l'assistance.",
    accountNotFoundRegisterFirst: "Aucun compte n'est associé à ce numéro. Vous pouvez créer un compte pour commencer.",
    accountAlreadyExistsLogin: 'Ce numéro est déjà enregistré. Connectez-vous pour continuer.',
    accountTypeMismatch: 'Ce numéro est associé à un autre type de compte. Veuillez sélectionner le type de compte approprié pour continuer.',
    tooManyRequests: 'Pour protéger votre compte, nous avons temporairement suspendu les tentatives. Veuillez patienter un instant, puis réessayer.',
    serviceUnavailable: 'Ce service est temporairement indisponible. Veuillez réessayer dans quelques instants.',
    accountLookupUnavailable: 'Veuillez réessayer dans un instant ou vérifier votre connexion Internet.',
  },
  es: {
    otpTemplateRejected: 'No pudimos enviar el código de verificación por WhatsApp en este momento. Inténtalo de nuevo en unos momentos o contacta con soporte si el problema continúa.',
    otpDeliveryNotConfigured: 'El servicio de verificación no está disponible en este momento. Inténtalo más tarde o contacta con soporte.',
    accountNotFoundRegisterFirst: 'No encontramos ninguna cuenta con este número. Puedes crear una cuenta nueva para empezar.',
    accountAlreadyExistsLogin: 'Este número ya está registrado. Inicia sesión para continuar.',
    accountTypeMismatch: 'Este número está vinculado a otro tipo de cuenta. Selecciona el tipo de cuenta correcto para continuar.',
    tooManyRequests: 'Para proteger tu cuenta, hemos pausado los intentos temporalmente. Espera un momento e inténtalo de nuevo.',
    serviceUnavailable: 'El servicio no está disponible temporalmente. Inténtalo de nuevo en unos momentos.',
    accountLookupUnavailable: 'Inténtalo de nuevo en unos momentos o comprueba tu conexión a internet.',
  },
  pt: {
    otpTemplateRejected: 'Não foi possível enviar o código de verificação pelo WhatsApp agora. Tente novamente em instantes ou entre em contato com o suporte se o problema continuar.',
    otpDeliveryNotConfigured: 'O serviço de verificação está indisponível no momento. Tente novamente mais tarde ou entre em contato com o suporte.',
    accountNotFoundRegisterFirst: 'Não encontramos uma conta com este número. Você pode criar uma nova conta para começar.',
    accountAlreadyExistsLogin: 'Este número já está cadastrado. Faça login para continuar.',
    accountTypeMismatch: 'Este número está vinculado a outro tipo de conta. Selecione o tipo de conta correto para continuar.',
    tooManyRequests: 'Para proteger sua conta, pausamos as tentativas temporariamente. Aguarde um momento e tente novamente.',
    serviceUnavailable: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
    accountLookupUnavailable: 'Tente novamente em instantes ou verifique sua conexão com a internet.',
  },
};

export function resolveLocaleFromRequest(req: NextRequest | Request): SupportedLocale {
  const customLocale = req.headers.get('x-app-locale')?.trim().toLowerCase();
  if (customLocale) {
    const code = customLocale.split('-')[0].split('_')[0] as SupportedLocale;
    if (code in SERVER_MESSAGES) {
      return code;
    }
  }

  const acceptLang = req.headers.get('accept-language')?.toLowerCase();
  if (acceptLang) {
    const segments = acceptLang.split(',').map((s) => s.trim().split(';')[0]);
    for (const seg of segments) {
      const code = seg.split('-')[0] as SupportedLocale;
      if (code in SERVER_MESSAGES) {
        return code;
      }
    }
  }

  return DEFAULT_LOCALE;
}

export function getServerErrorMessage(
  req: NextRequest | Request,
  key: MessageKey,
): string {
  const locale = resolveLocaleFromRequest(req);
  return SERVER_MESSAGES[locale]?.[key] ?? SERVER_MESSAGES[DEFAULT_LOCALE][key];
}

export function createServerErrorResponse(
  req: NextRequest | Request,
  key: MessageKey,
  status: number,
  extra: Record<string, unknown> = {},
): NextResponse {
  const text = getServerErrorMessage(req, key);
  return NextResponse.json(
    {
      success: false,
      code: key,
      message: text,
      error: text,
      ...extra,
    },
    { status },
  );
}
