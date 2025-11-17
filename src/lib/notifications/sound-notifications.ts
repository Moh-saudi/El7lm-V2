/**
 * مكتبة للتنبيهات الصوتية
 * تعمل على الكمبيوتر والموبايل (بعد تفعيل المستخدم)
 */

// أنواع الأصوات المتاحة
export type SoundType = 'default' | 'success' | 'warning' | 'error' | 'info' | 'message';

// إعدادات الصوت
interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
  soundType: SoundType;
}

// الحصول على الإعدادات من localStorage
export function getSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, volume: 0.5, soundType: 'default' };
  }

  try {
    const saved = localStorage.getItem('notificationSoundSettings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('خطأ في قراءة إعدادات الصوت:', error);
  }

  return { enabled: true, volume: 0.5, soundType: 'default' };
}

// حفظ الإعدادات في localStorage
export function saveSoundSettings(settings: SoundSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('notificationSoundSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('خطأ في حفظ إعدادات الصوت:', error);
  }
}

// إنشاء صوت تنبيه باستخدام Web Audio API
function createNotificationSound(type: SoundType = 'default', volume: number = 0.5): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // إنشاء oscillator للصوت
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // تحديد التردد حسب نوع الصوت
    let frequency = 800; // تردد افتراضي
    let duration = 0.1; // مدة الصوت بالثواني

    switch (type) {
      case 'success':
        frequency = 600;
        duration = 0.15;
        break;
      case 'warning':
        frequency = 500;
        duration = 0.2;
        break;
      case 'error':
        frequency = 400;
        duration = 0.25;
        break;
      case 'info':
        frequency = 700;
        duration = 0.1;
        break;
      case 'message':
        frequency = 650;
        duration = 0.12;
        break;
      default:
        frequency = 800;
        duration = 0.1;
    }

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // إعداد مستوى الصوت
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    // ربط العقد
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // تشغيل الصوت
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.error('خطأ في تشغيل صوت التنبيه:', error);
    // Fallback: استخدام HTML5 Audio
    playFallbackSound(type, volume);
  }
}

// Fallback: استخدام HTML5 Audio (للمتصفحات القديمة)
function playFallbackSound(type: SoundType = 'default', volume: number = 0.5): void {
  try {
    // إنشاء صوت بسيط باستخدام beep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error('خطأ في تشغيل صوت التنبيه (fallback):', error);
  }
}

// تشغيل صوت التنبيه
export function playNotificationSound(type: SoundType = 'default'): void {
  if (typeof window === 'undefined') return;

  const settings = getSoundSettings();
  
  if (!settings.enabled) {
    return;
  }

  // التحقق من أن الصفحة نشطة (لتحسين الأداء)
  if (document.hidden) {
    return;
  }

  // تشغيل الصوت
  createNotificationSound(type, settings.volume);
}

// تشغيل صوت تنبيه مخصص
export function playCustomNotificationSound(
  frequency: number = 800,
  duration: number = 0.1,
  volume: number = 0.5
): void {
  if (typeof window === 'undefined') return;

  const settings = getSoundSettings();
  
  if (!settings.enabled) {
    return;
  }

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * settings.volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.error('خطأ في تشغيل صوت مخصص:', error);
  }
}

// تفعيل الصوت (للموبايل - يحتاج تفاعل المستخدم)
export function enableSoundForMobile(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    try {
      // محاولة تشغيل صوت صامت لتفعيل الصوت
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('✅ تم تفعيل الصوت للموبايل');
          resolve();
        }).catch((error) => {
          console.error('خطأ في تفعيل الصوت:', error);
          resolve();
        });
      } else {
        resolve();
      }
    } catch (error) {
      console.error('خطأ في تفعيل الصوت:', error);
      resolve();
    }
  });
}

// تحديد نوع الصوت حسب نوع الإشعار
export function getSoundTypeFromNotificationType(
  notificationType: 'info' | 'success' | 'warning' | 'error',
  actionType?: string
): SoundType {
  if (actionType === 'message_sent' || actionType === 'connection_request') {
    return 'message';
  }

  switch (notificationType) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
}

