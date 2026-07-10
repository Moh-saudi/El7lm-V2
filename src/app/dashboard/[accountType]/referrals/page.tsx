'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useParams, useRouter } from 'next/navigation';
import { referralService } from '@/lib/referral/referral-service';
import { POINTS_CONVERSION, BADGES } from '@/types/referral';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { getOrganizationDetails } from '@/utils/player-organization';
import { OrganizationReferral, PlayerJoinRequest } from '@/types/organization-referral';
import {
    ConfigProvider, Card, Button, Input, Tag, Switch, Tabs, Space, Typography,
    Row, Col, Progress, Tooltip, Empty, Spin, Modal, Form, Table, Badge as AntBadge
} from 'antd';
import {
    TrophyOutlined, UserOutlined, CopyOutlined, ShareAltOutlined, QrcodeOutlined,
    TeamOutlined, DollarOutlined, RiseOutlined, GiftOutlined, ClockCircleOutlined,
    CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined, PlusOutlined,
    SearchOutlined, LinkOutlined, SafetyOutlined, FileTextOutlined, ExportOutlined
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import enUS from 'antd/locale/en_US';
import esES from 'antd/locale/es_ES';
import ptPT from 'antd/locale/pt_PT';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

const { Title, Text, Paragraph } = Typography;

const ANTD_THEME = {
    token: { colorPrimary: '#6366f1', borderRadius: 8, fontFamily: 'inherit' },
};

const REFERRALS_COPY = {
    ar: {
        accountTypes: {
            player: { title: 'سفراء الحلم', subtitle: 'برنامج سفراء المنصة والمكافآت', referralLabel: 'اللاعبين المحالين', typeLabel: 'لاعب' },
            club: { title: 'سفراء الحلم - الأندية', subtitle: 'إدارة الانتساب والنمو الرياضي', referralLabel: 'اللاعبين المنتسبين', typeLabel: 'نادي' },
            academy: { title: 'سفراء الحلم - الأكاديميات', subtitle: 'إدارة المواهب والانتساب', referralLabel: 'المواهب المسجلة', typeLabel: 'أكاديمية' },
            trainer: { title: 'سفراء الحلم - المدربين', subtitle: 'برنامج المدرب السفير والمكافآت', referralLabel: 'المتدربين المحالين', typeLabel: 'مدرب' },
            agent: { title: 'سفراء الحلم - الوكلاء', subtitle: 'إدارة شبكة اللاعبين والمكافآت', referralLabel: 'اللاعبين المحالين', typeLabel: 'وكيل' },
            defaultTypeLabel: 'منظمة',
        },
        toast: {
            invalidJoinCode: 'كود الانضمام غير صحيح أو منتهي الصلاحية',
            joinSent: 'تم إرسال طلب الانضمام إلى {{name}} بنجاح!',
            joinError: 'حدث خطأ أثناء الانضمام',
            createCodeSuccess: 'تم إنشاء كود إحالة سفير بنجاح',
            createCodeError: 'فشل في إنشاء الكود',
            codeDisabled: 'تم تعطيل الكود',
            codeEnabled: 'تم تفعيل الكود',
            genericError: 'حدث خطأ',
            requestApproved: 'تم قبول انضمام اللاعب',
            requestRejected: 'تم رفض الطلب',
            requestProcessError: 'تعذر معالجة الطلب',
            codeCopied: 'تم نسخ كود الإحالة',
        },
        whatsapp: {
            organization: 'انضم إلى *{{type}} {{name}}* على منصة الحلم!\nكود الانضمام: *{{code}}*\nسجل الآن: https://el7lm.com/auth/register',
            personal: 'انضم لمنصة الحلم وسجل مهاراتك الرياضية!\nكودي الخاص: *{{code}}*\nالرابط: https://el7lm.com',
        },
        table: {
            ambassadorDesc: 'اسم السفير / الوصف',
            unnamedCode: 'كود سفير غير مسمى',
            referralCode: 'كود الإحالة',
            copy: 'نسخ',
            usage: 'الاستخدام',
            status: 'الحالة',
            active: 'نشط',
            disabled: 'معطل',
            actions: 'إجراءات',
            shareWhatsapp: 'مشاركة واتساب',
            player: 'اللاعب',
            position: 'المركز',
            unknownPosition: 'غير محدد',
            requestDate: 'تاريخ الطلب',
            approved: 'مقبول',
            pending: 'قيد المراجعة',
            rejected: 'مرفوض',
            approve: 'قبول',
            reject: 'رفض',
            details: 'التفاصيل',
        },
        ui: {
            eliteProgram: 'برنامج النخبة',
            headerSuffix: 'قم بدعوة المواهب وابنِ فريقك واكسب مكافآت حصرية.',
            egp: 'ج.م',
            withdraw: 'طلب سحب الأرباح',
            joinOrganizationTitle: 'الانضمام إلى مؤسسة رياضية',
            joinOrganizationDesc: 'هل لديك كود دعوة من نادٍ أو أكاديمية؟ أدخله هنا للانضمام فوراً.',
            joinCodePlaceholder: 'أدخل كود الانضمام (مثال: ACD-X92F)',
            join: 'انضمام',
            availablePoints: 'النقاط المتاحة',
            newRequests: 'طلبات جديدة',
            spreadLevel: 'مستوى الانتشار',
            overview: 'نظرة عامة',
            personalReferralCode: 'كود الإحالة الشخصي',
            personalReferralDesc: 'شارك كودك مع اللاعبين واكسب 10,000 نقطة عن كل اشتراك جديد.',
            hideQr: 'إخفاء QR',
            showQr: 'عرض QR',
            qrCodeLabel: 'رمز QR',
            qrScan: 'امسح الكود للتسجيل فوراً',
            cashConversion: 'تحويل النقاط إلى كاش',
            cashConversionDesc: 'عند وصول رصيدك إلى الحد الأدنى (50,000 نقطة)، يمكنك تحويلها مباشرة إلى رصيد مالي.',
            withdrawProgress: 'التقدم نحو السحب',
            badgesPath: 'المسار والشارات',
            howToEarn: 'كيفية الربح؟',
            directReferral: 'الإحالة المباشرة',
            signupBonus: 'مكافأة التسجيل',
            annualEarning: 'الربح السنوي',
            pointsUnit: '{{points}} نقطة',
            organizationCodes: 'أكواد المنظمة',
            codeNamePlaceholder: 'اسم السفير أو الحملة (مثال: كابتن أحمد - حملة الصيف)',
            createCode: 'إنشاء كود',
            noCodes: 'لا توجد أكواد حالياً',
            joinRequests: 'طلبات الانضمام',
            search: 'بحث...',
            noRequests: 'لا توجد طلبات',
            registeredPlayers: 'اللاعبين المسجلين',
            noAcceptedPlayers: 'لم يتم قبول أي لاعبين بعد',
            verifiedPlayer: 'لاعب مثبت',
            memberSince: 'عضو منذ',
            viewProfile: 'عرض الملف',
            tips: [
                { title: 'توسيع الشبكة', desc: 'كلما شاركت كودك في مجموعات رياضية متخصصة، زادت فرصك في استقطاب مواهب حقيقية.', emoji: '🌐' },
                { title: 'الأمان والخصوصية', desc: 'نظام إحالة الحلم مشفر بالكامل ويضمن وصول المكافآت لمستحقيها بآلية دقيقة.', emoji: '🔒' },
                { title: 'قواعد المكافآت', desc: 'تخضع المكافآت لشروط الاستخدام، ويتم تدقيق كل حالة انضمام لضمان الجودة.', emoji: '📋' },
            ],
        },
    },
    en: {
        accountTypes: {
            player: { title: 'Dream Ambassadors', subtitle: 'Platform ambassador and rewards program', referralLabel: 'Referred players', typeLabel: 'Player' },
            club: { title: 'Dream Ambassadors - Clubs', subtitle: 'Manage affiliation and sports growth', referralLabel: 'Affiliated players', typeLabel: 'Club' },
            academy: { title: 'Dream Ambassadors - Academies', subtitle: 'Manage talent and affiliation', referralLabel: 'Registered talents', typeLabel: 'Academy' },
            trainer: { title: 'Dream Ambassadors - Trainers', subtitle: 'Trainer ambassador and rewards program', referralLabel: 'Referred trainees', typeLabel: 'Trainer' },
            agent: { title: 'Dream Ambassadors - Agents', subtitle: 'Manage player networks and rewards', referralLabel: 'Referred players', typeLabel: 'Agent' },
            defaultTypeLabel: 'Organization',
        },
        toast: {
            invalidJoinCode: 'The join code is invalid or expired',
            joinSent: 'Join request sent to {{name}} successfully!',
            joinError: 'An error occurred while joining',
            createCodeSuccess: 'Ambassador referral code created successfully',
            createCodeError: 'Failed to create the code',
            codeDisabled: 'Code disabled',
            codeEnabled: 'Code enabled',
            genericError: 'Something went wrong',
            requestApproved: 'Player join request approved',
            requestRejected: 'Request rejected',
            requestProcessError: 'Unable to process the request',
            codeCopied: 'Referral code copied',
        },
        whatsapp: {
            organization: 'Join *{{type}} {{name}}* on El7lm platform!\nJoin code: *{{code}}*\nRegister now: https://el7lm.com/auth/register',
            personal: 'Join El7lm and register your sports skills!\nMy code: *{{code}}*\nLink: https://el7lm.com',
        },
        table: {
            ambassadorDesc: 'Ambassador name / description',
            unnamedCode: 'Unnamed ambassador code',
            referralCode: 'Referral code',
            copy: 'Copy',
            usage: 'Usage',
            status: 'Status',
            active: 'Active',
            disabled: 'Disabled',
            actions: 'Actions',
            shareWhatsapp: 'Share on WhatsApp',
            player: 'Player',
            position: 'Position',
            unknownPosition: 'Not specified',
            requestDate: 'Request date',
            approved: 'Approved',
            pending: 'Under review',
            rejected: 'Rejected',
            approve: 'Approve',
            reject: 'Reject',
            details: 'Details',
        },
        ui: {
            eliteProgram: 'Elite program',
            headerSuffix: 'Invite talents, build your team, and earn exclusive rewards.',
            egp: 'EGP',
            withdraw: 'Request withdrawal',
            joinOrganizationTitle: 'Join a sports organization',
            joinOrganizationDesc: 'Have an invitation code from a club or academy? Enter it here to join instantly.',
            joinCodePlaceholder: 'Enter join code (e.g. ACD-X92F)',
            join: 'Join',
            availablePoints: 'Available points',
            newRequests: 'New requests',
            spreadLevel: 'Reach level',
            overview: 'Overview',
            personalReferralCode: 'Personal referral code',
            personalReferralDesc: 'Share your code with players and earn 10,000 points for each new subscription.',
            hideQr: 'Hide QR',
            showQr: 'Show QR',
            qrCodeLabel: 'QR code',
            qrScan: 'Scan the code to register instantly',
            cashConversion: 'Convert points to cash',
            cashConversionDesc: 'When your balance reaches the minimum threshold (50,000 points), you can convert it directly to cash balance.',
            withdrawProgress: 'Withdrawal progress',
            badgesPath: 'Path and badges',
            howToEarn: 'How to earn?',
            directReferral: 'Direct referral',
            signupBonus: 'Registration bonus',
            annualEarning: 'Annual earning',
            pointsUnit: '{{points}} points',
            organizationCodes: 'Organization codes',
            codeNamePlaceholder: 'Ambassador or campaign name (e.g. Captain Ahmed - Summer campaign)',
            createCode: 'Create code',
            noCodes: 'No codes yet',
            joinRequests: 'Join requests',
            search: 'Search...',
            noRequests: 'No requests',
            registeredPlayers: 'Registered players',
            noAcceptedPlayers: 'No players have been accepted yet',
            verifiedPlayer: 'Verified player',
            memberSince: 'Member since',
            viewProfile: 'View profile',
            tips: [
                { title: 'Expand your network', desc: 'Sharing your code in focused sports communities increases your chances of attracting real talent.', emoji: '🌐' },
                { title: 'Security and privacy', desc: 'El7lm referral system is fully encrypted and ensures rewards reach the right owners accurately.', emoji: '🔒' },
                { title: 'Reward rules', desc: 'Rewards are subject to the terms of use, and each join case is reviewed to maintain quality.', emoji: '📋' },
            ],
        },
    },
    es: {},
    pt: {},
};

const interpolate = (template: string, values: Record<string, string | number> = {}) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));

