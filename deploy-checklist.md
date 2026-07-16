# ✅ قائمة التحقق من النشر

## 🔧 إعدادات Coolify

### Build Settings
- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `node server.js`
- [ ] **Dockerfile**: موجود في المجلد الجذر

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `HOST=0.0.0.0`
- [ ] جميع متغيرات Firebase موجودة
- [ ] جميع متغيرات Supabase موجودة

### Health Check
- [ ] **Path**: `/`
- [ ] **Host**: `localhost` أو `0.0.0.0`
- [ ] **Port**: `3000`
- [ ] **Timeout**: `30s`
- [ ] **Interval**: `10s`

## 📁 ملفات المشروع

### الملفات المطلوبة
- [ ] `Dockerfile` (محدث)
- [ ] `next.config.js` (يحتوي على `output: 'standalone'`)
- [ ] `package.json` (لا يحتوي على `next export`)
- [ ] `.dockerignore` (محدث)
- [ ] `build.sh` (اختياري)
- [ ] `start.sh` (اختياري)

### الملفات المحذوفة
- [ ] `nixpacks.toml` (تم حذفه)
- [ ] أي ملفات تحتوي على `next export`

## 🧪 اختبار محلي

### قبل النشر
```bash
# تنظيف البناء السابق
npm run clean

# بناء التطبيق
npm run build

# التحقق من وجود server.js
ls -la .next/standalone/

# اختبار محلي (اختياري)
npm run start
```

### اختبار Docker محلي
```bash
# بناء الصورة
docker build -t el7lm-test .

# تشغيل الحاوية
docker run -p 3000:3000 el7lm-test

# اختبار الاتصال
curl http://localhost:3000
```

## 🚀 خطوات النشر

1. **Commit التغييرات**
   ```bash
   git add .
   git commit -m "Fix deployment: standalone mode and proper Dockerfile"
   git push origin main
   ```

2. **في Coolify**
   - تأكد من إعدادات البناء
   - تأكد من المتغيرات البيئية
   - تأكد من إعدادات Health Check
   - اضغط "Deploy"

3. **مراقبة النشر**
   - راقب سجلات البناء
   - راقب سجلات التطبيق
   - تحقق من Health Check

## 🔍 Troubleshooting

### إذا فشل البناء
1. تحقق من سجلات البناء في Coolify
2. تأكد من عدم وجود `next export`
3. تأكد من وجود `output: 'standalone'`

### إذا فشل التشغيل
1. تحقق من وجود `server.js`
2. تحقق من المتغيرات البيئية
3. تحقق من إعدادات Health Check

### إذا فشل Health Check
1. تأكد من أن التطبيق يعمل على Port 3000
2. تأكد من أن Host مضبوط على `0.0.0.0`
3. جرب تغيير Health Check Host

## 📞 Support

إذا واجهت أي مشاكل:
1. تحقق من سجلات Coolify
2. راجع `README-DEPLOYMENT.md`
3. جرب الاختبار المحلي أولاً 
