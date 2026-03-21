'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import {
  Download, Printer, Phone, Mail, Globe, MapPin, Flag,
  Clock, Shield, Briefcase, Star, Trophy, Users, Target,
  Activity, GraduationCap, Video, X, CheckCircle
} from 'lucide-react';

dayjs.locale('ar');

interface CertificationRecord {
  name: string;
  issuer: string;
  year: string;
}

interface TrainerResumeData {
  full_name: string;
  profile_photo: string;
  nationality: string;
  current_location: string;
  date_of_birth: string;
  description: string;
  is_certified: boolean;
  license_number: string;
  license_expiry: string;
  years_of_experience: number | string;
  coaching_level: string;
  specialization: string;
  spoken_languages: string[];
  training_philosophy: string;
  age_groups: string[];
  service_type: string[];
  availability: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  social_media: {
    linkedin: string;
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  previous_clubs: string[];
  notable_players: string[];
  achievements: string;
  references: string;
  certifications: CertificationRecord[];
  video_links: string[];
  gallery: string[];
  stats: {
    players_trained: number;
    training_sessions: number;
    success_rate: number;
    years_experience: number;
  };
}

interface TrainerResumeProps {
  trainerData: TrainerResumeData;
  onClose: () => void;
}

export default function TrainerResume({ trainerData, onClose }: TrainerResumeProps) {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;
    setDownloading(true);

    const loadingEl = document.createElement('div');
    loadingEl.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:rgba(0,0,0,0.8);color:white;padding:20px 30px;
      border-radius:12px;z-index:99999;font-family:Arial,sans-serif;font-size:16px;
    `;
    loadingEl.textContent = 'جاري إنشاء PDF... يرجى الانتظار';
    document.body.appendChild(loadingEl);

    try {
      await new Promise(r => setTimeout(r, 1000));

      const images = resumeRef.current.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img =>
        new Promise(r => { if (img.complete) r(null); else { img.onload = () => r(null); img.onerror = () => r(null); } })
      ));

      const canvas = await html2canvas(resumeRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: resumeRef.current.scrollWidth,
        height: resumeRef.current.scrollHeight,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('img').forEach(img => {
            img.style.imageRendering = 'high-quality';
            img.style.objectFit = 'cover';
          });
        },
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${trainerData.full_name || 'trainer'}-resume.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('حدث خطأ أثناء إنشاء PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      document.body.removeChild(loadingEl);
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  const socialLinks = Object.entries(trainerData.social_media || {}).filter(([, v]) => v);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60" dir="rtl">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 shadow-lg bg-white/95 backdrop-blur print:hidden">
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex gap-2 items-center px-5 py-2 text-white bg-cyan-600 rounded-lg transition hover:bg-cyan-700 disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'جاري التحميل...' : 'تحميل PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="flex gap-2 items-center px-5 py-2 text-gray-700 bg-gray-100 rounded-lg transition hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
        <span className="text-sm font-medium text-gray-500">معاينة ملف المدرب</span>
        <button onClick={onClose} className="p-2 text-gray-500 rounded-lg hover:text-red-500 hover:bg-red-50">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Resume */}
      <div className="py-8 px-4">
        <div
          ref={resumeRef}
          className="bg-white max-w-4xl mx-auto shadow-2xl print:shadow-none"
          style={{ fontFamily: 'Arial, Tahoma, sans-serif' }}
        >

          {/* ===== HEADER ===== */}
          <div className="bg-gradient-to-l from-cyan-700 to-cyan-500 p-8 text-white">
            <div className="flex gap-6 items-center">
              {/* Photo */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/40 shadow-xl shrink-0">
                <img
                  src={trainerData.profile_photo || '/images/user-avatar.svg'}
                  alt="صورة المدرب"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = '/images/user-avatar.svg'; }}
                />
              </div>
              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{trainerData.full_name || 'المدرب الرياضي'}</h1>
                <p className="text-cyan-100 text-lg mb-3">{trainerData.specialization || 'مدرب رياضي'}</p>
                <div className="flex flex-wrap gap-4 text-sm text-cyan-100">
                  {trainerData.nationality && (
                    <span className="flex gap-1 items-center"><Flag className="w-4 h-4" />{trainerData.nationality}</span>
                  )}
                  {trainerData.current_location && (
                    <span className="flex gap-1 items-center"><MapPin className="w-4 h-4" />{trainerData.current_location}</span>
                  )}
                  {trainerData.years_of_experience && (
                    <span className="flex gap-1 items-center"><Clock className="w-4 h-4" />{trainerData.years_of_experience} سنوات خبرة</span>
                  )}
                  {trainerData.coaching_level && (
                    <span className="flex gap-1 items-center"><Shield className="w-4 h-4" />مستوى {trainerData.coaching_level}</span>
                  )}
                </div>
                <div className="mt-3">
                  <span className={`inline-flex gap-1 items-center px-3 py-1 rounded-full text-xs font-bold ${
                    trainerData.is_certified
                      ? 'bg-green-400/20 text-green-100 border border-green-300/40'
                      : 'bg-white/10 text-cyan-100 border border-white/20'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {trainerData.is_certified ? 'مدرب معتمد' : 'مدرب رياضي'}
                    {trainerData.is_certified && trainerData.license_number && ` — ${trainerData.license_number}`}
                  </span>
                </div>
              </div>
            </div>
            {/* Platform footer */}
            <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center text-xs text-cyan-100">
              <span className="font-bold text-white">منصة الحلم لاكتشاف المواهب الكروية 2025</span>
              <span>تاريخ الإصدار: {dayjs().format('DD/MM/YYYY')}</span>
            </div>
            <p className="mt-2 text-xs text-cyan-200 text-center">
              هذه الوثيقة تم إنشاؤها بواسطة صاحب الحساب على منصة الحلم دون أي مسؤولية عليها
            </p>
          </div>

          <div className="p-8 space-y-8">

            {/* ===== STATS ===== */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: <Users className="w-6 h-6" />, val: trainerData.stats?.players_trained ?? 0, label: 'لاعبون مدربون', color: 'bg-cyan-500' },
                { icon: <Activity className="w-6 h-6" />, val: trainerData.stats?.training_sessions ?? 0, label: 'جلسات تدريبية', color: 'bg-green-500' },
                { icon: <Target className="w-6 h-6" />, val: `${trainerData.stats?.success_rate ?? 0}%`, label: 'معدل النجاح', color: 'bg-yellow-500' },
                { icon: <Trophy className="w-6 h-6" />, val: trainerData.stats?.years_experience ?? trainerData.years_of_experience ?? 0, label: 'سنوات الخبرة', color: 'bg-blue-500' },
              ].map(({ icon, val, label, color }) => (
                <div key={label} className={`${color} text-white rounded-xl p-4 flex flex-col items-center text-center`}>
                  {icon}
                  <div className="text-2xl font-bold mt-1">{val}</div>
                  <div className="text-xs mt-1 opacity-90">{label}</div>
                </div>
              ))}
            </div>

