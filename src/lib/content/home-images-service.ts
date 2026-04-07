import { supabase } from '@/lib/supabase/config';

export interface HomeImagesData {
    heroImage: string;
    heroImages: string[];
    heroMockup: string;
    heroMockups: string[];
    aboutVideoBg: string;
    tourImages: string[];
    playerImages: string[];
}

const defaultImages: HomeImagesData = {
    heroImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000',
    heroImages: [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1511886929837-354d8276626d?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1510051644266-b3b3c3c1be83?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1575361204480-aadea2d107ad?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=2000',
        'https://images.unsplash.com/photo-1431324155629-1a6eda1eedfa?auto=format&fit=crop&q=80&w=2000',
    ],
    heroMockup: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb66OeMwh9mOvKU8i2lmJ1wd0HFriOIRlTiTELXTcq6sxveWSeUYlj1ibG6kUiYgRuna7rsJ6yw6gDanex07N-9eM4TBaYwZ63cARuZKE0yx-YfmTVAD704QR4L0O1vXapYcUgcyEu4IGHPKkNPq0i0a4QG_wddbgmWGiKn30SFeTfoXLcjtnRnMOaNRUDSMtpFcA5JIo2R2Jd7rLbrCcsVYKezK625To7qfzVGlGXvYKoC9zj2LEEtsjWTKN43AqWkwUL_9G8T78',
    heroMockups: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCb66OeMwh9mOvKU8i2lmJ1wd0HFriOIRlTiTELXTcq6sxveWSeUYlj1ibG6kUiYgRuna7rsJ6yw6gDanex07N-9eM4TBaYwZ63cARuZKE0yx-YfmTVAD704QR4L0O1vXapYcUgcyEu4IGHPKkNPq0i0a4QG_wddbgmWGiKn30SFeTfoXLcjtnRnMOaNRUDSMtpFcA5JIo2R2Jd7rLbrCcsVYKezK625To7qfzVGlGXvYKoC9zj2LEEtsjWTKN43AqWkwUL_9G8T78',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBpCANwPXzcB4XNxsd5g0IzBXx85qulaAgiHB3VEV4mJ-HnKFpKiTNkRg_i5FhhltP7wmmW-xKSRcRyDAZ89f-Vla0pCdcidR6K-b8Py_4SOooyZsNK61gNzel3gnQVSJsn0hxHNjO8l8mozJm4KW-BIkOoJ5Jptaux-VEA85fEqu6AY50y215pz9GeY--ENImRv8l1pQJ_JR2ppU9lwdQpqvXyLqnQG4iF7ei90E-QbPczGapaiGskvBSJZmqG_QdAwnOn5iovOew',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAkI3L0Mpa8_973I0Ox0HL-j62lTN_3ov_unRBls1Z1jaol8ZvAWESi9wE6sDsKK2wFg7mTnrLeyXGrnLsXPh0YBDuxjsIFSB9PSbv9sdSB4hSwtWkF6Ajv2wIjX4ST4dhI8oP0Ox03xJIMnAvhb8lsGtRMukryUyWDsVhxAlyFhR-PfoM9b2L48_6DCy5hvI7tE_InVXgrKUQO5BQ7I89AHeDG_i5WpV--EEDYYfxBfBnvVUJQWTYZc6TgI-7eTUDV3zEWT_D2dds',
    ],
    aboutVideoBg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ5x1hv6Yam_5ctQ4gx21HoD0cLmcyMGjnTG_mD1y2_udS_zdljaoqjjjXXShqMnicuomYEtzH3K_4y02JyBl-wCZSaJ2UvTGRZGt-0UwH76FMh2qFKUaltOd8j2sStd0KujZvsuPgNilFZW66OVgBolg29jtT9X-IldBUvMFme_xwhaB0olsmX7MqVc5OJuAGY1aCiY2VtNwLAbhTH1kvyHQJ0N7eelQPe3Pwgj0nJFQskg_GJun1toVf1az0XCvoig9hIrwUtvY',
    tourImages: [
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800&auto=format&fit=crop',
    ],
    playerImages: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBpCANwPXzcB4XNxsd5g0IzBXx85qulaAgiHB3VEV4mJ-HnKFpKiTNkRg_i5FhhltP7wmmW-xKSRcRyDAZ89f-Vla0pCdcidR6K-b8Py_4SOooyZsNK61gNzel3gnQVSJsn0hxHNjO8l8mozJm4KW-BIkOoJ5Jptaux-VEA85fEqu6AY50y215pz9GeY--ENImRv8l1pQJ_JR2ppU9lwdQpqvXyLqnQG4iF7ei90E-QbPczGapaiGskvBSJZmqG_QdAwnOn5iovOew',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAkI3L0Mpa8_973I0Ox0HL-j62lTN_3ov_unRBls1Z1jaol8ZvAWESi9wE6sDsKK2wFg7mTnrLeyXGrnLsXPh0YBDuxjsIFSB9PSbv9sdSB4hSwtWkF6Ajv2wIjX4ST4dhI8oP0Ox03xJIMnAvhb8lsGtRMukryUyWDsVhxAlyFhR-PfoM9b2L48_6DCy5hvI7tE_InVXgrKUQO5BQ7I89AHeDG_i5WpV--EEDYYfxBfBnvVUJQWTYZc6TgI-7eTUDV3zEWT_D2dds',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB3ZDHDlZzwuUsxjVz7wq1t3xcQ9Xb5TbP3GUGsM0bXfZvCtkP1EzmxtKDQq74YF4aVjhhT6eWGkl-VxyrXs2DTyVOLrig7Fm-2kp_0WtuXBKTPyRQhfhJakA97kxzD1g9vh_auMsg0rluOCYjB6VD7o9vEn4MnrMq_F4D2uQQNLwyCRdHU_ZCAY-bMK1CgHfOdbDutBo7Jn_ryeBH4Xs_ubUFRUi0vRMinubLUYWQcOK-fd3NNWTIFTPXd45hhxeeiYk2POJCp00A',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC7pJ6T_fIPrBl66Do8SwqeB-Fx9cES7a71aJGZiyHbhp4mAd90TD9vogaKOwyeL5_SPf2RdnnIw73vCeFi1AWMfDioHk7UyaD3CJDroo9bPCSgqS5MfeXIt5IIYvpEFaEG3pc7GF2iEJE2GxkGRzp7Mi4U4SP5dHz02Di-073_IxIP6LRmUBx3y4gFplD2GQtjos7lwBoQ-sHB4_gwP04gqcgNTZd72LeWXj60MaWce2q-6RWuihXTyAhW_2Ef23GPBUfYVUc9vQA'
    ]
};

export const getHomeImages = async (): Promise<HomeImagesData> => {
    try {
        const { data } = await supabase.from('content').select('items').eq('id', 'home_images').limit(1);
        if (data?.length && data[0].items) {
            const saved = data[0].items as HomeImagesData;
            if (!saved.heroImages || saved.heroImages.length === 0) {
                saved.heroImages = defaultImages.heroImages;
            }
            if (!saved.heroMockups || saved.heroMockups.length === 0) {
                saved.heroMockups = defaultImages.heroMockups;
            }
            return saved;
        }
        return defaultImages;
    } catch (error) {
        console.error('Error fetching home images:', error);
        return defaultImages;
    }
};

export const saveHomeImages = async (images: HomeImagesData): Promise<void> => {
    try {
        await supabase.from('content').upsert({ id: 'home_images', items: images });
    } catch (error) {
        console.error('Error saving home images:', error);
        throw error;
    }
};
