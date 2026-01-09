'use client';
import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ExternalLink, Download, Printer, FileText, User, MapPin, Phone, Mail, Calendar, GraduationCap, Trophy, Target, Star, HeartPulse, Award, Building2, Globe, Flag, Weight, Ruler, Languages, Briefcase, Clock, CheckCircle, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import ShareModal from '@/components/shared/ShareModal';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

dayjs.locale('ar');
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';

interface PlayerResumeProps {
  player: any;
  playerOrganization?: any;
}



// دالة حساب العمر
const calculateAge = (birthDate: any) => {
  if (!birthDate) return null;
  try {
    let d: Date;
    if (typeof birthDate === 'object' && birthDate.toDate && typeof birthDate.toDate === 'function') {
      d = birthDate.toDate();
    } else if (birthDate instanceof Date) {
      d = birthDate;
    } else {
      d = new Date(birthDate);
    }

    if (isNaN(d.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const monthDiff = today.getMonth() - d.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    return null;
  }
};

const translatePosition = (pos: string | undefined | null) => {
  if (!pos) return '';
  const p = pos.toUpperCase().trim();
  const map: Record<string, string> = {
    'GK': 'حارس مرمى',
    'CB': 'قلب دفاع',
    'LB': 'ظهير أيسر',
    'RB': 'ظهير أيمن',
    'LWB': 'ظهير أيسر مهاجم',
    'RWB': 'ظهير أيمن مهاجم',
    'CDM': 'وسط دفاعي',
    'CM': 'وسط ملعب',
    'CAM': 'وسط هجومي',
    'LM': 'وسط أيسر',
    'RM': 'وسط أيمن',
    'LW': 'جناح أيسر',
    'RW': 'جناح أيمن',
    'CF': 'مهاجم ثاني',
    'ST': 'مهاجم صريح',
    'SS': 'مهاجم ثاني',
  };

  if (map[p]) return map[p];

  // Try partial matches or raw return
  return pos;
};

const PlayerResume: React.FC<PlayerResumeProps> = ({ player, playerOrganization }) => {
  const resumeRef = useRef<HTMLDivElement>(null);



  const handleDownloadPDF = async () => {
    try {
      if (!resumeRef.current) {
        alert('خطأ: لا يمكن العثور على العنصر المطلوب لإنشاء PDF');
        return;
      }

      console.log('بدء إنشاء PDF...');

      // إظهار رسالة تحميل
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 9999;
        font-family: Arial, sans-serif;
      `;
      loadingMessage.textContent = 'جاري إنشاء PDF... يرجى الانتظار';
      document.body.appendChild(loadingMessage);

      // انتظار قصير للتأكد من أن العنصر جاهز
      await new Promise(resolve => setTimeout(resolve, 2000));

      // انتظار تحميل جميع الصور
      const images = resumeRef.current.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(null);
          } else {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
          }
        });
      });

      await Promise.all(imagePromises);

      // إنشاء canvas من العنصر
      const canvas = await html2canvas(resumeRef.current, {
        scale: 3, // زيادة الجودة للصور
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: resumeRef.current.scrollWidth,
        height: resumeRef.current.scrollHeight,
        imageTimeout: 15000, // زيادة وقت انتظار الصور
        onclone: (clonedDoc) => {
          // تحسين الصور في النسخة المستنسخة
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            img.style.imageRendering = 'high-quality';
            img.style.objectFit = 'cover';
            img.style.objectPosition = 'center';
          });
        }
      });

      console.log('تم إنشاء Canvas بنجاح');

      // تحويل canvas إلى صورة بجودة عالية
      const imgData = canvas.toDataURL('image/png', 1.0);

      // إنشاء صورة مؤقتة لضمان تحميل الصور
      const tempImg = new Image();
      tempImg.src = imgData;

      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
      });

      // إنشاء PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // عرض A4 بالمليمتر
      const pageHeight = 295; // ارتفاع A4 بالمليمتر
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // إضافة الصورة للصفحة الأولى
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // إضافة صفحات إضافية إذا لزم الأمر
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // حفظ الملف
      const fileName = `${player?.full_name || 'player'}-resume.pdf`;
      pdf.save(fileName);

      console.log('تم إنشاء PDF بنجاح:', fileName);

      // إزالة رسالة التحميل
      document.body.removeChild(loadingMessage);

      // إظهار رسالة نجاح
      alert(`تم إنشاء PDF بنجاح!\nاسم الملف: ${fileName}\nيرجى التحقق من مجلد التنزيلات.`);

    } catch (error) {
      console.error('خطأ في إنشاء PDF:', error);

      // إزالة رسالة التحميل إذا كانت موجودة
      const loadingMessage = document.querySelector('div[style*="position: fixed"]');
      if (loadingMessage) {
        document.body.removeChild(loadingMessage);
      }

      alert('خطأ في إنشاء PDF. يرجى المحاولة مرة أخرى.\n\nالتفاصيل: ' + (error as Error).message);
    }
  };

  const age = calculateAge(player?.birth_date);



  return (
    <div className="space-y-4">
      {/* أزرار التحكم */}
      <div className="space-y-4 print:hidden">
        {/* أزرار التنزيل */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleDownloadPDF}
            className="flex gap-2 items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            تنزيل PDF
          </button>
          <button
            onClick={async () => {
              try {
                if (!resumeRef.current) return;

                const canvas = await html2canvas(resumeRef.current, {
                  scale: 1,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff'
                });

                const link = document.createElement('a');
                link.download = `${player?.full_name || 'player'}-resume.png`;
                link.href = canvas.toDataURL();
                link.click();

                alert('تم تنزيل الصورة بنجاح!');
              } catch (error) {
                alert('خطأ في تنزيل الصورة: ' + (error as Error).message);
              }
            }}
            className="flex gap-2 items-center px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            تنزيل كصورة
          </button>
        </div>

        {/* زر المشاركة */}
        <div className="flex justify-center">
          <ShareModal
            playerId={player?.id}
            playerName={player?.full_name || 'لاعب'}
            trigger={
              <Button className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                مشاركة التقرير
              </Button>
            }
          />
        </div>
      </div>

      {/* السيرة الذاتية */}
      <div
        ref={resumeRef}
        className="bg-white p-8 max-w-4xl mx-auto shadow-lg print:shadow-none print:p-0"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-6 mb-8">
          <div className="flex items-center gap-6">
            {/* صورة اللاعب - محسنة لتستخدم نظام التحويل الموحد */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg print:border-blue-600">
              <img
                src={(() => {
                  const imageValue = player?.profile_image_url || player?.profile_image;
                  if (!imageValue) return '/default-player-avatar.png';

                  // إذا كان كائن (object)
                  let path = '';
                  if (typeof imageValue === 'string') {
                    path = imageValue;
                  } else if (typeof imageValue === 'object' && imageValue !== null) {
                    path = (imageValue as any).url || (imageValue as any).path || '';
                  }

                  if (!path) return '/default-player-avatar.png';

                  // استخدام المحول الموحد للروابط
                  return getSupabaseImageUrl(path, 'avatars');
                })()}
                alt="صورة اللاعب"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('/default-player-avatar.png')) {
                    target.src = '/default-player-avatar.png';
                  }
                }}
                style={{
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid'
                }}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {player?.full_name || 'اسم اللاعب'}
              </h1>
              <p className="text-xl text-blue-600 font-semibold mb-2">
                {translatePosition(player?.primary_position || player?.position) || 'مركز اللاعب'}
              </p>
              <div className="flex gap-4 text-gray-600">
                <span className="flex gap-1 items-center">
                  <Calendar className="w-4 h-4" />
                  {age ? `${age} سنة` : 'غير محدد'}
                </span>
                <span className="flex gap-1 items-center">
                  <MapPin className="w-4 h-4" />
                  {player?.city || 'غير محدد'}
                </span>
                <span className="flex gap-1 items-center">
                  <Flag className="w-4 h-4" />
                  {player?.nationality || 'غير محدد'}
                </span>
              </div>
            </div>
          </div>

          {/* معلومات المنصة والتاريخ */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600">منصة الحلم لاكتشاف المواهب الكروية 2025</span>
              </div>
              <div className="flex items-center gap-4">
                <span>تاريخ الإنشاء: {dayjs().format('DD/MM/YYYY')}</span>
                <span>آخر تحديث: {dayjs().format('DD/MM/YYYY HH:mm')}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              هذه الوثيقة تم إنشاء بواسطة صاحب الحساب على منصة الحلم لاكتشاف المواهب الكروية دون أي مسؤولية عليها
            </div>
          </div>
        </div>

        {/* معلومات الاتصال */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <User className="w-5 h-5 text-blue-600" />
            معلومات الاتصال
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2 items-center text-gray-700">
              <Phone className="w-4 h-4 text-blue-600" />
              <span dir="ltr">{player?.phone || 'غير متاح'}</span>
            </div>
            <div className="flex gap-2 items-center text-gray-700">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>{player?.email || 'غير متاح'}</span>
            </div>
            <div className="flex gap-2 items-center text-gray-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{[player?.city, player?.address].filter(Boolean).join(' - ') || 'غير محدد'}</span>
            </div>
            <div className="flex gap-2 items-center text-gray-700">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{player?.nationality || player?.country || 'غير محدد'}</span>
            </div>
          </div>

          {/* النبذة المختصرة في قسم الاتصال */}
          {player?.brief && (
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex gap-2 items-center">
                <FileText className="w-4 h-4 text-blue-600" />
                النبذة المختصرة
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed">
                {player.brief}
              </div>
            </div>
          )}
        </div>

        {/* التبعية */}
        {/* الحالة والتبعية */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            الحالة والتبعية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1. Affiliation Card */}
            {/* 1. Affiliation Card */}
            {playerOrganization && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-bold text-blue-900 mb-2 text-sm">جهة التفاوض الرسمية</h3>
                  <div className="flex bg-white p-3 rounded-lg border border-blue-100 items-center gap-3 shadow-sm">
                    {playerOrganization.logo || playerOrganization.logoUrl ? (
                      <img src={playerOrganization.logo || playerOrganization.logoUrl} alt={playerOrganization.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl border border-blue-200">{playerOrganization.emoji}</div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-gray-900 line-clamp-1">{playerOrganization.name}</div>
                      <div className="text-xs text-gray-500">{playerOrganization.typeArabic}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Guardianship Card (Minors) */}
            {age < 18 && (() => {
              const hasConsent = player?.documents?.some((d: any) => d.type === 'guardian_consent');
              return (
                <div className={`p-4 rounded-lg border flex flex-col justify-between h-full ${hasConsent ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div>
                    <h3 className={`font-bold mb-2 text-sm ${hasConsent ? 'text-green-900' : 'text-amber-900'}`}>{hasConsent ? 'الوصاية القانونية' : 'تنبيه الوصاية'}</h3>
                    <div className="flex bg-white/60 p-3 rounded-lg items-center gap-3 shadow-sm border border-white/50">
                      {hasConsent ? <CheckCircle className="w-8 h-8 text-green-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
                      <div>
                        <div className={`font-bold text-xs ${hasConsent ? 'text-green-800' : 'text-amber-800'}`}>
                          {hasConsent ? 'موافقة ولي الأمر مكتملة' : 'تحت وصاية ولي الأمر'}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1">
                          {hasConsent ? 'يمكن التفاوض واستكمال الإجراءات' : 'بانتظار موافقة ولي الأمر الرسمية'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Evaluation Card */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex flex-col justify-between h-full">
              <div>
                <h3 className="font-bold text-purple-900 mb-2 text-sm">تقييم الموهبة</h3>
                <div className="flex bg-white/60 p-3 rounded-lg items-center gap-3 shadow-sm border border-white/50">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                    <Star className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-purple-900">
                      {player?.evaluation_status === 'rated' ? 'تم التقييم' : 'تحت التقييم'}
                    </div>
                    <div className="text-[10px] text-purple-700 mt-1">
                      من اللجنة الفنية للمنصة
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* المعلومات الشخصية */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <User className="w-5 h-5 text-blue-600" />
            المعلومات الشخصية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">البيانات الأساسية</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>تاريخ الميلاد:</strong> {player?.birth_date ? dayjs(player.birth_date).format('DD/MM/YYYY') : 'غير محدد'}</p>
                <p><strong>العمر:</strong> {age ? `${age} سنة` : 'غير محدد'}</p>
                {age < 18 && <p className="text-amber-700 font-medium"><strong>الحالة القانونية:</strong> تحت وصاية ولي الأمر</p>}
                <p><strong>الجنسية:</strong> {player?.nationality || 'غير محدد'}</p>
                <p><strong>المدينة:</strong> {player?.city || 'غير محدد'}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">البيانات البدنية</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>الطول:</strong> {player?.height ? `${player.height} سم` : 'غير محدد'}</p>
                <p><strong>الوزن:</strong> {player?.weight ? `${player.weight} كجم` : 'غير محدد'}</p>
                <p><strong>فصيلة الدم:</strong> {player?.blood_type || 'غير محدد'}</p>
                <p><strong>القدم المفضلة:</strong> {player?.preferred_foot || 'غير محدد'}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">البيانات الرياضية</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>المركز الأساسي:</strong> {translatePosition(player?.primary_position || player?.position) || 'غير محدد'}</p>
                {player?.secondary_position && <p><strong>المركز الثانوي:</strong> {translatePosition(player.secondary_position)}</p>}
                {player?.jersey_number && <p><strong>رقم القميص:</strong> {player.jersey_number}</p>}
                <p><strong>النادي الحالي:</strong> {player?.current_club || (player?.contract_status === 'free' ? 'لاعب حر' : 'غير محدد')}</p>
                <p><strong>سنوات الخبرة:</strong> {player?.experience_years || player?.experience || 'غير محدد'}</p>
                <p><strong>الحالة التعاقدية:</strong> {(player?.contract_status === 'contracted' || player?.currently_contracted === 'yes') ? 'مرتبط بعقد' : (player?.contract_status === 'loan' ? 'إعارة' : 'لاعب حر')}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">الحالة الصحية</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>الوضع الصحي:</strong> {player?.chronic_conditions ? 'يوجد ملاحظات' : 'سليم تماماً'}</p>
                {player?.chronic_conditions && <p className="text-red-600 font-medium text-xs bg-red-50 p-1 rounded">{player.chronic_details}</p>}
                <p><strong>الحساسية:</strong> {player?.allergies || 'لا توجد'}</p>
                {player?.medical_notes && <p className="text-xs text-gray-500 italic mt-1 border-t pt-1">{player.medical_notes}</p>}
              </div>
            </div>

            {/* التعليم */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">التعليم</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>المستوى:</strong> {player?.education_level || 'غير محدد'}</p>
                {player?.degree && <p><strong>التخصص:</strong> {player.degree}</p>}
                {player?.graduation_year && <p><strong>التخرج:</strong> {player.graduation_year}</p>}
              </div>
            </div>

            {/* اللغات */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">اللغات</h3>
              <div className="space-y-1 text-sm text-gray-700">
                {player?.languages && Array.isArray(player.languages) && player.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {player.languages.map((lang: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">{lang}</span>
                    ))}
                  </div>
                ) : (
                  <>
                    <p><strong>العربية:</strong> {player?.arabic_level || 'غير محدد'}</p>
                    <p><strong>الإنجليزية:</strong> {player?.english_level || 'غير محدد'}</p>
                  </>
                )}
              </div>
            </div>

            {/* المستندات */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">المستندات</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>جواز السفر:</strong> {player?.has_passport === 'yes' ? 'متوفر' : 'غير متوفر'}</p>
                {age < 18 && (() => {
                  const guardianDoc = player?.documents?.find((d: any) => d.type === 'guardian_consent');
                  if (guardianDoc) {
                    return (
                      <div className="mt-2 pt-2 border-t-2 border-green-100 bg-green-50 p-2 rounded text-center">
                        <p className="text-sm font-bold text-green-600 mb-1">✔ متوفر:</p>
                        <p className="text-lg font-black text-green-700">موافقة ولي الأمر</p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2 pt-2 border-t-2 border-red-100 bg-red-50 p-2 rounded text-center">
                      <p className="text-sm font-bold text-red-600 mb-1">⚠️ مطلوب:</p>
                      <p className="text-lg font-black text-red-700">موافقة ولي الأمر</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* النبذة المختصرة */}
          {player?.brief && (
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex gap-2 items-center">
                <FileText className="w-4 h-4 text-blue-600" />
                النبذة المختصرة
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed">
                {player.brief}
              </div>
            </div>
          )}
        </div>



        {/* المهارات */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <Star className="w-5 h-5 text-blue-600" />
            المهارات والقدرات
          </h2>

          {/* New FIFA Stats */}
          {(() => {
            const mainStats = [
              { label: 'السرعة', value: player?.stats_pace },
              { label: 'التسديد', value: player?.stats_shooting },
              { label: 'التمرير', value: player?.stats_passing },
              { label: 'المراوغة', value: player?.stats_dribbling },
              { label: 'الدفاع', value: player?.stats_defending },
              { label: 'البدنية', value: player?.stats_physical },
            ].filter(s => s.value !== undefined);

            if (mainStats.length > 0) {
              return (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">القدرات الأساسية (0-99)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {mainStats.map((stat, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className={`text-2xl font-black mb-1 ${Number(stat.value) >= 80 ? 'text-green-600' : Number(stat.value) >= 60 ? 'text-blue-600' : 'text-gray-800'}`}>
                          {stat.value}
                        </div>
                        <div className="text-xs font-bold text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* المهارات الفنية */}
            {player?.technical_skills && Object.keys(player.technical_skills).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">المهارات الفنية</h3>
                <div className="space-y-2">
                  {Object.entries(player.technical_skills).map(([skill, value]) => (
                    <div key={skill} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{skill}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={`w-3 h-3 rounded-full ${star <= Number(value) ? 'bg-yellow-400' : 'bg-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* المهارات البدنية */}
            {player?.physical_skills && Object.keys(player.physical_skills).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">المهارات البدنية</h3>
                <div className="space-y-2">
                  {Object.entries(player.physical_skills).map(([skill, value]) => (
                    <div key={skill} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{skill}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={`w-3 h-3 rounded-full ${star <= Number(value) ? 'bg-green-400' : 'bg-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* المهارات الاجتماعية */}
            {player?.social_skills && Object.keys(player.social_skills).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">المهارات الاجتماعية</h3>
                <div className="space-y-2">
                  {Object.entries(player.social_skills).map(([skill, value]) => (
                    <div key={skill} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{skill}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className={`w-3 h-3 rounded-full ${star <= Number(value) ? 'bg-purple-400' : 'bg-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الأهداف المهنية */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <Target className="w-5 h-5 text-blue-600" />
            الأهداف المهنية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(player?.objectives) ? (
              player.objectives.length > 0 ? (
                player.objectives.map((obj: string, i: number) => (
                  <div key={i} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-800">{obj}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center py-4 bg-gray-50 rounded-lg">لا توجد أهداف مسجلة</p>
              )
            ) : (
              player?.objectives && Object.entries(player.objectives).map(([objective, value]) => (
                <div key={objective} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
                  {value ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700">
                    {objective === 'european_leagues' && 'الدوريات الأوروبية'}
                    {objective === 'arab_leagues' && 'الدوريات العربية'}
                    {objective === 'local_leagues' && 'الدوريات المحلية'}
                    {objective === 'professional' && 'الاحتراف'}
                    {objective === 'training' && 'التدريب'}
                    {objective === 'trials' && 'التجارب'}
                    {!['european_leagues', 'arab_leagues', 'local_leagues', 'professional', 'training', 'trials'].includes(objective) && objective}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* التاريخ الرياضي */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <Trophy className="w-5 h-5 text-blue-600" />
            التاريخ الرياضي والتدريبي
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الأندية السابقة */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">مسيرة الأندية</h3>
              <div className="space-y-3">
                {player?.club_history && player.club_history.length > 0 ? (
                  player.club_history.map((club: any, index: number) => (
                    <div key={index} className="flex gap-2 items-start bg-white p-2 rounded border border-gray-100 shadow-sm">
                      <Trophy className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {typeof club === 'string' ? club : (club.club_name || club.name)}
                        </div>
                        {typeof club !== 'string' && (
                          <div className="text-xs text-gray-500 mt-1">
                            {club.position_played && <span className="block text-blue-600 mb-0.5">{club.position_played}</span>}
                            <span>{club.season || (club.start_date ? `${club.start_date} - ${club.end_date || 'حتى الآن'}` : '')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-4">لا توجد أندية سابقة مسجلة</p>
                )}
              </div>
            </div>

            {/* الأكاديميات والمدربين */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">التدريب والتطوير</h3>
              <div className="space-y-4">
                {/* Academies */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    الأكاديميات
                  </h4>
                  <div className="space-y-2">
                    {player?.academies && player.academies.length > 0 ? (
                      player.academies.map((aca: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                          <span className="text-sm text-gray-800 font-medium">{aca.name}</span>
                          {(aca.start_date || aca.end_date) && (
                            <span className="text-xs text-gray-400 mr-auto">{aca.start_date} - {aca.end_date || 'الآن'}</span>
                          )}
                        </div>
                      ))
                    ) : <p className="text-xs text-gray-400 italic">لا توجد أكاديميات</p>}
                  </div>
                </div>

                {/* Private Coaches */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    المدربين الخاصين
                  </h4>
                  <div className="space-y-2">
                    {player?.private_coaches && player.private_coaches.length > 0 ? (
                      player.private_coaches.map((coach: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-gray-100 shadow-sm">
                          <span className="text-sm text-gray-800 font-medium">{coach.name}</span>
                          {(coach.start_date || coach.end_date) && (
                            <span className="text-xs text-gray-400 mr-auto">{coach.start_date} - {coach.end_date || 'الآن'}</span>
                          )}
                        </div>
                      ))
                    ) : <p className="text-xs text-gray-400 italic">لا يوجد مدربين خاصين</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الصور والفيديوهات */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
            <FileText className="w-5 h-5 text-blue-600" />
            الصور والفيديوهات
          </h2>

          {/* الصور */}
          {(player?.profile_image || (player?.additional_images && player.additional_images.length > 0)) && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">الصور</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* الصورة الشخصية */}
                {player?.profile_image && (
                  <div className="relative">
                    <img
                      src={typeof player.profile_image === 'string'
                        ? player.profile_image
                        : (player.profile_image as { url: string })?.url}
                      alt="الصورة الشخصية"
                      className="w-full h-32 object-cover rounded-lg border-2 border-blue-200 shadow-sm print:border-blue-600"
                      style={{
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-32 bg-blue-100 rounded-lg border-2 border-blue-200 flex items-center justify-center">
                              <div class="text-center">
                                <div class="text-blue-600 text-2xl mb-1">👤</div>
                                <div class="text-blue-600 text-xs">صورة شخصية</div>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      رئيسية
                    </div>
                  </div>
                )}

                {/* الصور الإضافية */}
                {player?.additional_images && player.additional_images.length > 0 &&
                  player.additional_images.map((img: any, idx: number) => (
                    <div key={idx} className="relative">
                      <img
                        src={typeof img === 'string' ? img : img.url}
                        alt={`صورة إضافية ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm print:border-gray-600"
                        style={{
                          breakInside: 'avoid',
                          pageBreakInside: 'avoid'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <div class="text-center">
                                  <div class="text-gray-600 text-2xl mb-1">🖼️</div>
                                  <div class="text-gray-600 text-xs">صورة ${idx + 1}</div>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                        {idx + 1}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* الفيديوهات */}
          {player?.videos && player.videos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">الفيديوهات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {player.videos.map((video: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 print:border-gray-600 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center print:bg-red-200">
                        <span className="text-red-600 text-lg font-bold print:text-red-800">▶</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 text-lg print:text-black">فيديو {idx + 1}</span>
                        {video.title && (
                          <p className="text-sm text-gray-600 print:text-gray-700">{video.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 print:text-gray-700">
                      <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                        <p className="font-semibold text-gray-800 print:text-black mb-1">المشاهدة:</p>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>اضغط هنا لمشاهدة الفيديو</span>
                        </a>
                      </div>
                      {video.description && (
                        <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                          <p className="font-semibold text-gray-800 print:text-black mb-1">وصف الفيديو:</p>
                          <p className="text-gray-700 print:text-gray-800">{video.description}</p>
                        </div>
                      )}
                      {video.type && (
                        <div className="bg-white p-3 rounded border border-gray-200 print:border-gray-400">
                          <p className="font-semibold text-gray-800 print:text-black mb-1">نوع الفيديو:</p>
                          <p className="text-gray-700 print:text-gray-800">{video.type}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* رسالة إذا لم توجد صور أو فيديوهات */}
          {!player?.profile_image &&
            !player?.additional_images?.length &&
            !player?.videos?.length && (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500">لا توجد صور أو فيديوهات متاحة</p>
              </div>
            )}
        </div>



        {/* النبذة المختصرة */}
        {player?.brief && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex gap-2 items-center">
              <FileText className="w-5 h-5 text-blue-600" />
              النبذة المختصرة
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{player.brief}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <div className="text-center text-gray-600 text-xs">
            <p className="font-semibold text-blue-600 mb-2">منصة الحلم لاكتشاف المواهب الكروية 2025</p>
            <p>تم إنشاء هذه السيرة الذاتية بتاريخ {dayjs().format('DD/MM/YYYY')}</p>
            <p>آخر تحديث: {dayjs().format('DD/MM/YYYY HH:mm')}</p>
            <p className="mt-2">جميع المعلومات المذكورة صحيحة وقت إنشاء الوثيقة</p>
            <p className="text-xs mt-1">هذه الوثيقة تم إعدادها بواسطة منصة الحلم المتخصصة في اكتشاف وتطوير المواهب الكروية</p>
            <p className="text-xs mt-1 text-gray-500">هذه الوثيقة تم إنشاء بواسطة صاحب الحساب على منصة الحلم لاكتشاف المواهب الكروية دون أي مسؤولية عليها</p>
          </div>
        </div>
      </div>

      {/* أنماط الطباعة */}
      <style jsx>{`
         @media print {
           @page {
             margin: 0.8cm;
             size: A4;
           }
           
           body {
             -webkit-print-color-adjust: exact;
             color-adjust: exact;
             background: white !important;
             font-family: Arial, sans-serif !important;
           }
           
           .print\\:hidden {
             display: none !important;
           }
           
           .print\\:shadow-none {
             box-shadow: none !important;
           }
           
           .print\\:p-0 {
             padding: 0 !important;
           }
           
           * {
             -webkit-print-color-adjust: exact !important;
             color-adjust: exact !important;
           }
           
           /* تحسينات إضافية للطباعة */
           h1, h2, h3 {
             page-break-after: avoid;
             break-after: avoid;
           }
           
           .page-break {
             page-break-before: always;
             break-before: always;
           }
           
           /* تحسينات للتباعد في الطباعة */
           .mb-8 {
             margin-bottom: 1.5rem !important;
           }
           
           .mb-6 {
             margin-bottom: 1rem !important;
           }
           
           .mb-4 {
             margin-bottom: 0.75rem !important;
           }
           
           /* تحسينات للشبكات في الطباعة */
           .grid {
             display: grid !important;
             grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
             gap: 0.5rem !important;
           }
           
           /* تحسينات للبطاقات في الطباعة */
           .bg-gray-50 {
             background-color: #f9fafb !important;
             border: 1px solid #e5e7eb !important;
             padding: 0.75rem !important;
             margin-bottom: 0.75rem !important;
           }
           
           /* تحسينات للصور في الطباعة */
           .w-24.h-24 {
             width: 80px !important;
             height: 80px !important;
           }
           
           .w-16.h-16 {
             width: 60px !important;
             height: 60px !important;
           }
           
           .h-32 {
             height: 100px !important;
           }
           
           /* إخفاء أزرار التحكم عند الطباعة */
           button {
             display: none !important;
           }
           
           /* تحسينات للصور */
           img {
             -webkit-print-color-adjust: exact !important;
             color-adjust: exact !important;
             max-width: 100% !important;
             height: auto !important;
             page-break-inside: avoid !important;
             break-inside: avoid !important;
             display: block !important;
             object-fit: cover !important;
             print-color-adjust: exact !important;
           }
           
           /* مقاسات محددة للصور في الطباعة */
           /* صورة اللاعب في الهيدر */
           .w-24.h-24 img {
             width: 96px !important;
             height: 96px !important;
             min-width: 96px !important;
             min-height: 96px !important;
           }
           
           /* صورة الجهة التابعة */
           .w-16.h-16 img {
             width: 64px !important;
             height: 64px !important;
             min-width: 64px !important;
             min-height: 64px !important;
           }
           
           /* الصور في قسم الوسائط */
           .h-32 img {
             height: 128px !important;
             min-height: 128px !important;
             width: auto !important;
             max-width: 100% !important;
           }
           
           /* تحسينات إضافية للصور */
           .object-cover {
             object-fit: cover !important;
             object-position: center !important;
           }
           
           /* ضمان عدم تقطيع الصور */
           .relative {
             page-break-inside: avoid !important;
             break-inside: avoid !important;
           }
           
           /* تحسينات للشبكات في الطباعة */
           .grid {
             display: grid !important;
             grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
             gap: 0.75rem !important;
           }
           
           /* تحسينات للبطاقات */
           .bg-gray-50 {
             background-color: #f9fafb !important;
             border: 1px solid #e5e7eb !important;
             padding: 1rem !important;
             margin-bottom: 1rem !important;
           }
           
           /* تحسينات للهوامش */
           .mb-8 {
             margin-bottom: 2rem !important;
           }
           
           .mb-6 {
             margin-bottom: 1.5rem !important;
           }
           
           .mb-4 {
             margin-bottom: 1rem !important;
           }
           
           .mb-3 {
             margin-bottom: 0.75rem !important;
           }
           
           .mb-2 {
             margin-bottom: 0.5rem !important;
           }
           
           .mb-1 {
             margin-bottom: 0.25rem !important;
           }
           
           /* تحسينات للتباعد */
           .space-y-2 > * + * {
             margin-top: 0.5rem !important;
           }
           
           .space-y-1 > * + * {
             margin-top: 0.25rem !important;
           }
           
           /* تحسينات للتباعد */
           .gap-4 {
             gap: 1rem !important;
           }
           
           .gap-3 {
             gap: 0.75rem !important;
           }
           
           .gap-2 {
             gap: 0.5rem !important;
           }
           
           /* تحسينات للحدود */
           .rounded-lg {
             border-radius: 0.5rem !important;
           }
           
           .rounded-full {
             border-radius: 9999px !important;
           }
           
           .rounded {
             border-radius: 0.25rem !important;
           }
           
           /* تحسينات للظلال */
           .shadow-sm {
             box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
           }
           
           /* تحسينات للنصوص */
           .text-lg {
             font-size: 1rem !important;
             line-height: 1.5rem !important;
           }
           
           .text-sm {
             font-size: 0.8rem !important;
             line-height: 1.2rem !important;
           }
           
           .text-xs {
             font-size: 0.7rem !important;
             line-height: 1rem !important;
           }
           
           /* تحسينات للعناوين */
           .text-3xl {
             font-size: 1.5rem !important;
             line-height: 2rem !important;
           }
           
           .text-xl {
             font-size: 1.25rem !important;
             line-height: 1.75rem !important;
           }
           
           .font-bold {
             font-weight: 700 !important;
           }
           
           .font-semibold {
             font-weight: 600 !important;
           }
           
           /* تحسينات للكسر */
           .break-all {
             word-break: break-all !important;
           }
           
           /* تحسينات للحاويات */
           .relative {
             position: relative !important;
           }
           
           .overflow-hidden {
             overflow: hidden !important;
           }
           
           /* تحسينات للحدود */
           .border-2 {
             border-width: 2px !important;
           }
           
           .border-4 {
             border-width: 4px !important;
           }
           
           /* تحسينات إضافية للصور في الطباعة */
           @media print {
             img {
               -webkit-print-color-adjust: exact !important;
               color-adjust: exact !important;
               print-color-adjust: exact !important;
               image-rendering: -webkit-optimize-contrast !important;
               image-rendering: crisp-edges !important;
             }
             
             /* ضمان ظهور الصور في جميع المتصفحات */
             * {
               -webkit-print-color-adjust: exact !important;
               color-adjust: exact !important;
               print-color-adjust: exact !important;
             }
             
             /* تحسينات للفيديوهات في الطباعة */
             .bg-red-100 {
               background-color: #fee2e2 !important;
             }
             
             .text-red-600 {
               color: #dc2626 !important;
             }
             
             .text-red-800 {
               color: #991b1b !important;
             }
             
             .bg-white {
               background-color: #ffffff !important;
             }
             
             .border-gray-400 {
               border-color: #9ca3af !important;
             }
             
             .text-blue-800 {
               color: #1e40af !important;
             }
             
             .text-gray-800 {
               color: #1f2937 !important;
             }
             
             .text-gray-700 {
               color: #374151 !important;
             }
             
             .text-black {
               color: #000000 !important;
             }
           }
           
           /* تحسينات للظلال */
           .shadow-sm {
             box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
           }
           
           .shadow-lg {
             box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
           }
           
           /* تحسينات للشبكات */
           .grid {
             display: grid !important;
             grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
             gap: 0.5rem !important;
           }
           
           /* تحسينات للشبكات الكبيرة */
           .md\\:grid-cols-2 {
             grid-template-columns: repeat(2, 1fr) !important;
           }
           
           .md\\:grid-cols-3 {
             grid-template-columns: repeat(3, 1fr) !important;
           }
           
           .md\\:grid-cols-4 {
             grid-template-columns: repeat(4, 1fr) !important;
           }
           
           /* تحسينات للبطاقات */
           .bg-gray-50 {
             background-color: #f9fafb !important;
             border: 1px solid #e5e7eb !important;
           }
           
           /* تحسينات للحدود */
           .border-blue-200 {
             border-color: #bfdbfe !important;
           }
           
           .border-gray-200 {
             border-color: #e5e7eb !important;
           }
           
           /* تحسينات للألوان */
           .text-blue-600 {
             color: #2563eb !important;
           }
           
           .text-gray-900 {
             color: #111827 !important;
           }
           
           .text-gray-700 {
             color: #374151 !important;
           }
           
           .text-gray-600 {
             color: #4b5563 !important;
           }
           
           .text-gray-500 {
             color: #6b7280 !important;
           }
           
           /* تحسينات للخلفيات */
           .bg-blue-100 {
             background-color: #dbeafe !important;
           }
           
           .bg-gray-100 {
             background-color: #f3f4f6 !important;
           }
           
           .bg-green-100 {
             background-color: #dcfce7 !important;
           }
           
           .bg-red-100 {
             background-color: #fee2e2 !important;
           }
           
           .bg-purple-100 {
             background-color: #f3e8ff !important;
           }
           
           /* تحسينات للألوان النصية */
           .text-green-600 {
             color: #16a34a !important;
           }
           
           .text-red-600 {
             color: #dc2626 !important;
           }
           
           .text-purple-600 {
             color: #9333ea !important;
           }
         }
       `}</style>
    </div>
  );
};

export default PlayerResume;