const getReferralCopy = (locale: string) => {
    const base = REFERRALS_COPY.en;
    const selected = (REFERRALS_COPY as any)[locale] || base;
    return {
        ...base,
        ...selected,
        accountTypes: { ...base.accountTypes, ...selected.accountTypes },
        toast: { ...base.toast, ...selected.toast },
        whatsapp: { ...base.whatsapp, ...selected.whatsapp },
        table: { ...base.table, ...selected.table },
        ui: { ...base.ui, ...selected.ui },
    };
};

(REFERRALS_COPY as any).es = {
    ...REFERRALS_COPY.en,
    accountTypes: {
        player: { title: 'Embajadores del Sueño', subtitle: 'Programa de embajadores y recompensas', referralLabel: 'Jugadores referidos', typeLabel: 'Jugador' },
        club: { title: 'Embajadores del Sueño - Clubes', subtitle: 'Gestión de afiliación y crecimiento deportivo', referralLabel: 'Jugadores afiliados', typeLabel: 'Club' },
        academy: { title: 'Embajadores del Sueño - Academias', subtitle: 'Gestión de talentos y afiliación', referralLabel: 'Talentos registrados', typeLabel: 'Academia' },
        trainer: { title: 'Embajadores del Sueño - Entrenadores', subtitle: 'Programa de entrenador embajador y recompensas', referralLabel: 'Aprendices referidos', typeLabel: 'Entrenador' },
        agent: { title: 'Embajadores del Sueño - Agentes', subtitle: 'Gestión de redes de jugadores y recompensas', referralLabel: 'Jugadores referidos', typeLabel: 'Agente' },
        defaultTypeLabel: 'Organización',
    },
    toast: {
        invalidJoinCode: 'El código de unión no es válido o ha expirado',
        joinSent: 'Solicitud de unión enviada a {{name}} correctamente.',
        joinError: 'Ocurrió un error al unirse',
        createCodeSuccess: 'Código de referido de embajador creado correctamente',
        createCodeError: 'No se pudo crear el código',
        codeDisabled: 'Código desactivado',
        codeEnabled: 'Código activado',
        genericError: 'Ocurrió un error',
        requestApproved: 'Solicitud de unión del jugador aprobada',
        requestRejected: 'Solicitud rechazada',
        requestProcessError: 'No se pudo procesar la solicitud',
        codeCopied: 'Código de referido copiado',
    },
    whatsapp: {
        organization: 'Únete a *{{type}} {{name}}* en la plataforma El7lm.\nCódigo de unión: *{{code}}*\nRegístrate ahora: https://el7lm.com/auth/register',
        personal: 'Únete a El7lm y registra tus habilidades deportivas.\nMi código: *{{code}}*\nEnlace: https://el7lm.com',
    },
    table: {
        ambassadorDesc: 'Nombre del embajador / descripción',
        unnamedCode: 'Código de embajador sin nombre',
        referralCode: 'Código de referido',
        copy: 'Copiar',
        usage: 'Uso',
        status: 'Estado',
        active: 'Activo',
        disabled: 'Desactivado',
        actions: 'Acciones',
        shareWhatsapp: 'Compartir por WhatsApp',
        player: 'Jugador',
        position: 'Posición',
        unknownPosition: 'No especificado',
        requestDate: 'Fecha de solicitud',
        approved: 'Aprobado',
        pending: 'En revisión',
        rejected: 'Rechazado',
        approve: 'Aprobar',
        reject: 'Rechazar',
        details: 'Detalles',
    },
    ui: {
        ...REFERRALS_COPY.en.ui,
        eliteProgram: 'Programa élite',
        headerSuffix: 'Invita talentos, construye tu equipo y gana recompensas exclusivas.',
        egp: 'EGP',
        withdraw: 'Solicitar retiro',
        joinOrganizationTitle: 'Unirse a una organización deportiva',
        joinOrganizationDesc: '¿Tienes un código de invitación de un club o academia? Introdúcelo aquí para unirte.',
        joinCodePlaceholder: 'Ingresa el código de unión (ej. ACD-X92F)',
        join: 'Unirse',
        availablePoints: 'Puntos disponibles',
        newRequests: 'Solicitudes nuevas',
        spreadLevel: 'Nivel de alcance',
        overview: 'Resumen',
        personalReferralCode: 'Código de referido personal',
        personalReferralDesc: 'Comparte tu código con jugadores y gana 10.000 puntos por cada nueva suscripción.',
        hideQr: 'Ocultar QR',
        showQr: 'Mostrar QR',
        qrCodeLabel: 'Código QR',
        qrScan: 'Escanea el código para registrarte al instante',
        cashConversion: 'Convertir puntos en efectivo',
        cashConversionDesc: 'Cuando tu saldo alcance el mínimo (50.000 puntos), podrás convertirlo directamente en saldo financiero.',
        withdrawProgress: 'Progreso de retiro',
        badgesPath: 'Ruta e insignias',
        howToEarn: '¿Cómo ganar?',
        directReferral: 'Referido directo',
        signupBonus: 'Bono de registro',
        annualEarning: 'Ganancia anual',
        pointsUnit: '{{points}} puntos',
        organizationCodes: 'Códigos de la organización',
        codeNamePlaceholder: 'Nombre del embajador o campaña (ej. Capitán Ahmed - campaña de verano)',
        createCode: 'Crear código',
        noCodes: 'No hay códigos aún',
        joinRequests: 'Solicitudes de unión',
        search: 'Buscar...',
        noRequests: 'No hay solicitudes',
        registeredPlayers: 'Jugadores registrados',
        noAcceptedPlayers: 'Aún no se ha aceptado ningún jugador',
        verifiedPlayer: 'Jugador verificado',
        memberSince: 'Miembro desde',
        viewProfile: 'Ver perfil',
        tips: [
            { title: 'Amplía tu red', desc: 'Compartir tu código en comunidades deportivas especializadas aumenta tus opciones de atraer talento real.', emoji: '🌐' },
            { title: 'Seguridad y privacidad', desc: 'El sistema de referidos de El7lm está cifrado y asegura que las recompensas lleguen a sus dueños.', emoji: '🔒' },
            { title: 'Reglas de recompensas', desc: 'Las recompensas están sujetas a los términos de uso y cada caso de unión se revisa para mantener la calidad.', emoji: '📋' },
        ],
    },
};

