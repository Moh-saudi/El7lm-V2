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
                { name: 'إبراهيم عادل', age: 22, from: 'بيراميدز', to: 'خيتافي', date: 'منذ ساعة' },
                { name: 'سعود عبدالحميد', age: 24, from: 'الهلال', to: 'روما', date: 'منذ 3 ساعات' },
                { name: 'عمر مرموش', age: 25, from: 'فرانكفورت', to: 'ليفربول', date: 'أمس' },
                { name: 'يوسف النصيري', age: 26, from: 'إشبيلية', to: 'فنربخشة', date: 'منذ يومين' },
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
            { name: 'Ibrahim Adel', age: 22, from: 'Pyramids', to: 'Getafe', date: '1h ago' },
            { name: 'Saud Abdulhamid', age: 24, from: 'Al Hilal', to: 'AS Roma', date: '3h ago' },
            { name: 'Omar Marmoush', age: 25, from: 'Eintracht', to: 'Liverpool', date: 'Yesterday' },
            { name: 'Youssef En-Nesyri', age: 26, from: 'Sevilla', to: 'Fenerbahçe', date: '2 days ago' },
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
