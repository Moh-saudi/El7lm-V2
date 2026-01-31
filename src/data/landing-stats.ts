// Mock data for landing page statistics
export const platformStats = {
    players: 1247,
    clubs: 156,
    successRate: 89
};

// Chart data for player growth (last 6 months)
export const growthChartData = [
    { month: 'يناير', monthEn: 'Jan', players: 400 },
    { month: 'فبراير', monthEn: 'Feb', players: 520 },
    { month: 'مارس', monthEn: 'Mar', players: 680 },
    { month: 'أبريل', monthEn: 'Apr', players: 850 },
    { month: 'مايو', monthEn: 'May', players: 1050 },
    { month: 'يونيو', monthEn: 'Jun', players: 1247 }
];

// Top performing players this month
export const topPlayers = [
    {
        name: 'أحمد محمد',
        nameEn: 'Ahmed Mohamed',
        rating: 8.7,
        position: 'مهاجم',
        positionEn: 'Forward'
    },
    {
        name: 'خالد علي',
        nameEn: 'Khaled Ali',
        rating: 8.5,
        position: 'وسط',
        positionEn: 'Midfielder'
    },
    {
        name: 'يوسف خليل',
        nameEn: 'Youssef Khalil',
        rating: 8.3,
        position: 'مدافع',
        positionEn: 'Defender'
    }
];

// Value propositions (3 main features)
export const valuePropositions = {
    ar: [
        {
            icon: '🎯',
            title: 'قاعدة بيانات مركزية',
            description: 'نظام موحد لإدارة ملفات اللاعبين والأندية'
        },
        {
            icon: '🛡️',
            title: 'حماية كاملة للقاصرين',
            description: 'أعلى معايير الأمان والخصوصية'
        },
        {
            icon: '🌍',
            title: 'شبكة عالمية',
            description: 'اتصال مباشر بأندية في 34 دولة'
        }
    ],
    en: [
        {
            icon: '🎯',
            title: 'Central Database',
            description: 'Unified system for managing player and club profiles'
        },
        {
            icon: '🛡️',
            title: 'Complete Minor Protection',
            description: 'Highest security and privacy standards'
        },
        {
            icon: '🌍',
            title: 'Global Network',
            description: 'Direct connection to clubs in 34 countries'
        }
    ],
    fr: [
        {
            icon: '🎯',
            title: 'Base de Données Centrale',
            description: 'Système unifié de gestion des profils de joueurs et de clubs'
        },
        {
            icon: '🛡️',
            title: 'Protection des Mineurs',
            description: 'Les normes de sécurité et de confidentialité les plus élevées'
        },
        {
            icon: '🌍',
            title: 'Réseau Mondial',
            description: 'Connexion directe avec des clubs dans 34 pays'
        }
    ],
    es: [
        {
            icon: '🎯',
            title: 'Base de Datos Central',
            description: 'Sistema unificado para gestionar perfiles de jugadores y clubes'
        },
        {
            icon: '🛡️',
            title: 'Protección de Menores',
            description: 'Los más altos estándares de seguridad y privacidad'
        },
        {
            icon: '🌍',
            title: 'Red Global',
            description: 'Conexión directa con clubes en 34 países'
        }
    ]
};
