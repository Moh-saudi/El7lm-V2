#!/usr/bin/env node

/**
 * سكريبت إصلاح مشاكل Next.js
 * يحل مشاكل ChunkLoadError و hydration errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 بدء إصلاح مشاكل Next.js...\n');

// 1. مسح مجلد .next
console.log('1️⃣ مسح مجلد .next...');
try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
    console.log('✅ تم مسح مجلد .next');
  } else {
    console.log('ℹ️ مجلد .next غير موجود');
  }
} catch (error) {
  console.log('❌ خطأ في مسح مجلد .next:', error.message);
}

// 2. مسح مجلد node_modules/.cache
console.log('\n2️⃣ مسح ذاكرة التخزين المؤقت...');
try {
  const cacheDir = path.join('node_modules', '.cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ تم مسح ذاكرة التخزين المؤقت');
  } else {
    console.log('ℹ️ مجلد الذاكرة المؤقتة غير موجود');
  }
} catch (error) {
  console.log('❌ خطأ في مسح الذاكرة المؤقتة:', error.message);
}

// 3. مسح ملفات التخزين المؤقت الأخرى
console.log('\n3️⃣ مسح ملفات التخزين المؤقت الأخرى...');
const tempFiles = [
  '.turbo',
  'dist',
  'build',
  '.swc'
];

tempFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { recursive: true, force: true });
      console.log(`✅ تم مسح ${file}`);
    }
  } catch (error) {
    console.log(`❌ خطأ في مسح ${file}:`, error.message);
  }
});

// 4. مسح npm cache
console.log('\n4️⃣ مسح npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ تم مسح npm cache');
} catch (error) {
  console.log('❌ خطأ في مسح npm cache:', error.message);
}

// 5. إعادة تثبيت التبعيات
console.log('\n5️⃣ إعادة تثبيت التبعيات...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ تم إعادة تثبيت التبعيات');
} catch (error) {
  console.log('❌ خطأ في إعادة تثبيت التبعيات:', error.message);
}

// 6. بناء المشروع
console.log('\n6️⃣ بناء المشروع...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ تم بناء المشروع بنجاح');
} catch (error) {
  console.log('❌ خطأ في بناء المشروع:', error.message);
}

console.log('\n🎉 تم الانتهاء من إصلاح مشاكل Next.js!');
console.log('\n📋 الخطوات التالية:');
console.log('1. أعد تشغيل خادم التطوير: npm run dev');
console.log('2. امسح ذاكرة التخزين المؤقت للمتصفح (Ctrl+Shift+R)');
console.log('3. تحقق من أن المشكلة تم حلها');
