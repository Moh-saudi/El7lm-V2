# 🧪 اختبار ChatAman API

## اختبار الاتصال

### باستخدام المتصفح
افتح الرابط التالي في المتصفح:
```
http://localhost:3001/api/chataman/test
```

### باستخدام curl
```bash
curl http://localhost:3001/api/chataman/test
```

### النتيجة المتوقعة
```json
{
  "success": true,
  "message": "الاتصال مع ChatAman API يعمل بنجاح! ✅",
  "connection": { ... },
  "account": { ... },
  "config": {
    "baseUrl": "https://chataman.com/api",
    "enabled": "true",
    "hasToken": true
  },
  "timestamp": "2025-12-10T09:44:44.000Z"
}
```

---

## إرسال رسالة تجريبية

### 1. رسالة نصية

```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "message": "مرحباً! هذه رسالة تجريبية من منصة الحلم 🎉",
    "type": "text"
  }'
```

### 2. إرسال صورة

```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "fileUrl": "https://example.com/image.jpg",
    "caption": "صورة تجريبية",
    "type": "file"
  }'
```

### 3. إرسال ملف صوتي

```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "audioUrl": "https://example.com/audio.mp3",
    "type": "audio"
  }'
```

### 4. إرسال قالب رسالة

```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "templateName": "welcome_message",
    "parameters": {
      "name": "أحمد",
      "date": "2025-12-10"
    },
    "type": "template"
  }'
```

---

## باستخدام JavaScript/TypeScript

### في المتصفح أو Next.js

```typescript
// اختبار الاتصال
const testConnection = async () => {
  const response = await fetch('/api/chataman/test');
  const data = await response.json();
  console.log(data);
};

// إرسال رسالة
const sendTestMessage = async () => {
  const response = await fetch('/api/chataman/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: '+966501234567',
      message: 'مرحباً! رسالة تجريبية',
      type: 'text'
    })
  });
  
  const data = await response.json();
  console.log(data);
};
```

---

## استخدام Postman

### 1. اختبار الاتصال
- **Method:** GET
- **URL:** `http://localhost:3001/api/chataman/test`

### 2. إرسال رسالة
- **Method:** POST
- **URL:** `http://localhost:3001/api/chataman/test`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "phone": "+966501234567",
  "message": "مرحباً! هذه رسالة تجريبية",
  "type": "text"
}
```

---

## ⚠️ ملاحظات مهمة

1. **رقم الهاتف:** يجب أن يكون بالصيغة الدولية (`+966...`)
2. **الخادم:** تأكد من تشغيل الخادم على المنفذ 3001
3. **المتغيرات:** تأكد من وجود `CHATAMAN_ACCESS_TOKEN` في `.env.local`

---

## 🐛 حل المشاكل

### خطأ: "CHATAMAN_ACCESS_TOKEN غير موجود"
**الحل:** أضف المفتاح إلى `.env.local`:
```bash
CHATAMAN_ACCESS_TOKEN=lmVt2Y62QMdZUp52JnkTeJNhgKERlCA92Oyv1aEh
```

### خطأ: "خدمة ChatAman غير مفعلة"
**الحل:** فعّل الخدمة في `.env.local`:
```bash
CHATAMAN_ENABLED=true
```

### خطأ: "رقم الهاتف يجب أن يكون بالصيغة الدولية"
**الحل:** استخدم الصيغة: `+966501234567` (ابدأ بـ + ثم كود الدولة)

---

## 📝 أمثلة إضافية

### إرسال رسالة ترحيب
```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "message": "مرحباً بك في منصة الحلم! 🎉\n\nنحن سعداء بانضمامك إلينا.\nإذا كان لديك أي استفسار، لا تتردد في التواصل معنا.",
    "type": "text"
  }'
```

### إرسال فاتورة
```bash
curl -X POST http://localhost:3001/api/chataman/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "fileUrl": "https://example.com/invoice.pdf",
    "caption": "📄 فاتورة رقم: INV-12345\n💵 المبلغ: 500 ريال\n\nشكراً لتعاملكم معنا!",
    "type": "file"
  }'
```
