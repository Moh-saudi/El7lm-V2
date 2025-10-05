# سكريبت إصلاح مشاكل Next.js
# يحل مشاكل ChunkLoadError و hydration errors

Write-Host "🔧 بدء إصلاح مشاكل Next.js..." -ForegroundColor Green
Write-Host ""

# 1. مسح مجلد .next
Write-Host "1️⃣ مسح مجلد .next..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ تم مسح مجلد .next" -ForegroundColor Green
} else {
    Write-Host "ℹ️ مجلد .next غير موجود" -ForegroundColor Blue
}

# 2. مسح مجلد node_modules/.cache
Write-Host ""
Write-Host "2️⃣ مسح ذاكرة التخزين المؤقت..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ تم مسح ذاكرة التخزين المؤقت" -ForegroundColor Green
} else {
    Write-Host "ℹ️ مجلد الذاكرة المؤقتة غير موجود" -ForegroundColor Blue
}

# 3. مسح ملفات التخزين المؤقت الأخرى
Write-Host ""
Write-Host "3️⃣ مسح ملفات التخزين المؤقت الأخرى..." -ForegroundColor Yellow
$tempFiles = @(".turbo", "dist", "build", ".swc")
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item -Recurse -Force $file
        Write-Host "✅ تم مسح $file" -ForegroundColor Green
    }
}

# 4. مسح npm cache
Write-Host ""
Write-Host "4️⃣ مسح npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "✅ تم مسح npm cache" -ForegroundColor Green
} catch {
    Write-Host "❌ خطأ في مسح npm cache: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. إعادة تثبيت التبعيات
Write-Host ""
Write-Host "5️⃣ إعادة تثبيت التبعيات..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ تم إعادة تثبيت التبعيات" -ForegroundColor Green
} catch {
    Write-Host "❌ خطأ في إعادة تثبيت التبعيات: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 تم الانتهاء من إصلاح مشاكل Next.js!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 الخطوات التالية:" -ForegroundColor Cyan
Write-Host "1. أعد تشغيل خادم التطوير: npm run dev" -ForegroundColor White
Write-Host "2. امسح ذاكرة التخزين المؤقت للمتصفح (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "3. تحقق من أن المشكلة تم حلها" -ForegroundColor White
Write-Host ""
Read-Host "اضغط Enter للمتابعة"
