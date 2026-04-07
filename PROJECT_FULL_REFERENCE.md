# مرجع المشروع الشامل — El7lm V2
**آخر تحديث:** 2026-04-07  
**المشروع:** منصة حلم — إدارة كرة القدم والبطولات

---

## جدول المحتويات
1. [نظرة عامة](#1-نظرة-عامة)
2. [التقنيات والمكتبات](#2-التقنيات-والمكتبات)
3. [هيكل المجلدات](#3-هيكل-المجلدات)
4. [متغيرات البيئة](#4-متغيرات-البيئة)
5. [قاعدة البيانات — Prisma Models](#5-قاعدة-البيانات--prisma-models)
6. [الصفحات الكاملة (Pages)](#6-الصفحات-الكاملة-pages)
7. [API Routes الكاملة](#7-api-routes-الكاملة)
8. [بوابة البطولات — تفصيل كامل](#8-بوابة-البطولات--تفصيل-كامل)
9. [مكتبات الـ Lib](#9-مكتبات-الـ-lib)
10. [المكونات (Components)](#10-المكونات-components)
11. [SQL Views في Supabase](#11-sql-views-في-supabase)
12. [نقاط مهمة وملاحظات تقنية](#12-نقاط-مهمة-وملاحظات-تقنية)

---

## 1. نظرة عامة

منصة متكاملة لإدارة كرة القدم تشمل:
- **لاعبين** — ملف شخصي، فيديوهات، إحصائيات، فرص
- **أندية وأكاديميات** — إدارة اللاعبين، العقود، الترشيحات
- **وكلاء ومدربون** — متابعة اللاعبين والصفقات
- **مسؤولو البطولات** — بوابة مستقلة لإدارة البطولات
- **إدارة النظام** — لوحة تحكم كاملة لإدارة كل شيء

---

## 2. التقنيات والمكتبات

### الإطار الأساسي
| المكتبة | الإصدار | الاستخدام |
|---|---|---|
| `next` | 14.2.35 | إطار عمل React + SSR |
| `react` | 18.2.0 | واجهة المستخدم |
| `typescript` | 5.5.4 | لغة البرمجة |
| `tailwindcss` | 3.4.0 | تنسيق CSS |

### قاعدة البيانات والتخزين
| المكتبة | الإصدار | الاستخدام |
|---|---|---|
| `@prisma/client` | 5.7.0 | ORM لـ PostgreSQL |
| `@supabase/supabase-js` | 2.43.4 | Supabase client (بيانات فقط) |
| `@supabase/ssr` | 0.1.0 | Supabase في SSR |
| `@aws-sdk/client-s3` | 3.955.0 | Cloudflare R2 (ميديا) |

### مصادقة
| المكتبة | الإصدار | الاستخدام |
|---|---|---|
| `firebase` | (متعددة) | مصادقة المستخدمين الرئيسيين |
| `firebase-admin` | (متعددة) | عمليات server-side |
| Supabase Auth | — | مصادقة عملاء البطولات |

### دفع
| الخدمة | الاستخدام |
|---|---|
| Geidea | بطاقات ائتمانية (مدى، فيزا، ماستركارد) |
| SkipCash | محافظ رقمية |

### تواصل
| الخدمة | الاستخدام |
|---|---|
| Resend | البريد الإلكتروني |
| Chataman | WhatsApp التسويقي |
| BEON SMS | رسائل SMS / OTP |

### واجهة المستخدم
| المكتبة | الاستخدام |
|---|---|
| `lucide-react` | أيقونات |
| `@radix-ui/*` | مكونات Headless (dialog, dropdown, etc.) |
| `framer-motion` | رسوميات متحركة |
| `sonner` | toast notifications (بوابة البطولات) |
| `react-toastify` | toast (الموقع الرئيسي) |
| `react-hook-form` | إدارة النماذج |
| `zod` | التحقق من البيانات |
| `recharts` | رسوم بيانية |
| `swiper` | شرائح صور |
| `date-fns` + `dayjs` | معالجة التواريخ |
| `papaparse` | استيراد CSV |
| `xlsx` | تصدير Excel |
| `jspdf` + `html2canvas` | تصدير PDF |

---

## 3. هيكل المجلدات

```
El7lm-V2-1/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # صفحات المصادقة
│   │   ├── about/
│   │   ├── admin/                    # صفحات Admin القديمة
│   │   ├── api/                      # API Routes
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── chataman/
│   │   │   ├── geidea/
│   │   │   ├── invoices/
│   │   │   ├── notifications/
│   │   │   ├── public/
│   │   │   ├── skipcash/
│   │   │   ├── storage/
│   │   │   └── tournament-portal/
│   │   ├── careers/
│   │   ├── contact/
│   │   ├── dashboard/
│   │   │   ├── [accountType]/
│   │   │   ├── academy/
│   │   │   ├── admin/
│   │   │   ├── club/
│   │   │   ├── player/
│   │   │   └── trainer/
│   │   ├── platform/
│   │   ├── profile/
│   │   ├── tournament-portal/
│   │   │   ├── [id]/
│   │   │   │   ├── bracket/
│   │   │   │   ├── draw/
│   │   │   │   ├── groups/
│   │   │   │   ├── matches/
│   │   │   │   ├── notifications/
│   │   │   │   ├── overview/
│   │   │   │   ├── registrations/
│   │   │   │   ├── schedule/
│   │   │   │   ├── setup/
│   │   │   │   ├── stats/
│   │   │   │   ├── _components/
│   │   │   │   └── layout.tsx
│   │   │   ├── _components/
│   │   │   ├── login/
│   │   │   ├── new/
│   │   │   ├── register/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── tournaments/
│   │   └── videos/
│   ├── components/                   # مكونات React (200+)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── club/
│   │   ├── landing/
│   │   ├── layout/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   ├── payments/
│   │   ├── player/
│   │   ├── shared/
│   │   ├── ui/
│   │   └── video/
│   ├── lib/                          # مكتبات (100+ وحدة)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── content/
│   │   ├── firebase/
│   │   ├── notifications/
│   │   ├── payments/
│   │   ├── pricing/
│   │   ├── storage/
│   │   ├── supabase/
│   │   ├── tournament-portal/
│   │   ├── utils/
│   │   └── video/
│   ├── hooks/                        # Custom hooks (14)
│   ├── types/                        # TypeScript types
│   ├── constants/
│   └── styles/
├── prisma/
│   ├── schema.prisma                 # 78 model, 2112 سطر
│   └── migrations/
├── public/
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 4. متغيرات البيئة

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # ⚠️ server-side فقط
```

### قاعدة البيانات (PostgreSQL)
```env
DATABASE_URL=postgresql://...?pgbouncer=true   # مع pgBouncer
DIRECT_URL=postgresql://...                    # اتصال مباشر لـ migrations
```

### Cloudflare R2 (التخزين الأساسي للميديا)
```env
NEXT_PUBLIC_STORAGE_PROVIDER=cloudflare
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=
NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID=
NEXT_PUBLIC_CLOUDFLARE_R2_SECRET_ACCESS_KEY=
NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT=https://xxxx.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET=
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://assets.el7lm.com
```

### Firebase
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
```

### Geidea (بطاقات ائتمانية)
```env
GEIDEA_MERCHANT_PUBLIC_KEY=
GEIDEA_API_PASSWORD=
GEIDEA_BASE_URL=https://api.merchant.geidea.net
NEXT_PUBLIC_GEIDEA_ENVIRONMENT=production
```

### SkipCash
```env
SKIPCASH_CLIENT_ID=
SKIPCASH_KEY_ID=
SKIPCASH_SECRET_KEY=
SKIPCASH_WEBHOOK_KEY=
SKIPCASH_MODE=production
```

### تواصل
```env
RESEND_API_KEY=                         # بريد إلكتروني
BEON_API_TOKEN=                         # SMS
BEON_WHATSAPP_TOKEN=                    # WhatsApp
BABASERVICE_ACCESS_TOKEN=               # WhatsApp بديل
CHATAMAN_API_KEY=                       # WhatsApp تسويقي
```

---

## 5. قاعدة البيانات — Prisma Models

**إجمالي: 78 نموذج**

### المستخدمون (8 models)
| Model | الجدول | الحقول الرئيسية |
|---|---|---|
| `User` | `users` | id, email, full_name, phone, accountType, status |
| `Player` | `players` | id, full_name, phone, city, primary_position, profile_image_url (TEXT), birth_date, isDeleted |
| `Club` | `clubs` | id, name, full_name, phone, city, logo (TEXT), isDeleted |
| `Academy` | `academies` | id, academy_name, full_name, phone, city, profile_image (TEXT), isDeleted |
| `Trainer` | `trainers` | id, full_name, phone, current_location, profile_image (TEXT), isDeleted |
| `Agent` | `agents` | id, full_name, phone |
| `Marketer` | `marketers` | id, full_name, phone |
| `Admin` | `admins` | id, email, role |

> ⚠️ **تحذير مهم:** حقل `profile_image` في جدول `players` القديم كان JSONB — الحقل الصحيح هو `profile_image_url` (TEXT)

### الموظفون
| Model | الجدول | الحقول الرئيسية |
|---|---|---|
| `Employee` | `employees` | id, email, full_name, role, permissions[] |

### البطولات (13 model) — الأهم
| Model | الجدول | الحقول الرئيسية |
|---|---|---|
| `TournamentNew` | `tournament_new` | id, name, slug, logo_url, start_date, end_date, status, client_id |
| `TournamentClient` | `tournament_clients` | id, email, name, organization_name |
| `TournamentCategory` | `tournament_categories` | id, tournament_id, name, type (league/groups_knockout/knockout), group_count, teams_per_group |
| `TournamentTeam` | `tournament_teams` | id, tournament_id, category_id, name, logo_url, status (pending/approved/rejected), group_id, notes, registered_at |
| `TournamentPlayer` | `tournament_players` | id, team_id, name, position, jersey_number, date_of_birth, phone, status |
| `TournamentGroup` | `tournament_groups` | id, tournament_id, category_id, name, sort_order |
| `TournamentMatch` | `tournament_matches` | id, tournament_id, category_id, group_id, home_team_id, away_team_id, home_score, away_score, status, stage, match_date |
| `TournamentMatchEvent` | `tournament_match_events` | id, match_id, team_id, player_id, event_type (goal/yellow_card/red_card), minute |
| `TournamentStanding` | `tournament_standings` | id, tournament_id, category_id, team_id, group_id, played, won, drawn, lost, goals_for, goals_against, goal_diff, points |
| `TournamentTopScorer` | `tournament_top_scorers` | id, tournament_id, player_id, goals, assists |
| `TournamentTeamReg` | `tournament_team_regs` | id, tournament_id, team_id, payment_status, payment_amount, receipt_url |
| `TournamentRegistration` | `tournament_registrations` | id, tournament_id, user_id |
| `TournamentNotif` | `tournament_notifications` | id, tournament_id, title, message, sent_at |

### الدفع والاشتراكات (7 models)
| Model | الجدول | الحقول الرئيسية |
|---|---|---|
| `Payment` | `payments` | id, user_id, amount, status, method, gateway |
| `Invoice` | `invoices` | id, user_id, amount, status, items[], due_date |
| `Subscription` | `subscriptions` | id, user_id, plan_id, status, start_date, end_date |
| `SubscriptionPlan` | `subscription_plans` | id, name, price, duration, features[] |
| `GeideaPayment` | `geidea_payments` | id, order_id, amount, status, merchant_ref |
| `BulkPayment` | `bulk_payments` | id, admin_id, total_amount, count |
| `PromotionalOffer` | `promotional_offers` | id, title, discount_percent, expiry_date |

### الإشعارات (6 models)
| Model | الجدول | الوظيفة |
|---|---|---|
| `Notification` | `notifications` | إشعار عام |
| `AdminNotification` | `admin_notifications` | إشعار للإدارة |
| `SmartNotification` | `smart_notifications` | إشعار ذكي مستهدف |
| `InteractionNotification` | `interaction_notifications` | إشعار عند تفاعل شخص مع ملف شخصي |
| `PlayerNotification` | `player_notifications` | إشعار خاص بلاعب |
| `JoinRequestNotification` | `join_request_notifications` | إشعار طلب انضمام |

### السجلات والأمان
| Model | الجدول | الوظيفة |
|---|---|---|
| `AdminLog` | `admin_logs` | سجل عمليات الإدارة |
| `EmailLog` | `email_logs` | سجل البريد المرسل |
| `SecurityLog` | `security_logs` | سجل الأحداث الأمنية |
| `OtpCode` | `otp_codes` | رموز OTP |
| `PasswordResetToken` | `password_reset_tokens` | رموز استرجاع كلمة المرور |

---

## 6. الصفحات الكاملة (Pages)

### الصفحات العامة
| المسار | الوظيفة |
|---|---|
| `/` | الصفحة الرئيسية |
| `/about` | معلومات عن المنصة |
| `/contact` | التواصل |
| `/privacy` | سياسة الخصوصية |
| `/terms` | الشروط والأحكام |
| `/support` | الدعم الفني |
| `/success-stories` | قصص النجاح |
| `/careers` | فرص العمل |
| `/careers/apply` | تقديم على وظيفة |
| `/platform` | صفحة المنصة |
| `/videos` | فيديوهات |
| `/offline` | صفحة بدون إنترنت (PWA) |

### المصادقة
| المسار | الوظيفة |
|---|---|
| `/auth/login` | تسجيل دخول |
| `/auth/register` | إنشاء حساب |
| `/auth/select-role` | اختيار نوع الحساب |
| `/auth/forgot-password` | نسيت كلمة المرور |
| `/auth/reset-password` | إعادة تعيين كلمة المرور |
| `/auth/callback` | OAuth callback |

### البطولات العامة
| المسار | الوظيفة |
|---|---|
| `/tournaments` | قائمة البطولات |
| `/tournaments/[slug]` | تفاصيل بطولة |
| `/tournaments/[slug]/register` | التسجيل في بطولة |
| `/tournaments/unified-registration` | تسجيل موحد |

### لوحة التحكم — لاعب
| المسار | الوظيفة |
|---|---|
| `/dashboard/player` | الرئيسية |
| `/dashboard/player/profile` | الملف الشخصي |
| `/dashboard/player/videos` | الفيديوهات |
| `/dashboard/player/videos/upload` | رفع فيديو |
| `/dashboard/player/career` | المسار المهني |
| `/dashboard/player/billing` | الفواتير |
| `/dashboard/player/stats` | الإحصائيات |
| `/dashboard/player/reports` | التقارير |
| `/dashboard/player/academy` | الأكاديميات |
| `/dashboard/player/opportunities` | الفرص |
| `/dashboard/player/notifications` | الإشعارات |
| `/dashboard/player/ai-messenger` | AI Messenger |
| `/dashboard/player/subscription` | الاشتراك |

### لوحة التحكم — نادي
| المسار | الوظيفة |
|---|---|
| `/dashboard/club` | الرئيسية |
| `/dashboard/club/players` | اللاعبون |
| `/dashboard/club/players/[id]` | تفاصيل لاعب |
| `/dashboard/club/contracts` | العقود |
| `/dashboard/club/negotiations` | المفاوضات |
| `/dashboard/club/billing` | الفواتير |
| `/dashboard/club/subscription` | الاشتراك |
| `/dashboard/club/opportunities` | الفرص |

### لوحة التحكم — أكاديمية
| المسار | الوظيفة |
|---|---|
| `/dashboard/academy` | الرئيسية |
| `/dashboard/academy/players` | اللاعبون |
| `/dashboard/academy/players/add` | إضافة لاعب |
| `/dashboard/academy/billing` | الفواتير |
| `/dashboard/academy/subscription-status` | حالة الاشتراك |

### لوحة التحكم — إدارة
| المسار | الوظيفة |
|---|---|
| `/dashboard/admin` | الرئيسية |
| `/dashboard/admin/users` | المستخدمون |
| `/dashboard/admin/users/players` | اللاعبون |
| `/dashboard/admin/users/clubs` | الأندية |
| `/dashboard/admin/users/academies` | الأكاديميات |
| `/dashboard/admin/payments` | المدفوعات |
| `/dashboard/admin/invoices` | الفواتير (المركز المالي) |
| `/dashboard/admin/geidea-transactions` | معاملات Geidea |
| `/dashboard/admin/media` | إدارة الوسائط |
| `/dashboard/admin/emails` | البريد الإلكتروني |
| `/dashboard/admin/whatsapp` | WhatsApp |
| `/dashboard/admin/send-notifications` | إرسال إشعارات |
| `/dashboard/admin/tournaments` | البطولات |
| `/dashboard/admin/content` | المحتوى |
| `/dashboard/admin/pricing-management` | الأسعار والخطط |
| `/dashboard/admin/ai-messenger` | AI Messenger |
| `/dashboard/admin/settings` | الإعدادات |
| `/dashboard/admin/employees` | الموظفون |
| `/dashboard/admin/analytics` | التحليلات |
| `/dashboard/admin/security` | الأمان |

---

## 7. API Routes الكاملة

### مصادقة `/api/auth/`
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/auth/check-user-exists` | POST | التحقق من وجود مستخدم |
| `/api/auth/check-user` | POST | فحص بيانات المستخدم |
| `/api/auth/find-user-by-phone` | POST | البحث برقم الهاتف |
| `/api/auth/create-user-with-phone` | POST | إنشاء حساب بالهاتف |
| `/api/auth/otp-login` | POST | تسجيل دخول بـ OTP |
| `/api/auth/verify-otp-and-check` | POST | التحقق من OTP |
| `/api/auth/send-verification-link` | POST | إرسال رابط تحقق |
| `/api/auth/reset-password` | POST | تعيين كلمة مرور |
| `/api/auth/generate-reset-link` | POST | رابط استرجاع |
| `/api/auth/verify-reset-token` | POST | التحقق من رابط الاسترجاع |
| `/api/auth/use-reset-token` | POST | استخدام رمز الاسترجاع |
| `/api/auth/sync-user-to-auth` | POST | مزامنة مع Firebase |
| `/api/auth/update-email` | POST | تحديث البريد |
| `/api/auth/verify-and-sync-user` | POST | تحقق + مزامنة |

### بوابة البطولات `/api/tournament-portal/`
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/tournament-portal/groups` | GET | جلب المجموعات |
| `/api/tournament-portal/groups` | POST | إنشاء مجموعات (دفعة أو واحدة) |
| `/api/tournament-portal/groups` | PATCH | تعديل اسم مجموعة |
| `/api/tournament-portal/groups` | DELETE | حذف مجموعة |
| `/api/tournament-portal/save-draw` | POST | حفظ توزيع القرعة |
| `/api/tournament-portal/generate-group-matches` | POST | توليد مباريات round-robin |
| `/api/tournament-portal/team-players` | GET | جلب لاعبي فريق |
| `/api/tournament-portal/team-players` | POST | إضافة لاعب لفريق |
| `/api/tournament-portal/team-players` | DELETE | حذف لاعب |
| `/api/tournament-portal/import-team` | POST | استيراد فريق من المنصة |
| `/api/tournament-portal/search-platform-users` | GET | البحث في المنصة (لاعبين/أندية) |
| `/api/tournament-portal/debug-tables` | GET | تصحيح (dev only) |

### البطولات العامة `/api/public/tournaments/`
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/public/tournaments/[slug]` | GET | بيانات بطولة عامة |
| `/api/public/tournaments/[slug]/bracket` | GET | شجرة الإقصاء |
| `/api/public/tournaments/[slug]/matches` | GET | المباريات |
| `/api/public/tournaments/[slug]/standings` | GET | الترتيب |
| `/api/public/tournaments/[slug]/scorers` | GET | الهدافون |

### الدفع
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/geidea/*` | POST | معاملات Geidea |
| `/api/skipcash/*` | POST | معاملات SkipCash |
| `/api/invoices/[id]` | GET/POST | فاتورة |
| `/api/invoices/[id]/send-email` | POST | إرسال فاتورة |

### الإشعارات
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/notifications/dispatch` | POST | إرسال إشعار |
| `/api/notifications/broadcast-whatsapp` | POST | بث WhatsApp |
| `/api/notifications/interaction` | POST | إشعار تفاعل |
| `/api/notifications/sms/send` | POST | إرسال SMS |

### تواصل
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/chataman/test-send` | POST | اختبار Chataman |
| `/api/chataman/test-video-notification` | POST | إشعار فيديو |
| `/api/admin/send-email` | POST | إرسال بريد إداري |

### الإدارة
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/admin/users/count` | GET | عدد المستخدمين |
| `/api/admin/users/purge` | DELETE | حذف مستخدمين |
| `/api/admin/employees/create` | POST | إنشاء موظف |
| `/api/admin/employees/delete` | DELETE | حذف موظف |
| `/api/admin/employees/reset-password` | POST | إعادة تعيين كلمة مرور موظف |
| `/api/admin/sync-employees` | POST | مزامنة الموظفين |
| `/api/admin/content` | GET/POST | المحتوى |
| `/api/admin/settings` | GET/POST | الإعدادات |
| `/api/admin/media/count` | GET | عدد الوسائط |
| `/api/admin/ads/count` | GET | عدد الإعلانات |
| `/api/admin/migrate-email` | POST | ترحيل البريد |
| `/api/admin/sync-users-dates` | POST | مزامنة تواريخ المستخدمين |
| `/api/admin/tournament-clients/*` | CRUD | عملاء البطولات |

### تخزين وتحليل
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/storage/upload` | POST | رفع ملف لـ R2 |
| `/api/upload-voice` | POST | رفع صوت |
| `/api/analytics` | POST | تسجيل حدث تحليلات |
| `/api/media/proxy-video` | GET | بروكسي الفيديو |

### صحة وتشخيص
| Endpoint | Method | الوظيفة |
|---|---|---|
| `/api/health` | GET | صحة التطبيق |
| `/api/ping` | GET | ping |
| `/api/debug-player` | POST | تصحيح بيانات لاعب |
| `/api/debug/check-account` | GET | فحص حساب |

---

## 8. بوابة البطولات — تفصيل كامل

### المصادقة
```typescript
// src/lib/tournament-portal/auth.ts
createPortalClient()          // Supabase client (anon key)
signInClient(email, password) // تسجيل دخول
signOutClient()               // تسجيل خروج
getCurrentClient()            // الحصول على الجلسة الحالية

interface TournamentClient {
    id: string;
    email: string;
    name?: string;
    organization_name?: string;
}
```

> ⚠️ **مهم:** `createPortalClient()` يستخدم مفتاح anon — عمليات الكتابة تحتاج API routes بـ `SUPABASE_SERVICE_ROLE_KEY`

### صفحات البطولة

#### `/tournament-portal/[id]/overview`
- إحصائيات: عدد الفرق المقبولة، المعلقة، المرفوضة
- معلومات البطولة الأساسية
- رابط الصفحة العامة

#### `/tournament-portal/[id]/setup`
- إنشاء/تعديل/حذف فئات البطولة
- أنواع الفئات: `league` / `groups_knockout` / `knockout`
- حقول: الاسم، النوع، عدد المجموعات، عدد الفرق بالمجموعة

#### `/tournament-portal/[id]/registrations`
**الميزات:**
- عرض الفرق مع: الاسم، الفئة، الحالة، الدفع، عدد اللاعبين، تاريخ التسجيل، مصدر التسجيل
- تبويبات لكل فريق: معلومات | لاعبون | استيراد من المنصة
- إضافة لاعبين يدوياً أو استيرادهم من المنصة
- قبول/رفض الفرق
- إضافة فريق: يدوي أو استيراد من المنصة
- البحث في المنصة: لاعبين وأندية وأكاديميات ومدربين

#### `/tournament-portal/[id]/draw`
**الميزات:**
- إنشاء مجموعات (عداد + / −)
- قرعة عشوائية مع مراعاة البذور (seeds)
- **نقل فريق:** نقر → تحديد → نقر على مجموعة أخرى
- **تبديل فريقين:** نقر على فريق محدد → نقر على فريق آخر
- **إزالة من مجموعة:** زر X على الفريق
- قائمة "غير موزعة" مع dropdown للنقل السريع
- حفظ عبر API (service_role)

#### `/tournament-portal/[id]/groups`
**الميزات:**
- إنشاء مجموعات دفعة (مع تحديد العدد)
- إضافة مجموعة واحدة (حقل نص + Enter)
- تعديل اسم مجموعة inline
- حذف مجموعة
- جداول الترتيب لكل مجموعة
- إعادة حساب الترتيب من نتائج المباريات

#### `/tournament-portal/[id]/matches`
**الميزات:**
- عرض المباريات مجدولة
- توليد مباريات المجموعات (round-robin) تلقائياً
- إدخال النتائج
- تسجيل أحداث: أهداف، بطاقات صفراء/حمراء

#### `/tournament-portal/[id]/bracket`
- شجرة الإقصاء (knockout bracket)
- عرض المراحل: ثمن النهائي، ربع النهائي، نصف النهائي، النهائي

#### `/tournament-portal/[id]/stats`
- الترتيب العام
- هدافو البطولة

### جداول البطولات في Supabase

```sql
-- الجداول الرئيسية
tournament_new          -- البطولة
tournament_clients      -- مسؤولو البطولة
tournament_categories   -- الفئات (league/groups_knockout/knockout)
tournament_teams        -- الفرق المسجلة
tournament_players      -- لاعبو كل فريق
tournament_groups       -- المجموعات
tournament_matches      -- المباريات
tournament_match_events -- أحداث المباريات (أهداف، بطاقات)
tournament_standings    -- الترتيب
tournament_top_scorers  -- الهدافون
tournament_team_regs    -- تسجيلات الدفع
```

---

## 9. مكتبات الـ Lib

### `src/lib/supabase/`
| الملف | الوظيفة |
|---|---|
| `config.tsx` | إعداد Supabase client |
| `server.ts` | Supabase server-side |
| `storage.ts` | إدارة التخزين |
| `video-storage.ts` | تخزين الفيديوهات |
| `admin.ts` | عمليات إدارية |
| `image-utils.ts` | **تحويل روابط الصور** |

```typescript
// image-utils.ts — الدالة الرئيسية
getSupabaseImageUrl(path: string, bucket: string): string
// تحوّل: مسار نسبي / رابط Supabase القديم → رابط Cloudflare R2
// https://assets.el7lm.com/{bucket}/{path}
```

### `src/lib/firebase/`
| الملف | الوظيفة |
|---|---|
| `config.ts` | إعداد Firebase |
| `admin.ts` | Firebase Admin SDK |
| `auth-provider.tsx` | موفر مصادقة React |
| `push-notifications.ts` | إشعارات Firebase |
| `upload-media.ts` | رفع وسائط |
| `opportunities.ts` | الفرص |
| `error-handler.ts` | معالجة أخطاء Firebase |

### `src/lib/storage/`
```
providers/
├── cloudflare-provider.ts   # Cloudflare R2 (الأساسي)
├── supabase-provider.ts     # Supabase Storage (قديم)
└── hybrid-provider.ts       # هجين
```

### `src/lib/utils/`
| الملف | الوظيفة |
|---|---|
| `cloudflare-r2-utils.ts` | أدوات R2 (fixReceiptUrl) |
| `age-calculator.ts` | حساب العمر |
| `subscription-manager.ts` | إدارة الاشتراكات |
| `player-login-account.ts` | حساب تسجيل دخول اللاعب |
| `file.ts` | معالجة الملفات |
| `debug-logger.ts` | تسجيل للتصحيح |

---

## 10. المكونات (Components)

### `src/components/layout/`
- `ResponsiveLayout.tsx` — الهيكل الرئيسي للموقع (sidebar, navbar)
- `MobileNav.tsx` — شريط التنقل للجوال
- `Header.tsx` — رأس الصفحة

### `src/components/notifications/`
- `NotificationsManager.tsx` — مدير الإشعارات الرئيسي
- `SmartNotificationBell.tsx` — جرس الإشعارات

### `src/components/payments/`
- `GeideaPaymentButton.tsx` — زر دفع Geidea
- `SkipCashPaymentButton.tsx` — زر دفع SkipCash
- `InvoiceCard.tsx` — بطاقة الفاتورة

### `src/components/player/`
- `PlayerResume.tsx` — السيرة الذاتية للاعب
- `PlayerCard.tsx` — بطاقة لاعب
- `PlayerStats.tsx` — إحصائيات

### `src/components/shared/`
- `PlayersSearchPage.tsx` — صفحة بحث اللاعبين
- `VideoPlayer.tsx` — مشغل الفيديو
- `ImageUpload.tsx` — رفع الصور

### `src/components/ui/`
مكونات Radix UI مخصصة:
- `Button`, `Input`, `Select`, `Dialog`, `Sheet`
- `Accordion`, `Tabs`, `Badge`, `Avatar`
- `DataTable`, `Calendar`, `Toast`

### بوابة البطولات
```
src/app/tournament-portal/
├── _components/
│   ├── PortalShell.tsx    # الهيكل + Sidebar + Toaster
│   └── TournamentNav.tsx  # شريط التنقل بين صفحات البطولة
```

---

## 11. SQL Views في Supabase

**يجب أن تكون موجودة في قاعدة البيانات:**

```sql
-- البحث عن اللاعبين
CREATE OR REPLACE VIEW v_players_search AS
SELECT 
    id,
    full_name AS display_name,
    phone,
    city,
    primary_position AS position,
    birth_date AS date_of_birth,
    NULLIF(profile_image_url, '') AS avatar_url,
    'player' AS account_type
FROM players 
WHERE "isDeleted" IS NOT TRUE;

-- البحث عن الأندية
CREATE OR REPLACE VIEW v_clubs_search AS
SELECT 
    id,
    COALESCE(NULLIF(name,''), NULLIF(full_name,'')) AS display_name,
    phone,
    city,
    NULLIF(logo,'') AS avatar_url,
    'club' AS account_type
FROM clubs 
WHERE "isDeleted" IS NOT TRUE;

-- البحث عن الأكاديميات
CREATE OR REPLACE VIEW v_academies_search AS
SELECT 
    id,
    COALESCE(NULLIF(academy_name,''), NULLIF(full_name,''), NULLIF(name,'')) AS display_name,
    phone,
    city,
    NULLIF(profile_image,'') AS avatar_url,
    'academy' AS account_type
FROM academies 
WHERE "isDeleted" IS NOT TRUE;

-- البحث عن المدربين
CREATE OR REPLACE VIEW v_trainers_search AS
SELECT 
    id,
    NULLIF(full_name,'') AS display_name,
    phone,
    current_location AS city,
    NULLIF(profile_image,'') AS avatar_url,
    'trainer' AS account_type
FROM trainers 
WHERE "isDeleted" IS NOT TRUE;

-- منح الصلاحيات
GRANT SELECT ON v_players_search, v_clubs_search, v_academies_search, v_trainers_search
    TO anon, authenticated, service_role;
```

---

## 12. نقاط مهمة وملاحظات تقنية

### أولاً: بنية التخزين
```
Firebase → متوقف (مصادقة المستخدمين الرئيسيين فقط)
Supabase → قاعدة بيانات + مصادقة عملاء البطولات
Cloudflare R2 → كل الميديا (صور، فيديوهات، مستندات)
  - الدومين العام: https://assets.el7lm.com
  - Buckets: avatars, clubavatar, videos, documents
```

### ثانياً: مشكلة JSONB في جداول قديمة
```
جدول players:
  - profile_image → JSONB (قديم، لا تستخدمه)
  - profile_image_url → TEXT ✅ (الصحيح)

جدول clubs:
  - logo → TEXT ✅
  - profile_image → JSONB في بعض الحالات (احذر)

جدول academies:
  - profile_image → TEXT ✅

جدول trainers:
  - profile_image → TEXT ✅
```

### ثالثاً: Firebase IDs ≠ UUIDs
```
Firebase User IDs مثل: "0dzSb82nS0fshZ0z5ep0Ypj0DXu1"
لا يمكن تخزينها في عمود UUID في PostgreSQL
→ استخدم TEXT بدلاً من UUID لأي حقل يخزن Firebase ID
```

### رابعاً: RLS في Supabase
```
createPortalClient() ← مفتاح anon ← يخضع لـ RLS
  ✅ قراءة البيانات العامة
  ❌ كتابة على tournament_groups (تحتاج service_role)
  ❌ حذف من tournament_groups (تحتاج service_role)

الحل: API Routes مع SUPABASE_SERVICE_ROLE_KEY
```

### خامساً: Toaster في بوابة البطولات
```tsx
// src/app/tournament-portal/_components/PortalShell.tsx
// يجب أن يكون موجوداً في الـ Shell
import { Toaster } from 'sonner';
<Toaster position="top-center" richColors />
```

### سادساً: حساب الصور (resolveImg)
```typescript
// المنطق لتحويل أي رابط صورة إلى Cloudflare URL:
const CF_BASE = 'https://assets.el7lm.com';

function resolveImg(path, bucket = 'avatars') {
  if (!path) return null;
  if (path.includes('assets.el7lm.com')) return path;  // ✅ موجود
  if (path.startsWith('http')) {
    // محاولة تحويل Supabase القديم
    if (path.includes('supabase.co/storage/v1/object/public/')) {
      const parts = path.split('supabase.co/storage/v1/object/public/');
      return `${CF_BASE}/${parts[1]}`;
    }
    return path;  // Google/Firebase - كما هو
  }
  // مسار نسبي
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return `${CF_BASE}/${bucket}/${clean}`;
}
```

### سابعاً: إنشاء مباريات round-robin
```
للـ N فريق في مجموعة: N*(N-1)/2 مباراة
مثال: 4 فرق → 6 مباريات
       6 فرق → 15 مباراة
       8 فرق → 28 مباراة

توليد تلقائي: /api/tournament-portal/generate-group-matches
```

### ثامناً: أنواع فئات البطولة
| النوع | المعنى | يحتاج مجموعات |
|---|---|---|
| `league` | دوري — كل فريق يواجه كل فريق | لا |
| `groups_knockout` | مجموعات + إقصاء | نعم |
| `knockout` | إقصاء مباشر | اختياري |

---

## 13. قائمة اختبار شاملة

### بوابة البطولات
- [ ] تسجيل دخول عميل البطولة
- [ ] إنشاء بطولة جديدة (wizard 4 خطوات)
- [ ] إنشاء فئة في الإعداد
- [ ] إضافة فريق يدوياً
- [ ] استيراد فريق من المنصة (بحث + استيراد)
- [ ] قبول/رفض فريق
- [ ] إضافة لاعب لفريق
- [ ] عرض عدد اللاعبين في صف الفريق
- [ ] ظهور صور الأندية والأكاديميات في البحث
- [ ] إنشاء مجموعات من صفحة المجموعات
- [ ] تعديل اسم مجموعة (inline)
- [ ] إنشاء مجموعات من صفحة القرعة
- [ ] قرعة عشوائية
- [ ] نقل فريق بين مجموعتين (click)
- [ ] تبديل فريقين (swap)
- [ ] حفظ القرعة (يستخدم service_role)
- [ ] توليد مباريات المجموعات تلقائياً
- [ ] إدخال نتيجة مباراة
- [ ] إعادة حساب الترتيب

---

*آخر تحديث: 2026-04-07 | بواسطة Claude Sonnet 4.6*
