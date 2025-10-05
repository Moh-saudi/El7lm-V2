@echo off
echo 🔧 بدء إصلاح مشاكل Next.js...
echo.

echo 1️⃣ مسح مجلد .next...
if exist .next (
    rmdir /s /q .next
    echo ✅ تم مسح مجلد .next
) else (
    echo ℹ️ مجلد .next غير موجود
)

echo.
echo 2️⃣ مسح ذاكرة التخزين المؤقت...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo ✅ تم مسح ذاكرة التخزين المؤقت
) else (
    echo ℹ️ مجلد الذاكرة المؤقتة غير موجود
)

echo.
echo 3️⃣ مسح ملفات التخزين المؤقت الأخرى...
if exist .turbo rmdir /s /q .turbo
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
if exist .swc rmdir /s /q .swc
echo ✅ تم مسح الملفات المؤقتة

echo.
echo 4️⃣ مسح npm cache...
call npm cache clean --force
echo ✅ تم مسح npm cache

echo.
echo 5️⃣ إعادة تثبيت التبعيات...
call npm install
echo ✅ تم إعادة تثبيت التبعيات

echo.
echo 🎉 تم الانتهاء من إصلاح مشاكل Next.js!
echo.
echo 📋 الخطوات التالية:
echo 1. أعد تشغيل خادم التطوير: npm run dev
echo 2. امسح ذاكرة التخزين المؤقت للمتصفح (Ctrl+Shift+R)
echo 3. تحقق من أن المشكلة تم حلها
echo.
pause
