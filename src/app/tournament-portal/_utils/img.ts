/**
 * كل الصور تُخزَّن في Cloudflare R2 على assets.el7lm.com
 * قاعدة البيانات (Supabase) للبيانات فقط
 *
 * الأشكال الممكنة للمسار المخزَّن في قاعدة البيانات:
 *   1. رابط CF كامل:   https://assets.el7lm.com/clubavatar/abc.jpg  ✅ استخدمه مباشرة
 *   2. مسار نسبي + bucket:  clubavatar/abc.jpg                      → أضف https://assets.el7lm.com/
 *   3. اسم ملف فقط:   abc.jpg                                       → أضف https://assets.el7lm.com/{bucket}/
 *   4. رابط Supabase قديم:  https://xxx.supabase.co/storage/...    → استخرج المسار وحوّله
 *   5. رابط Firebase قديم:  https://firebasestorage.googleapis.com/o/bucket%2Ffile.jpg → استخرج المسار
 *   6. رابط Google photo:   https://lh3.googleusercontent.com/...  ✅ استخدمه مباشرة
 */

const CF = 'https://assets.el7lm.com';

/**
 * Bucket الصحيح لكل نوع حساب
 * (يطابق formData.append('bucket', ...) في صفحات الـ profile)
 * club    → clubs     (club/profile/page.tsx)
 * academy → academies (academy/profile/page.tsx)
 * trainer → trainers  (trainer/profile/page.tsx)
 * agent   → agents    (agent/profile/page.tsx)
 * player  → avatars   (في KNOWN_R2_BUCKETS)
 */
const BUCKET: Record<string, string> = {
  player:  'avatars',
  club:    'clubs',
  academy: 'academies',
  trainer: 'trainers',
  agent:   'agents',
  team:    'clubs',
};

const KNOWN_BUCKETS = [
  // Profile buckets (actual R2 buckets used by each account type)
  'clubs', 'academies', 'trainers', 'agents', 'marketers',
  // Legacy bucket names
  'playeravatar','clubavatar','academyavatar','traineravatar','agentavatar',
  // Common buckets
  'avatars','tournaments','images','el7lmplatform','profile-images',
];

export function resolveImg(
  raw: string | null | undefined,
  type: 'player'|'club'|'academy'|'trainer'|'agent'|'team' = 'team',
): string | null {
  if (!raw?.trim()) return null;
  const p = raw.trim();

  // 1. رابط CF كامل — استخدمه مباشرة
  if (p.startsWith(`${CF}/`) || p.includes('assets.el7lm.com')) {
    return p;
  }

  // 2. روابط خارجية صالحة (Google, etc.) — استخدمها مباشرة
  if (p.startsWith('http')) {
    // Firebase Storage — استخرج المسار وحوّله لـ CF
    const fbMatch = p.match(/\/o\/([^?#]+)/);
    if (fbMatch) {
      const path = decodeURIComponent(fbMatch[1]); // "clubavatar/abc.jpg"
      return `${CF}/${path}`;
    }

    // Supabase Storage — استخرج المسار وحوّله لـ CF
    if (p.includes('supabase.co')) {
      const after = p.split('/object/')[1];
      if (after) {
        const clean = after.replace(/^(public|authenticated)\//, '').split('?')[0];
        return `${CF}/${clean}`;
      }
      // fallback: خذ اسم الملف فقط
      const file = p.split('?')[0].split('/').pop();
      if (file) return `${CF}/${BUCKET[type]}/${file}`;
    }

    // أي رابط HTTP آخر — استخدمه كما هو
    return p;
  }

  // 3. مسار نسبي
  const clean = p.startsWith('/') ? p.slice(1) : p;

  // يبدأ بـ bucket معروف: "clubavatar/abc.jpg"
  if (KNOWN_BUCKETS.some(b => clean.startsWith(`${b}/`))) {
    return `${CF}/${clean}`;
  }

  // يحتوي على مسار فرعي غير معروف
  if (clean.includes('/')) return `${CF}/${clean}`;

  // اسم ملف فقط: "abc.jpg" — أضف الـ bucket المناسب
  return `${CF}/${BUCKET[type]}/${clean}`;
}

/** استنتاج نوع الحساب من الـ URL */
export function detectTypeFromUrl(url: string | null | undefined): 'player'|'club'|'academy'|'trainer'|'agent'|'team' {
  if (!url) return 'team';
  if (url.includes('playeravatar') || url.includes('/avatars/')) return 'player';
  if (url.includes('academyavatar'))  return 'academy';
  if (url.includes('traineravatar'))  return 'trainer';
  if (url.includes('agentavatar'))    return 'agent';
  if (url.includes('clubavatar'))     return 'club';
  return 'team';
}
