# دليل النشر على Coolify

## 🎯 لماذا Coolify؟

### المزايا:
- ✅ **Self-hosted** - تحكم كامل
- ✅ **Docker-based** - بيئة معزولة
- ✅ **Git integration** - نشر تلقائي
- ✅ **SSL تلقائي** - Let's Encrypt
- ✅ **Database management** - PostgreSQL, MySQL, Redis
- ✅ **Monitoring** - logs و metrics
- ✅ **Backup تلقائي** - حماية البيانات
- ✅ **تكلفة منخفضة** - VPS واحد لعدة مشاريع

## 📋 خطوات النشر على Coolify:

### 1. إعداد Coolify:
```bash
# تثبيت Coolify على VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# الوصول إلى Coolify
# http://your-server-ip:8000
```

### 2. إعداد المشروع في Coolify:

#### أ. إنشاء مشروع جديد:
1. **اضغط على "New Project"**
2. **اختر "Git Repository"**
3. **أدخل رابط GitHub:** `https://github.com/Moh-saudi/el7lm-backup`
4. **اختر الفرع:** `main`

#### ب. إعداد البيئة:
```bash
# Environment Variables
NODE_ENV=production
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
BEON_API_TOKEN=your_beon_api_token
BEON_BASE_URL=your_beon_base_url
BEON_SMS_TOKEN=your_beon_sms_token
BEON_WHATSAPP_TOKEN=your_beon_whatsapp_token
BEON_OTP_TOKEN=your_beon_otp_token
BEON_SENDER_NAME=your_beon_sender_name
```

#### ج. إعداد البناء:
```yaml
# Build Settings
Build Pack: Dockerfile
Dockerfile: Dockerfile
Build Context: .
Port: 3000
```

### 3. إعداد النطاق:
1. **أضف النطاق** في Coolify
2. **تفعيل SSL** تلقائياً
3. **إعداد DNS** لتوجيه النطاق للخادم

### 4. إعداد قاعدة البيانات (اختياري):
```bash
# PostgreSQL
Database Type: PostgreSQL
Database Name: el7lm_db
Username: el7lm_user
Password: secure_password

# Redis (للجلسات)
Database Type: Redis
```

## 🚀 المزايا المتوقعة:

### الأداء:
- ✅ **بناء سريع** - 2-5 دقائق
- ✅ **Docker isolation** - بيئة معزولة
- ✅ **Auto-scaling** - توسع تلقائي
- ✅ **Health checks** - مراقبة الحالة

### الإدارة:
- ✅ **Git integration** - نشر تلقائي عند push
- ✅ **Environment management** - إدارة متغيرات البيئة
- ✅ **Logs monitoring** - مراقبة السجلات
- ✅ **Backup automation** - نسخ احتياطي تلقائي

### الأمان:
- ✅ **SSL تلقائي** - Let's Encrypt
- ✅ **Firewall management** - إدارة الجدار الناري
- ✅ **Access control** - تحكم في الوصول
- ✅ **Secret management** - إدارة الأسرار

## 📊 مقارنة سريعة:

| الميزة | Vercel | Hostinger | Coolify |
|--------|--------|-----------|---------|
| البناء | 45+ دقيقة | 2-5 دقائق | 2-5 دقائق |
| التكلفة | $20/شهر | $3-5/شهر | $3-5/شهر |
| التحكم | محدود | كامل | كامل |
| Docker | ❌ | ❌ | ✅ |
| Git Integration | ✅ | ❌ | ✅ |
| SSL تلقائي | ✅ | يدوي | ✅ |
| Database | محدود | يدوي | ✅ |
| Monitoring | محدود | ❌ | ✅ |
| Backup | ❌ | يدوي | ✅ |

## 🎯 النتيجة المتوقعة:
- **بناء ناجح في 2-5 دقائق**
- **نشر تلقائي عند push**
- **SSL تلقائي**
- **مراقبة شاملة**
- **نسخ احتياطي تلقائي**
- **تكلفة منخفضة**

## 📝 خطوات سريعة:

1. **تثبيت Coolify على VPS**
2. **إعداد المشروع في Coolify**
3. **إضافة متغيرات البيئة**
4. **إعداد النطاق**
5. **تفعيل SSL**
6. **الموقع جاهز!**

## 🔧 إعدادات إضافية:

### Health Check:
```bash
# في Coolify
Health Check URL: /api/health
Health Check Interval: 30s
Health Check Timeout: 10s
```

### Auto Deploy:
```bash
# تفعيل النشر التلقائي
Auto Deploy: Enabled
Branch: main
```

### Resource Limits:
```bash
# حدود الموارد
CPU: 1 core
Memory: 1GB
Storage: 10GB
```
