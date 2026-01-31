import React from 'react';
import Image from 'next/image';
import { Star, TrendingUp, Trophy } from 'lucide-react';

const STORIES = [
    {
        name: "عمر خالد",
        club: "انتقل إلى الدوري البرتغالي",
        image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60",
        desc: "بدأ عمر مسيرته في أكاديمية محلية، ومن خلال منصة الحلم، تم اكتشاف موهبته وتحليل أدائه، مما أهله للاحتراف في أوروبا.",
        stats: { goals: 24, matches: 30 }
    },
    {
        name: "سارة أحمد",
        club: "أفضل حارسة مرمى 2025",
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=60",
        desc: "حققت سارة أرقاماً قياسية في التصديات هذا الموسم، وتم تكريمها كأفضل حارسة في الدوري بفضل تطورها المستمر.",
        stats: { cleanSheets: 15, matches: 28 }
    },
    {
        name: "يوسف علي",
        club: "هداف دوري المدارس",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop&q=60",
        desc: "موهبة شابة صاعدة بقوة، تصدر قائمة الهدافين وتم ضمه لمنتخب الشباب بعد متابعة دقيقة عبر المنصة.",
        stats: { goals: 32, matches: 25 }
    }
];

export default function SuccessStoriesPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
            {/* Header */}
            <div className="bg-[#001e4e] text-white py-16 text-center px-4">
                <h1 className="text-4xl font-bold mb-4">قصص نجاح ملهمة</h1>
                <p className="text-blue-200 max-w-2xl mx-auto text-lg">
                    في "الحلم"، نحن لا نجمع البيانات فقط، بل نصنع النجوم. اكتشف كيف ساعدت منصتنا المواهب على الوصول للعالمية.
                </p>
            </div>

            {/* Stories Grid */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {STORIES.map((story, i) => (
                        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-gray-100 group">
                            <div className="relative h-64 overflow-hidden">
                                <Image
                                    src={story.image}
                                    alt={story.name}
                                    layout="fill"
                                    objectFit="cover"
                                    className="group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-white text-2xl font-bold">{story.name}</h3>
                                    <p className="text-blue-300 font-medium">{story.club}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 leading-relaxed mb-6">
                                    {story.desc}
                                </p>
                                <div className="flex items-center justify-between border-t pt-4">
                                    <div className="flex items-center gap-2 text-[#001e4e] font-bold">
                                        <Trophy size={18} className="text-yellow-500" />
                                        <span>إنجاز متميز</span>
                                    </div>
                                    <button className="text-sm text-blue-600 font-bold hover:underline">اقرأ المزيد</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="bg-blue-50 py-12 text-center">
                <h2 className="text-2xl font-bold text-[#001e4e] mb-4">هل أنت قصة النجاح القادمة؟</h2>
                <p className="text-gray-600 mb-6">انضم إلينا الآن وابدأ مسيرتك الاحترافية مع أفضل الأندية.</p>
                <a href="/auth/register" className="inline-block bg-[#4aa1e8] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
                    سجل الآن مجاناً
                </a>
            </div>
        </div>
    );
}
