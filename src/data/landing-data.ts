export const getLandingData = (lang: 'ar' | 'en' | 'fr' | 'es') => {

    // Arabic Data
    if (lang === 'ar') {
        return {
            topPlayers: [
                { rank: 1, name: 'محمد عبد المنعم', club: 'نادي نيس', val: '€12m', pos: 'CB', flag: '🇪🇬' },
                { rank: 2, name: 'سالم الدوسري', club: 'نادي الهلال', val: '€2.5m', pos: 'LW', flag: '🇸🇦' },
                { rank: 3, name: 'أكرم عفيف', club: 'نادي السد', val: '€4.0m', pos: 'LW', flag: '🇶🇦' },
                { rank: 4, name: 'سفيان رحيمي', club: 'نادي العين', val: '€5.5m', pos: 'ST', flag: '🇲🇦' },
                { rank: 5, name: 'موسى التعمري', club: 'مونبلييه', val: '€6.0m', pos: 'RW', flag: '🇯🇴' },
            ],
            latestRegistrations: [
                { name: 'أحمد محمد', age: 19, from: 'أكاديمية الحلم', to: 'نادي المستقبل', date: 'منذ ساعة' },
                { name: 'خالد علي', age: 17, from: 'أكاديمية النجوم', to: 'نادي الأبطال', date: 'منذ 3 ساعات' },
                { name: 'يوسف حسن', age: 20, from: 'مركز الشباب', to: 'النادي الملكي', date: 'أمس' },
                { name: 'محمود سعيد', age: 18, from: 'أكاديمية المواهب', to: 'نادي الاتحاد', date: 'منذ يومين' },
            ],
            tournaments: [
                { name: 'كأس العاصمة الإدارية', clubs: 8, status: 'جارية الآن' },
                { name: 'دوري أبطال الحلم', clubs: 32, status: 'التسجيل مفتوح' },
                { name: 'تصفيات المواهب - القاهرة', clubs: 64, status: 'مكتملة' }
            ],
            successStories: [
                { id: 1, name: "عمر كمال", designation: "انتقل للدوري الإنجليزي", image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3387&q=80" },
                { id: 2, name: "فهد المولد", designation: "أفضل لاعب واعد", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" },
                { id: 3, name: "ياسمين صبري", designation: "حارسة منتخب السيدات", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" },
                { id: 4, name: "حسن الهيدوس", designation: "قائد الفريق المثالي", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3540&q=80" },
            ]
        };
    }

    // English Data (Default for others for now)
    return {
        topPlayers: [
            { rank: 1, name: 'Mohamed Abdelmonem', club: 'OGC Nice', val: '€12m', pos: 'CB', flag: '🇪🇬' },
            { rank: 2, name: 'Salem Al-Dawsari', club: 'Al Hilal', val: '€2.5m', pos: 'LW', flag: '🇸🇦' },
            { rank: 3, name: 'Akram Afif', club: 'Al Sadd', val: '€4.0m', pos: 'LW', flag: '🇶🇦' },
            { rank: 4, name: 'Soufiane Rahimi', club: 'Al Ain', val: '€5.5m', pos: 'ST', flag: '🇲🇦' },
            { rank: 5, name: 'Mousa Al-Tamari', club: 'Montpellier', val: '€6.0m', pos: 'RW', flag: '🇯🇴' },
        ],
        latestRegistrations: [
            { name: 'Ahmed Mohamed', age: 19, from: 'Dream Academy', to: 'Future Club', date: '1h ago' },
            { name: 'Khaled Ali', age: 17, from: 'Stars Academy', to: 'Champions Club', date: '3h ago' },
            { name: 'Youssef Hassan', age: 20, from: 'Youth Center', to: 'Royal Club', date: 'Yesterday' },
            { name: 'Mahmoud Saeed', age: 18, from: 'Talent Academy', to: 'Union Club', date: '2 days ago' },
        ],
        tournaments: [
            { name: 'Capital Cup', clubs: 8, status: 'Live Now' },
            { name: 'Dream Champions League', clubs: 32, status: 'Open' },
            { name: 'Talent Qualifiers - Cairo', clubs: 64, status: 'Completed' }
        ],
        successStories: [
            { id: 1, name: "Omar Kamal", designation: "Joined Premier League", image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3387&q=80" },
            { id: 2, name: "Fahad Al-Muwallad", designation: "Best Young Player", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" },
            { id: 3, name: "Yasmin Sabry", designation: "National Team GK", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60" },
            { id: 4, name: "Hassan Al-Haydos", designation: "Ideal Captain", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3540&q=80" },
        ]
    };
};