(REFERRALS_COPY as any).pt = {
    ...REFERRALS_COPY.en,
    accountTypes: {
        player: { title: 'Embaixadores do Sonho', subtitle: 'Programa de embaixadores e recompensas', referralLabel: 'Jogadores indicados', typeLabel: 'Jogador' },
        club: { title: 'Embaixadores do Sonho - Clubes', subtitle: 'Gestão de afiliação e crescimento esportivo', referralLabel: 'Jogadores afiliados', typeLabel: 'Clube' },
        academy: { title: 'Embaixadores do Sonho - Academias', subtitle: 'Gestão de talentos e afiliação', referralLabel: 'Talentos registrados', typeLabel: 'Academia' },
        trainer: { title: 'Embaixadores do Sonho - Treinadores', subtitle: 'Programa de treinador embaixador e recompensas', referralLabel: 'Treinandos indicados', typeLabel: 'Treinador' },
        agent: { title: 'Embaixadores do Sonho - Agentes', subtitle: 'Gestão de redes de jogadores e recompensas', referralLabel: 'Jogadores indicados', typeLabel: 'Agente' },
        defaultTypeLabel: 'Organização',
    },
    toast: {
        invalidJoinCode: 'O código de entrada é inválido ou expirou',
        joinSent: 'Solicitação de entrada enviada para {{name}} com sucesso.',
        joinError: 'Ocorreu um erro ao entrar',
        createCodeSuccess: 'Código de indicação de embaixador criado com sucesso',
        createCodeError: 'Falha ao criar o código',
        codeDisabled: 'Código desativado',
        codeEnabled: 'Código ativado',
        genericError: 'Ocorreu um erro',
        requestApproved: 'Solicitação de entrada do jogador aprovada',
        requestRejected: 'Solicitação recusada',
        requestProcessError: 'Não foi possível processar a solicitação',
        codeCopied: 'Código de indicação copiado',
    },
    whatsapp: {
        organization: 'Junte-se a *{{type}} {{name}}* na plataforma El7lm!\nCódigo de entrada: *{{code}}*\nCadastre-se agora: https://el7lm.com/auth/register',
        personal: 'Junte-se ao El7lm e registre suas habilidades esportivas!\nMeu código: *{{code}}*\nLink: https://el7lm.com',
    },
    table: {
        ambassadorDesc: 'Nome do embaixador / descrição',
        unnamedCode: 'Código de embaixador sem nome',
        referralCode: 'Código de indicação',
        copy: 'Copiar',
        usage: 'Uso',
        status: 'Status',
        active: 'Ativo',
        disabled: 'Desativado',
        actions: 'Ações',
        shareWhatsapp: 'Compartilhar no WhatsApp',
        player: 'Jogador',
        position: 'Posição',
        unknownPosition: 'Não especificado',
        requestDate: 'Data da solicitação',
        approved: 'Aprovado',
        pending: 'Em revisão',
        rejected: 'Recusado',
        approve: 'Aprovar',
        reject: 'Recusar',
        details: 'Detalhes',
    },
    ui: {
        ...REFERRALS_COPY.en.ui,
        eliteProgram: 'Programa elite',
        headerSuffix: 'Convide talentos, construa sua equipe e ganhe recompensas exclusivas.',
        egp: 'EGP',
        withdraw: 'Solicitar saque',
        joinOrganizationTitle: 'Entrar em uma organização esportiva',
        joinOrganizationDesc: 'Tem um código de convite de um clube ou academia? Insira aqui para entrar.',
        joinCodePlaceholder: 'Digite o código de entrada (ex. ACD-X92F)',
        join: 'Entrar',
        availablePoints: 'Pontos disponíveis',
        newRequests: 'Novas solicitações',
        spreadLevel: 'Nível de alcance',
        overview: 'Visão geral',
        personalReferralCode: 'Código de indicação pessoal',
        personalReferralDesc: 'Compartilhe seu código com jogadores e ganhe 10.000 pontos por cada nova assinatura.',
        hideQr: 'Ocultar QR',
        showQr: 'Mostrar QR',
        qrCodeLabel: 'Código QR',
        qrScan: 'Escaneie o código para se registrar imediatamente',
        cashConversion: 'Converter pontos em dinheiro',
        cashConversionDesc: 'Quando seu saldo atingir o mínimo (50.000 pontos), você poderá convertê-lo diretamente em saldo financeiro.',
        withdrawProgress: 'Progresso do saque',
        badgesPath: 'Caminho e medalhas',
        howToEarn: 'Como ganhar?',
        directReferral: 'Indicação direta',
        signupBonus: 'Bônus de cadastro',
        annualEarning: 'Ganho anual',
        pointsUnit: '{{points}} pontos',
        organizationCodes: 'Códigos da organização',
        codeNamePlaceholder: 'Nome do embaixador ou campanha (ex. Capitão Ahmed - campanha de verão)',
        createCode: 'Criar código',
        noCodes: 'Ainda não há códigos',
        joinRequests: 'Solicitações de entrada',
        search: 'Pesquisar...',
        noRequests: 'Não há solicitações',
        registeredPlayers: 'Jogadores registrados',
        noAcceptedPlayers: 'Nenhum jogador foi aceito ainda',
        verifiedPlayer: 'Jogador verificado',
        memberSince: 'Membro desde',
        viewProfile: 'Ver perfil',
        tips: [
            { title: 'Expanda sua rede', desc: 'Compartilhar seu código em comunidades esportivas especializadas aumenta suas chances de atrair talentos reais.', emoji: '🌐' },
            { title: 'Segurança e privacidade', desc: 'O sistema de indicações da El7lm é criptografado e garante que as recompensas cheguem aos donos corretos.', emoji: '🔒' },
            { title: 'Regras de recompensas', desc: 'As recompensas seguem os termos de uso, e cada entrada é revisada para manter a qualidade.', emoji: '📋' },
        ],
    },
};

