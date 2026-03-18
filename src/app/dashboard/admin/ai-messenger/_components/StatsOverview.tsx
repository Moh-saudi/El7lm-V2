import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  CheckCircle2, 
  Send, 
  XCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Zap 
} from 'lucide-react';

export const StatsOverview: React.FC = () => {
  const metrics = [
    { title: 'إجمالي الرسائل', value: '4,842', trend: '+12%', icon: Send, color: 'indigo' },
    { title: 'وصلت وقُرأت', value: '88%', trend: '+4%', icon: CheckCircle2, color: 'emerald' },
    { title: 'فشل الإرسال', value: '2.4%', trend: '-1%', icon: XCircle, color: 'rose' },
    { title: 'جمهور الحملة', value: '1,250', trend: '+200', icon: Users, color: 'amber' }
  ];

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1">
      {/* Upper Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          const colorMap: any = {
            indigo: 'from-indigo-500 to-blue-600 shadow-indigo-100/50 text-indigo-600',
            emerald: 'from-emerald-500 to-teal-500 shadow-emerald-100/50 text-emerald-600',
            rose: 'from-rose-500 to-red-600 shadow-rose-100/50 text-rose-600',
            amber: 'from-amber-500 to-orange-500 shadow-amber-100/50 text-amber-600'
          };

          return (
            <Card key={idx} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-all duration-500"></div>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500">{m.title}</CardTitle>
                <div className={`p-1.5 rounded-lg bg-slate-50 ${m.color === 'emerald' ? 'text-emerald-500' : m.color === 'rose' ? 'text-rose-500' : 'text-slate-500'}`}>
                   <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-slate-800 tracking-tight">{m.value}</div>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                   <TrendingUp className="w-3 h-3 text-emerald-500" />
                   <span className="text-emerald-500 font-semibold">{m.trend}</span>
                   مقارنة بالشهر الماضي
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Row 2: Analytics Grid placeholder with AI Suggestion Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <Card className="lg:col-span-2 border-none shadow-xl h-[300px] flex flex-col">
            <CardHeader className="p-4 pb-2">
               <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <BarChart className="w-4 h-4 text-emerald-500" />
                  تحليلات معدل تفاعل المراسلات
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">تدفق نشاط الوصول والقرأت في الـ 7 أيام الأخيرة</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center text-slate-400 text-xs">
               <div className="flex flex-col items-center gap-2">
                  <BarChart className="w-10 h-10 stroke-[1.2] opacity-30 text-indigo-500 animate-pulse" />
                  رسم بياني تدفقي (قيد الربط بمحرك التحليلات)
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-xl h-[300px] flex flex-col bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
            <CardHeader className="p-4 pb-2">
               <CardTitle className="text-sm font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-300" />
                  كابتن AI: توصيات ومقترحات الذكاء
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-400">اقتراحات مولدة آلياً لتحسين تفاعل عملائك</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 justify-between">
               <div className="space-y-3">
                  {[
                    "💡 معدل قراءة קوالب 'الحسابات' ارتفع بـ 22% الأسبوع الماضي.",
                    "⚠️ حملة 'Academy Warning' تفشل بـ 4% لعدم تطابق الرموز.",
                    "📣 يُقترح إرسال رسائل تذكير تلقائية غداً للعملاء غير المتفاعلين."
                  ].map((text, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-[11px] leading-relaxed transition-all hover:bg-white/10 cursor-pointer">
                       {text}
                    </div>
                  ))}
               </div>

               <button className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-bold h-9 rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10">
                  <Zap className="w-3.5 h-3.5" />
                  تحسين الحملة التالية الآن
               </button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};
