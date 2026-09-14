export type StoredTournamentClient = {
    id: string;
    supabase_auth_id: string;
    name: string;
    organization_name: string | null;
    email: string;
    password?: string;
    phone: string | null;
    country: string | null;
    is_active: boolean;
    created_at: string;
    _tournament_count?: number;
};

export const DEFAULT_CLIENTS: StoredTournamentClient[] = [
    {
        id: 'b7048ac2-bf7d-44df-a2c4-d1688a21cf43',
        supabase_auth_id: 'b7048ac2-bf7d-44df-a2c4-d1688a21cf43',
        name: 'كابتن أحمد الشريف (كأس العرب)',
        organization_name: 'المدينة الأولمبية بالإسماعيلية',
        email: 'arab-cup@el7lm.com',
        password: 'Password123!',
        phone: '+20 100 123 4567',
        country: 'مصر',
        is_active: true,
        created_at: '2026-04-25T19:43:46.984513+00:00',
        _tournament_count: 1,
    },
    {
        id: 'ffe8c348-03e1-4781-b2a9-406a7f880cef',
        supabase_auth_id: 'ffe8c348-03e1-4781-b2a9-406a7f880cef',
        name: 'إدارة بطولة الدوحة (قطر)',
        organization_name: 'نادي لوسيل الرياضي',
        email: 'doha-organizer@el7lm.com',
        password: 'Password123!',
        phone: '+974 5512 3456',
        country: 'قطر',
        is_active: true,
        created_at: '2026-04-05T17:17:41.871119+00:00',
        _tournament_count: 1,
    },
    {
        id: 'bff3982f-6ba3-4be5-9118-461e9e113543',
        supabase_auth_id: 'e1de57e5-c39a-4af3-8522-6f029ce330ac',
        name: 'salah',
        organization_name: 'aamf',
        email: 'salah@el7lm.com',
        password: '123456789',
        phone: '+20',
        country: 'مصر',
        is_active: true,
        created_at: '2026-09-13T22:41:39.322Z',
        _tournament_count: 3,
    },
];