            {/* ===== CONTACT + BIO ===== */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center border-b border-cyan-100 pb-2">
                  <Phone className="w-4 h-4" /> بيانات التواصل
                </h2>
                <div className="space-y-2 text-sm">
                  {trainerData.phone && (
                    <div className="flex gap-2 items-center text-gray-700">
                      <Phone className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span dir="ltr">{trainerData.phone}</span>
                    </div>
                  )}
                  {trainerData.whatsapp && (
                    <div className="flex gap-2 items-center text-gray-700">
                      <Phone className="w-4 h-4 text-green-500 shrink-0" />
                      <span dir="ltr">{trainerData.whatsapp} (واتساب)</span>
                    </div>
                  )}
                  {trainerData.email && (
                    <div className="flex gap-2 items-center text-gray-700">
                      <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span>{trainerData.email}</span>
                    </div>
                  )}
                  {trainerData.website && (
                    <div className="flex gap-2 items-center text-gray-700">
                      <Globe className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span className="truncate">{trainerData.website}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center border-b border-cyan-100 pb-2">
                  <Star className="w-4 h-4" /> نبذة شخصية
                </h2>
                <p className="text-sm leading-relaxed text-gray-700">
                  {trainerData.description || '—'}
                </p>
              </div>
            </div>

            {/* ===== PROFESSIONAL INFO + SERVICE ===== */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center border-b border-cyan-100 pb-2">
                  <Shield className="w-4 h-4" /> المعلومات المهنية
                </h2>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'التخصص', val: trainerData.specialization },
                    { label: 'مستوى التدريب', val: trainerData.coaching_level },
                    { label: 'رقم الرخصة', val: trainerData.is_certified ? trainerData.license_number : null },
                    { label: 'انتهاء الرخصة', val: trainerData.is_certified ? trainerData.license_expiry : null },
                    { label: 'تاريخ الميلاد', val: trainerData.date_of_birth },
                    { label: 'مدى التوفر', val: trainerData.availability },
                  ].map(({ label, val }) => val ? (
                    <div key={label} className="flex gap-2">
                      <span className="text-gray-500 w-28 shrink-0">{label}:</span>
                      <span className="font-medium text-gray-800">{val}</span>
                    </div>
                  ) : null)}
                  {trainerData.spoken_languages?.length > 0 && (
                    <div className="flex gap-2 items-start">
                      <span className="text-gray-500 w-28 shrink-0">اللغات:</span>
                      <div className="flex flex-wrap gap-1">
                        {trainerData.spoken_languages.map((l, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700 rounded-full">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center border-b border-cyan-100 pb-2">
                  <CheckCircle className="w-4 h-4" /> الفئات والخدمات
                </h2>
                {trainerData.age_groups?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">الفئات العمرية:</p>
                    <div className="flex flex-wrap gap-1">
                      {trainerData.age_groups.map((g, i) => (
                        <span key={i} className="px-2 py-1 text-xs font-medium bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-full">{g}</span>
                      ))}
                    </div>
                  </div>
                )}
                {trainerData.service_type?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">نوع الخدمة:</p>
                    <div className="flex flex-wrap gap-1">
                      {trainerData.service_type.map((s, i) => (
                        <span key={i} className="px-2 py-1 text-xs font-medium bg-green-50 border border-green-200 text-green-700 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {trainerData.availability && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">مدى التوفر:</p>
                    <span className="px-3 py-1 text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 rounded-full">
                      {trainerData.availability}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== TRAINING PHILOSOPHY ===== */}
            {trainerData.training_philosophy && (
              <div className="bg-cyan-50 rounded-xl p-5 border border-cyan-100">
                <h2 className="text-base font-bold text-cyan-700 mb-3 flex gap-2 items-center">
                  <Star className="w-4 h-4" /> الفلسفة التدريبية
                </h2>
                <p className="text-sm leading-relaxed text-gray-700">{trainerData.training_philosophy}</p>
              </div>
            )}

            {/* ===== CERTIFICATIONS ===== */}
            {trainerData.certifications?.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center">
                  <GraduationCap className="w-4 h-4" /> الشهادات والدورات
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-cyan-600 text-white">
                      <tr>
                        <th className="px-4 py-2 text-right font-semibold">الشهادة / الدورة</th>
                        <th className="px-4 py-2 text-right font-semibold">الجهة المانحة</th>
                        <th className="px-4 py-2 text-center font-semibold w-20">السنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainerData.certifications.map((cert, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{cert.name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{cert.issuer || '—'}</td>
                          <td className="px-4 py-2.5 text-center text-cyan-700 font-bold">{cert.year || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== CLUBS + PLAYERS ===== */}
            {(trainerData.previous_clubs?.length > 0 || trainerData.notable_players?.length > 0) && (
              <div className="grid grid-cols-2 gap-6">
                {trainerData.previous_clubs?.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h2 className="text-base font-bold text-cyan-700 mb-3 flex gap-2 items-center border-b border-cyan-100 pb-2">
                      <Briefcase className="w-4 h-4" /> الأندية السابقة
                    </h2>
                    <ul className="space-y-1.5">
                      {trainerData.previous_clubs.map((club, i) => (
                        <li key={i} className="flex gap-2 items-center text-sm text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                          {club}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trainerData.notable_players?.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h2 className="text-base font-bold text-cyan-700 mb-3 flex gap-2 items-center border-b border-cyan-100 pb-2">
                      <Users className="w-4 h-4" /> اللاعبون البارزون
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {trainerData.notable_players.map((player, i) => (
                        <span key={i} className="px-3 py-1 text-sm bg-cyan-100 text-cyan-800 rounded-full font-medium">{player}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== ACHIEVEMENTS + REFERENCES ===== */}
            {(trainerData.achievements || trainerData.references) && (
              <div className="grid grid-cols-2 gap-6">
                {trainerData.achievements && (
                  <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                    <h2 className="text-base font-bold text-yellow-700 mb-3 flex gap-2 items-center">
                      <Trophy className="w-4 h-4" /> الإنجازات والجوائز
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">{trainerData.achievements}</p>
                  </div>
                )}
                {trainerData.references && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <h2 className="text-base font-bold text-gray-700 mb-3 flex gap-2 items-center">
                      <Users className="w-4 h-4" /> المراجع والتوصيات
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">{trainerData.references}</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== VIDEO LINKS ===== */}
            {trainerData.video_links?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-3 flex gap-2 items-center">
                  <Video className="w-4 h-4" /> روابط الفيديو التدريبي
                </h2>
                <ul className="space-y-1.5">
                  {trainerData.video_links.map((link, i) => (
                    <li key={i} className="flex gap-2 items-center text-sm">
                      <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-blue-600 truncate">{link}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ===== SOCIAL MEDIA ===== */}
            {socialLinks.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="text-base font-bold text-cyan-700 mb-3 flex gap-2 items-center">
                  <Globe className="w-4 h-4" /> وسائل التواصل الاجتماعي
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {socialLinks.map(([platform, url]) => (
                    <div key={platform} className="flex gap-2 items-center text-sm text-gray-700">
                      <span className="text-cyan-500 font-semibold w-20 capitalize shrink-0">{platform}:</span>
                      <span className="text-blue-600 truncate text-xs">{url as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== GALLERY ===== */}
            {trainerData.gallery?.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-cyan-700 mb-4 flex gap-2 items-center">
                  <Star className="w-4 h-4" /> معرض الصور
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {trainerData.gallery.slice(0, 8).map((img, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt={`صورة ${i + 1}`} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== FOOTER ===== */}
            <div className="border-t-2 border-cyan-100 pt-6 mt-6">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="font-bold text-cyan-600">منصة الحلم — el7lm.com</span>
                <span>تم إنشاء هذا الملف بتاريخ {dayjs().format('DD/MM/YYYY HH:mm')}</span>
              </div>
              <p className="mt-2 text-xs text-center text-gray-400">
                جميع المعلومات الواردة في هذا الملف تخضع لمسؤولية صاحبها وليس للمنصة أي مسؤولية عن صحتها
              </p>
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 0.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