// Custom config per account type
const ACCOUNT_TYPE_INFO: Record<string, { emoji: string; headerColor: string; accent: string }> = {
    player: { emoji: '🏆', headerColor: '#4f46e5', accent: '#6366f1' },
    club: { emoji: '🏟️', headerColor: '#059669', accent: '#10b981' },
    academy: { emoji: '🎓', headerColor: '#4f46e5', accent: '#6366f1' },
    trainer: { emoji: '🏋️', headerColor: '#db2777', accent: '#ec4899' },
    agent: { emoji: '🤝', headerColor: '#7c3aed', accent: '#8b5cf6' },
};

interface PlayerRewards {
    playerId: string;
    totalPoints: number;
    availablePoints: number;
    totalEarnings: number;
    referralCount: number;
    badges: any[];
    lastUpdated: any;
}

export default function EnhancedReferralsPage() {
    const { t, locale, isRTL } = useTranslation();
    const copy = getReferralCopy(locale);
    const { user, userData } = useAuth();
    const params = useParams();
    const router = useRouter();
    const accountType = params.accountType as string;
    const config = {
        ...(ACCOUNT_TYPE_INFO[accountType] || ACCOUNT_TYPE_INFO.player),
        ...(copy.accountTypes[accountType] || copy.accountTypes.player),
    };

    const [loading, setLoading] = useState(true);
    const [playerRewards, setPlayerRewards] = useState<PlayerRewards | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [showQR, setShowQR] = useState(false);

    const [organizationReferrals, setOrganizationReferrals] = useState<OrganizationReferral[]>([]);
    const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [newCodeName, setNewCodeName] = useState('');
    const [isCreatingCode, setIsCreatingCode] = useState(false);

    // Join Org
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (user?.id) loadInitialData();
    }, [user]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadRewardsAndStats(),
                accountType !== 'player' ? loadOrganizationData() : loadPlayerOnlyData(),
            ]);
        } catch (err) {
            toast.error(t('referrals.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const loadRewardsAndStats = async () => {
        const rewards = await referralService.createOrUpdatePlayerRewards(user!.id);
        setPlayerRewards(rewards);
        const codes = await referralService.getUserReferralCodes(user!.id);
        if (codes && codes.length > 0) {
            setReferralCode(codes[0].referralCode);
        } else {
            const newCode = referralService.generateReferralCode();
            setReferralCode(newCode);
            await referralService.createReferral(user!.id, newCode);
        }
    };

    const loadOrganizationData = async () => {
        const [referrals, requests] = await Promise.all([
            organizationReferralService.getOrganizationReferrals(user!.id),
            organizationReferralService.getOrganizationJoinRequests(user!.id),
        ]);
        setOrganizationReferrals(referrals);
        setJoinRequests(requests);
    };

    const loadPlayerOnlyData = async () => {
        const requests = await organizationReferralService.getPlayerJoinRequests(user!.id);
        setJoinRequests(requests);
    };

    // --- Actions ---

    const handleJoinOrg = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        try {
            const orgReferral = await organizationReferralService.verifyReferralCode(joinCode.trim());
            if (!orgReferral) { toast.error(copy.toast.invalidJoinCode); return; }
            await organizationReferralService.createJoinRequest(
                user!.id,
                { full_name: userData?.full_name || userData?.name, email: userData?.email, phone: userData?.phone, position: (userData as any)?.primary_position },
                joinCode.trim()
            );
            toast.success(interpolate(copy.toast.joinSent, { name: orgReferral.organizationName }));
            setJoinCode('');
            loadPlayerOnlyData();
            setActiveTab('requests');
        } catch (error: any) {
            toast.error(error.message || copy.toast.joinError);
        } finally {
            setIsJoining(false);
        }
    };

    const handleCreateCode = async () => {
        try {
            setIsCreatingCode(true);
            let orgName = userData?.full_name || userData?.name || copy.accountTypes.defaultTypeLabel;
            if (accountType === 'club') orgName = userData?.club_name || orgName;
            if (accountType === 'academy') orgName = userData?.academy_name || orgName;
            await organizationReferralService.createOrganizationReferral(user!.id, accountType, orgName, {
                description: newCodeName.trim() || undefined,
            });
            toast.success(copy.toast.createCodeSuccess);
            setNewCodeName('');
            loadOrganizationData();
        } catch {
            toast.error(copy.toast.createCodeError);
        } finally {
            setIsCreatingCode(false);
        }
    };

    const toggleCodeStatus = async (ref: OrganizationReferral) => {
        try {
            await organizationReferralService.updateOrganizationReferral(ref.id, user!.id, { isActive: !ref.isActive });
            toast.success(ref.isActive ? copy.toast.codeDisabled : copy.toast.codeEnabled);
            loadOrganizationData();
        } catch {
            toast.error(copy.toast.genericError);
        }
    };

    const handleProcessRequest = async (requestId: string, approve: boolean) => {
        try {
            if (approve) {
                await organizationReferralService.approveJoinRequest(requestId, user!.id, userData?.full_name || copy.accountTypes.defaultTypeLabel);
                toast.success(copy.toast.requestApproved);
            } else {
                await organizationReferralService.rejectJoinRequest(requestId, user!.id, userData?.full_name || copy.accountTypes.defaultTypeLabel);
                toast.info(copy.toast.requestRejected);
            }
            loadOrganizationData();
        } catch {
            toast.error(copy.toast.requestProcessError);
        }
    };

    const filteredRequests = useMemo(() => {
        return joinRequests.filter(req =>
            (req.playerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.playerEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [joinRequests, searchTerm]);

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success(copy.toast.codeCopied || t('referrals.codeCopied')); };

    const shareViaWhatsApp = (code: string, isOrg = false) => {
        let message = '';
        if (isOrg) {
            const orgName = userData?.academy_name || userData?.club_name || userData?.full_name || copy.accountTypes.defaultTypeLabel;
            const typeLabel = copy.accountTypes[accountType]?.typeLabel || copy.accountTypes.defaultTypeLabel;
            message = interpolate(copy.whatsapp.organization, { type: typeLabel, name: orgName, code });
        } else {
            message = interpolate(copy.whatsapp.personal, { code });
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const formatDate = (date: any) => {
        if (!date) return '-';
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString({ ar: 'ar-EG', en: 'en-GB', es: 'es-ES', pt: 'pt-PT' }[locale], { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // ─── Table Columns ─────────────────────────────────────────
    const orgRefColumns: ColumnsType<OrganizationReferral> = [
        {
            title: copy.table.ambassadorDesc,
            key: 'desc',
            render: (_, ref) => (
                <Space>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: ref.isActive ? '#e0e7ff' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: ref.isActive ? '#4f46e5' : '#9ca3af' }}>
                        {(ref.description || '?').charAt(0)}
                    </div>
                    <div>
                        <Text strong>{ref.description || copy.table.unnamedCode}</Text>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}>{ref.id.slice(0, 10)}...</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: copy.table.referralCode,
            key: 'code',
            render: (_, ref) => (
                <Space>
                    <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}>{ref.referralCode}</Tag>
                    <Tooltip title={copy.table.copy}>
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(ref.referralCode)} />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: copy.table.usage,
            key: 'usage',
            render: (_, ref) => (
                <div style={{ width: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11 }}>{copy.table.usage}</Text>
                        <Text strong style={{ fontSize: 11 }}>{ref.currentUsage} / {ref.maxUsage || '∞'}</Text>
                    </div>
                    <Progress
                        percent={Math.min(100, (ref.currentUsage / (ref.maxUsage || 100)) * 100)}
                        showInfo={false}
                        size="small"
                        strokeColor={ref.isActive ? '#6366f1' : '#d1d5db'}
                    />
                </div>
            ),
        },
        {
            title: copy.table.status,
            key: 'status',
            render: (_, ref) => (
                <Switch checked={ref.isActive} onChange={() => toggleCodeStatus(ref)} checkedChildren={copy.table.active} unCheckedChildren={copy.table.disabled} size="small" />
            ),
        },
        {
            title: copy.table.actions,
            key: 'actions',
            render: (_, ref) => (
                <Button
                    size="small"
                    icon={<ShareAltOutlined />}
                    onClick={() => shareViaWhatsApp(ref.referralCode, true)}
                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                >
                    {copy.table.shareWhatsapp}
                </Button>
            ),
        },
    ];

    const requestColumns: ColumnsType<PlayerJoinRequest> = [
        {
            title: copy.table.player,
            key: 'player',
            render: (_, req) => (
                <Space>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#4f46e5' }}>
                        {(req.playerName || '?').charAt(0)}
                    </div>
                    <div>
                        <Text strong style={{ display: 'block' }}>{req.playerName || '-'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{req.playerEmail || '-'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: copy.table.position,
            key: 'pos',
            render: (_, req) => <Tag color="blue">{req.playerData?.position || copy.table.unknownPosition}</Tag>,
        },
        { title: copy.table.requestDate, key: 'date', render: (_, req) => <Text type="secondary">{formatDate(req.requestedAt)}</Text> },
        {
            title: copy.table.status,
            key: 'status',
            render: (_, req) => (
                <Tag color={req.status === 'approved' ? 'green' : req.status === 'pending' ? 'orange' : 'red'}>
                    {req.status === 'approved' ? copy.table.approved : req.status === 'pending' ? copy.table.pending : copy.table.rejected}
                </Tag>
            ),
        },
        {
            title: copy.table.actions,
            key: 'actions',
            render: (_, req) => req.status === 'pending' ? (
                <Space>
                    <Button size="small" type="primary" style={{ background: '#059669', borderColor: '#059669' }} onClick={() => handleProcessRequest(req.id, true)}>{copy.table.approve}</Button>
                    <Button size="small" danger onClick={() => handleProcessRequest(req.id, false)}>{copy.table.reject}</Button>
                </Space>
            ) : (
                <Button size="small" type="text" icon={<FileTextOutlined />}>{copy.table.details}</Button>
            ),
        },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <Spin size="large" />
        </div>
    );

    const withdrawProgress = Math.min(100, (playerRewards?.availablePoints || 0) / 500);

    return (
        <ConfigProvider direction={isRTL ? 'rtl' : 'ltr'} locale={{ ar: arEG, en: enUS, es: esES, pt: ptPT }[locale]} theme={ANTD_THEME}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', paddingBottom: 48 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><LanguageSwitcher /></div>

                {/* ─── Header Banner ─────────────────────────────────── */}
                <div style={{
                    background: `linear-gradient(135deg, ${config.headerColor}, ${config.accent})`,
                    borderRadius: 24, padding: '40px 48px', color: '#fff', marginBottom: 32,
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: -60, left: -30, width: 160, height: 160, background: 'rgba(0,0,0,0.1)', borderRadius: '50%' }} />
                    <Row align="middle" justify="space-between" style={{ position: 'relative' }}>
                        <Col>
                            <Space direction="vertical" size={6}>
                                <Space>
                                    <span style={{ fontSize: 32 }}>{config.emoji}</span>
                                    <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 12 }}>{copy.ui.eliteProgram}</Tag>
                                </Space>
                                <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900 }}>{config.title || t('referrals.title')}</Title>
                                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                                    {config.subtitle} - {copy.ui.headerSuffix}
                                </Text>
                            </Space>
                        </Col>
                        <Col>
                            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '20px 28px', backdropFilter: 'blur(10px)' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'block', marginBottom: 4 }}>{t('referrals.availablePoints')}</Text>
                                <Text style={{ color: '#fff', fontSize: 40, fontWeight: 900, display: 'block', lineHeight: 1 }}>${(playerRewards?.totalEarnings || 0).toFixed(0)}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>≈ {(Number(playerRewards?.totalEarnings || 0) * 50).toLocaleString()} {copy.ui.egp}</Text>
                                <Button style={{ marginTop: 12, borderColor: '#fff', color: '#fff', background: 'transparent', display: 'block', width: '100%' }}>
                                    {copy.ui.withdraw}
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* ─── Join Organization (Players Only) ─────────────── */}
                {accountType === 'player' && (
                    <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24, background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', border: '2px solid #a7f3d0' }}>
                        <Row align="middle" gutter={[16, 16]}>
                            <Col flex="auto">
                                <Space>
                                    <div style={{ width: 52, height: 52, background: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>🏟️</div>
                                    <div>
                                        <Title level={5} style={{ margin: 0 }}>{copy.ui.joinOrganizationTitle}</Title>
                                        <Text type="secondary">{copy.ui.joinOrganizationDesc}</Text>
                                    </div>
                                </Space>
                            </Col>
                            <Col flex="0 0 400px" xs={24} md={12}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        placeholder={copy.ui.joinCodePlaceholder}
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        style={{ fontFamily: 'monospace', fontSize: 15, textTransform: 'uppercase' }}
                                    />
                                    <Button
                                        type="primary"
                                        loading={isJoining}
                                        disabled={!joinCode.trim()}
                                        onClick={handleJoinOrg}
                                        style={{ background: '#059669', borderColor: '#059669' }}
                                    >
                                        {copy.ui.join}
                                    </Button>
                                </Space.Compact>
                            </Col>
                        </Row>
                    </Card>
                )}

                {/* ─── Stats Cards ───────────────────────────────────── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {[
                        { label: copy.ui.availablePoints, value: (playerRewards?.availablePoints || 0).toLocaleString(), emoji: '⭐', color: '#f59e0b' },
                        { label: config.referralLabel, value: playerRewards?.referralCount || 0, emoji: '👥', color: '#6366f1' },
                        { label: copy.ui.newRequests, value: joinRequests.filter(r => r.status === 'pending').length, emoji: '⏳', color: '#f97316' },
                        { label: copy.ui.spreadLevel, value: '84%', emoji: '📈', color: '#059669' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} sm={6}>
                            <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block' }}>{s.label}</Text>
                                <Text style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</Text>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* ─── Tabs ──────────────────────────────────────────── */}
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    type="card"
                    items={[
                        {
                            key: 'overview',
                            label: <><TrophyOutlined /> {copy.ui.overview}</>,
                            children: (
                                <Row gutter={[24, 24]}>
                                    {/* Personal Referral Code */}
                                    <Col xs={24} lg={16}>
                                        <Card bordered={false} style={{ borderRadius: 16, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                                            <Title level={4} style={{ color: '#3730a3', margin: 0, marginBottom: 8 }}>{copy.ui.personalReferralCode}</Title>
                                            <Text style={{ color: '#4338ca' }}>{copy.ui.personalReferralDesc}</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, background: '#fff', borderRadius: 12, padding: '14px 20px', border: '2px solid #c7d2fe' }}>
                                                <Text style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, fontFamily: 'monospace', color: '#4f46e5', flex: 1 }}>{referralCode}</Text>
                                                <Tooltip title={copy.table.copy}>
                                                    <Button type="text" icon={<CopyOutlined />} onClick={() => copyToClipboard(referralCode)} />
                                                </Tooltip>
                                            </div>
                                            <Space style={{ marginTop: 16 }}>
                                                <Button
                                                    style={{ background: '#25D366', color: '#fff', border: 'none' }}
                                                    icon={<ShareAltOutlined />}
                                                    onClick={() => shareViaWhatsApp(referralCode)}
                                                >
                                                    {copy.table.shareWhatsapp}
                                                </Button>
                                                <Button icon={<QrcodeOutlined />} onClick={() => setShowQR(!showQR)}>
                                                    {showQR ? copy.ui.hideQr : copy.ui.showQr}
                                                </Button>
                                            </Space>
                                            {showQR && (
                                                <div style={{ textAlign: 'center', marginTop: 20, padding: 24, background: '#fff', borderRadius: 12 }}>
                                                    <div style={{ width: 120, height: 120, background: '#f3f4f6', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e5e7eb' }}>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>{copy.ui.qrCodeLabel}</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Text type="secondary">{copy.ui.qrScan}</Text>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>

                                        {/* Cash conversion progress */}
                                        <Card bordered={false} style={{ borderRadius: 16, background: '#4f46e5', marginTop: 16 }}>
                                            <Title level={4} style={{ color: '#fff', marginBottom: 8 }}>{copy.ui.cashConversion}</Title>
                                            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
                                                {copy.ui.cashConversionDesc}
                                            </Paragraph>
                                            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{copy.ui.withdrawProgress}</Text>
                                                    <Text style={{ color: '#fff', fontWeight: 900 }}>{withdrawProgress.toFixed(0)}%</Text>
                                                </div>
                                                <Progress percent={withdrawProgress} showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" />
                                            </div>
                                        </Card>
                                    </Col>

                                    {/* Badges */}
                                    <Col xs={24} lg={8}>
                                        <Card bordered={false} style={{ borderRadius: 16 }}
                                            title={<><TrophyOutlined style={{ color: '#f59e0b' }} /> {copy.ui.badgesPath}</>}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {BADGES.REFERRAL_BADGES.slice(0, 4).map((badge: any) => {
                                                    const isEarned = playerRewards?.badges?.some((b: any) => b.id === badge.id);
                                                    return (
                                                        <div key={badge.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: 12,
                                                            padding: '10px 12px', borderRadius: 10,
                                                            background: isEarned ? '#f0fdf4' : '#f9fafb',
                                                            border: `1px solid ${isEarned ? '#bbf7d0' : '#f3f4f6'}`,
                                                            opacity: isEarned ? 1 : 0.65,
                                                        }}>
                                                            <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}>
                                                                {badge.icon}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <Text strong style={{ display: 'block', fontSize: 13 }}>{badge.name}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{badge.description}</Text>
                                                            </div>
                                                            {isEarned && <CheckCircleOutlined style={{ color: '#059669', fontSize: 16 }} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>

                                        {/* How to earn */}
                                        <Card bordered={false} style={{ borderRadius: 16, marginTop: 16 }} title={copy.ui.howToEarn}>
                                            {[
                                                { title: copy.ui.directReferral, points: '10,000', emoji: '🎯' },
                                                { title: copy.ui.signupBonus, points: '5,000', emoji: '🎁' },
                                                { title: copy.ui.annualEarning, points: '20,000', emoji: '👑' },
                                            ].map((item, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                                                    <span style={{ fontSize: 22 }}>{item.emoji}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                                                    </div>
                                                    <Tag color="purple">{interpolate(copy.ui.pointsUnit, { points: item.points })}</Tag>
                                                </div>
                                            ))}
                                        </Card>
                                    </Col>
                                </Row>
                            ),
                        },
                        ...(accountType !== 'player' ? [{
                            key: 'links',
                            label: <><LinkOutlined /> {copy.ui.organizationCodes}</>,
                            children: (
                                <div>
                                    <Card bordered={false} style={{ borderRadius: 16, marginBottom: 16 }}>
                                        <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
                                            <Input
                                                placeholder={copy.ui.codeNamePlaceholder}
                                                value={newCodeName}
                                                onChange={e => setNewCodeName(e.target.value)}
                                            />
                                            <Button type="primary" icon={<PlusOutlined />} loading={isCreatingCode} onClick={handleCreateCode}>
                                                {copy.ui.createCode}
                                            </Button>
                                        </Space.Compact>
                                    </Card>
                                    <Card bordered={false} style={{ borderRadius: 16 }}>
                                        <Table
                                            columns={orgRefColumns}
                                            dataSource={organizationReferrals}
                                            rowKey="id"
                                            size="middle"
                                            locale={{ emptyText: <Empty description={copy.ui.noCodes} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                            pagination={{ pageSize: 10 }}
                                            scroll={{ x: 600 }}
                                        />
                                    </Card>
                                </div>
                            ),
                        }] : []),
                        {
                            key: 'requests',
                            label: (
                                <>
                                    <ClockCircleOutlined /> {copy.ui.joinRequests}
                                    {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                                        <AntBadge count={joinRequests.filter(r => r.status === 'pending').length} size="small" style={{ marginRight: 6 }} />
                                    )}
                                </>
                            ),
                            children: (
                                <Card bordered={false} style={{ borderRadius: 16 }}
                                    extra={
                                        <Input
                                            prefix={<SearchOutlined />}
                                            placeholder={copy.ui.search}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{ width: 200 }}
                                            allowClear
                                        />
                                    }
                                >
                                    <Table
                                        columns={requestColumns}
                                        dataSource={filteredRequests}
                                        rowKey="id"
                                        size="middle"
                                        locale={{ emptyText: <Empty description={copy.ui.noRequests} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                        pagination={{ pageSize: 10 }}
                                        scroll={{ x: 600 }}
                                    />
                                </Card>
                            ),
                        },
                        ...(accountType !== 'player' ? [{
                            key: 'affiliations',
                            label: <><TeamOutlined /> {copy.ui.registeredPlayers}</>,
                            children: (
                                <Row gutter={[16, 16]}>
                                    {joinRequests.filter(r => r.status === 'approved').length === 0 ? (
                                        <Col span={24}>
                                            <Card bordered={false} style={{ borderRadius: 16, textAlign: 'center', padding: 40 }}>
                                                <Empty description={copy.ui.noAcceptedPlayers} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            </Card>
                                        </Col>
                                    ) : (
                                        joinRequests.filter(r => r.status === 'approved').map(req => (
                                            <Col key={req.id} xs={24} sm={12} lg={8}>
                                                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                                        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#6366f1' }}>
                                                            {(req.playerName || '?').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <Text strong style={{ fontSize: 16, display: 'block' }}>{req.playerName}</Text>
                                                            <Text type="success" style={{ fontSize: 12 }}><CheckCircleOutlined /> {copy.ui.verifiedPlayer}</Text>
                                                        </div>
                                                    </div>
                                                    <Row gutter={8} style={{ marginBottom: 16 }}>
                                                        <Col span={12}>
                                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{copy.table.position}</Text>
                                                            <Text strong>{req.playerData?.position || '-'}</Text>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{copy.ui.memberSince}</Text>
                                                            <Text strong>{formatDate(req.processedAt || req.requestedAt)}</Text>
                                                        </Col>
                                                    </Row>
                                                    <Button
                                                        block
                                                        icon={<ExportOutlined />}
                                                        onClick={() => router.push(`/dashboard/player/search/profile/player/${req.playerId}`)}
                                                    >
                                                        {copy.ui.viewProfile}
                                                    </Button>
                                                </Card>
                                            </Col>
                                        ))
                                    )}
                                </Row>
                            ),
                        }] : []),
                    ]}
                />

                {/* ─── Footer Tips ──────────────────────────────────── */}
                <Row gutter={[24, 24]} style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid #f3f4f6' }}>
                    {copy.ui.tips.map((tip: { title: string; desc: string; emoji: string }, i: number) => (
                        <Col key={i} xs={24} md={8}>
                            <Space align="start">
                                <div style={{ fontSize: 24, width: 44, height: 44, background: '#f9fafb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {tip.emoji}
                                </div>
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{tip.title}</Text>
                                    <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>{tip.desc}</Text>
                                </div>
                            </Space>
                        </Col>
                    ))}
                </Row>
            </div>
        </ConfigProvider>
    );
}
