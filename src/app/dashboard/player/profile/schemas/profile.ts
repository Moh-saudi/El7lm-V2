import * as z from 'zod';

export const coachSchema = z.object({
    name: z.string().min(2, "اسم المدرب مطلوب"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_current: z.boolean().default(false),
});

export const academySchema = z.object({
    name: z.string().min(2, "اسم الأكاديمية مطلوب"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_current: z.boolean().default(false),
});

export const clubHistorySchema = z.object({
    club_name: z.string().min(2, "اسم النادي مطلوب"),
    season: z.string().min(4, "الموسم مطلوب"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_current: z.boolean().default(false),
    // Enhanced details
    position_played: z.string().optional(),
    matches_played: z.coerce.number().optional(),
    goals: z.coerce.number().optional(),
    assists: z.coerce.number().optional(),
});

export const achievementSchema = z.object({
    title: z.string().min(2, "عنوان الإنجاز مطلوب"),
    date: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
});

export const videoSchema = z.object({
    title: z.string().min(2, "العنوان مطلوب"),
    url: z.string().url("رابط غير صحيح"),
    type: z.enum(['youtube', 'vimeo', 'other', 'uploaded']).default('youtube'),
});

export const injurySchema = z.object({
    injury_type: z.string(),
    injury_date: z.string().optional(),
    status: z.enum(['recovered', 'healing', 'active']).default('recovered'),
    notes: z.string().optional(),
});

export const surgerySchema = z.object({
    procedure: z.string().min(2, "اسم العملية مطلوب"),
    date: z.string().optional(),
    doctor: z.string().optional(),
    notes: z.string().optional(),
});

export const allergySchema = z.object({
    allergen: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
    reaction: z.string().optional(),
});

export const medicationSchema = z.object({
    name: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
});

export const socialLinkSchema = z.object({
    platform: z.string(),
    url: z.string().optional(),
    handle: z.string().optional(),
});

export const documentSchema = z.object({
    type: z.string().min(2, "نوع المستند مطلوب"),
    name: z.string().min(2, "اسم المستند مطلوب"),
    url: z.string().url("رابط الملف مطلوب"),
});

export const languageSchema = z.object({
    language: z.string(),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Native']),
});

export const courseSchema = z.object({
    name: z.string().min(2, "اسم الدورة مطلوب"),
    date: z.string().optional(),
    organization: z.string().optional(),
});

export const profileSchema = z.object({
    // Personal Info
    name: z.string().min(3, "الاسم الكامل يجب أن يكون 3 أحرف على الأقل"),
    birth_date: z.string().refine((val) => val !== '', "تاريخ الميلاد مطلوب"),
    gender: z.enum(['male', 'female'], { required_error: "يرجى تحديد الجنس" }),
    nationality: z.string().min(2, "الجنسية مطلوبة"),
    country: z.string().min(2, "دولة الإقامة مطلوبة"),
    city: z.string().min(2, "المدينة مطلوبة"),

    // Contact Info
    phone: z.string().min(8, "رقم الهاتف غير صحيح"),
    whatsapp: z.string().optional(),
    email: z.string().email("البريد الإلكتروني غير صحيح"),
    address: z.string().optional(),

    // Guardian Info (Required if Age < 18 - Logic handled in resolver or UI)
    guardian_name: z.string().optional(),
    guardian_phone: z.string().optional(),
    guardian_relation: z.string().optional(),

    // Education
    education_level: z.string().optional(),
    school_name: z.string().optional(),
    graduation_year: z.string().optional(),
    university_name: z.string().optional(),
    languages: z.array(languageSchema).default([]),
    courses: z.array(courseSchema).default([]),

    // Medical
    height: z.preprocess((val) => Number(val), z.number().min(50, "الطول يجب أن يكون سم").max(300).optional().or(z.literal(0))),
    weight: z.preprocess((val) => Number(val), z.number().min(20, "الوزن يجب أن يكون كجم").max(200).optional().or(z.literal(0))),
    blood_type: z.string().optional(),
    chronic_diseases: z.string().optional(),
    // surgeries: z.string().optional(), // Linked to old schema if needed, but we prefer array
    surgeries_list: z.array(surgerySchema).default([]),
    allergies_list: z.array(allergySchema).default([]),
    medications: z.array(medicationSchema).default([]),
    injuries: z.array(injurySchema).default([]),
    resting_heart_rate: z.coerce.number().optional(),
    last_checkup: z.string().optional(),
    family_history: z.string().optional(),

    // Sports Info
    position: z.string().min(2, "المركز الأساسي مطلوب"),
    detailed_position: z.string().optional(),
    secondary_position: z.string().optional(),
    jersey_number: z.string().optional(),
    current_club: z.string().optional(),
    market_value: z.coerce.number().optional(),
    contract_status: z.preprocess((val) => typeof val === 'string' ? val.toLowerCase() : val, z.enum(['free', 'contracted', 'loan'])).default('free'),
    contract_start_date: z.string().optional(),
    contract_end_date: z.string().optional(),
    foot: z.enum(['right', 'left', 'both']).default('right'),
    club_history: z.array(clubHistorySchema).default([]),
    achievements: z.array(achievementSchema).default([]),
    // Stats (0-99)
    stats_pace: z.coerce.number().min(0).max(99).default(50),
    stats_shooting: z.coerce.number().min(0).max(99).default(50),
    stats_passing: z.coerce.number().min(0).max(99).default(50),
    stats_dribbling: z.coerce.number().min(0).max(99).default(50),
    stats_defending: z.coerce.number().min(0).max(99).default(50),
    stats_physical: z.coerce.number().min(0).max(99).default(50),

    // Advanced Skills
    skill_moves: z.coerce.number().min(1).max(5).default(3),
    weak_foot: z.coerce.number().min(1).max(5).default(3),
    work_rate_attack: z.enum(['Low', 'Medium', 'High']).default('Medium'),
    work_rate_defense: z.enum(['Low', 'Medium', 'High']).default('Medium'),

    // Mental Attributes
    mentality_leadership: z.coerce.number().min(0).max(99).default(50),
    mentality_teamwork: z.coerce.number().min(0).max(99).default(50),
    mentality_vision: z.coerce.number().min(0).max(99).default(50),
    mentality_aggression: z.coerce.number().min(0).max(99).default(50),
    mentality_composure: z.coerce.number().min(0).max(99).default(50),

    // Training & Academies
    has_private_coach: z.boolean().default(false),
    private_coaches: z.array(coachSchema).default([]),
    has_joined_academy: z.boolean().default(false),
    academies: z.array(academySchema).default([]),

    // Equipment
    shoe_size: z.coerce.number().min(30).max(60).optional(),
    clothing_size: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']).optional(),
    // Professional
    agent_name: z.string().optional(),
    agent_phone: z.string().optional(),
    transfermarkt_url: z.string().optional(),
    instagram_handle: z.string().optional(),
    social_links: z.array(socialLinkSchema).default([]),
    // Media
    image: z.string().optional(), // Profile Image
    images: z.array(z.string()).default([]), // Gallery
    videos: z.array(videoSchema).default([]),
    documents: z.array(documentSchema).default([]),

    // Skills & Objectives
    skills: z.record(z.any()).optional(), // Can refine later
    objectives: z.array(z.string()).default([]),

    // Contracts & Agents
    contract_history: z.array(z.any()).default([]),
    agent_history: z.array(z.any()).default([]),
    official_contact: z.record(z.any()).optional(),
}).refine((data) => {
    // Validate Contract End Date
    if ((data.contract_status === 'contracted' || data.contract_status === 'loan') && data.contract_end_date) {
        const end = new Date(data.contract_end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // End date must be today or future
        return end >= today;
    }
    return true;
}, {
    message: "تاريخ نهاية العقد لا يمكن أن يكون في الماضي",
    path: ["contract_end_date"]
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
