import React from 'react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 border border-gray-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-[#001e4e] mb-2">الشروط والأحكام</h1>
                    <p className="text-gray-500">آخر تحديث: 31 يناير 2026</p>
                </div>

                <div className="space-y-8 text-gray-700 leading-relaxed" dir="rtl">
                    <section>
                        <h2 className="text-xl font-bold text-[#4aa1e8] mb-3">1. مقدمة</h2>
                        <p>
                            مرحباً بك في منصة "الحلم" (EL7LM). باستخبارك لهذه المنصة، فإنك توافق على الالتزام بشروط الاستخدام هذه.
                            نحن نعمل بالتعاون مع شركاء دوليين لتوفير بيئة رياضية آمنة ومحترفة.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#4aa1e8] mb-3">2. الحسابات والتسجيل</h2>
                        <p>
                            يجب عليك تقديم معلومات دقيقة وكاملة عند إنشاء حساب. أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور.
                            يمنع إنشاء حسابات وهمية أو انتحال شخصية لاعبين آخرين.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#4aa1e8] mb-3">3. حقوق الملكية الفكرية</h2>
                        <p>
                            جميع المحتويات والمواد المتاحة على المنصة، بما في ذلك النصوص والرسومات والشعارات، هي ملك لشركة ميسك القطرية (MESK LLC)
                            ومحمية بموجب قوانين حقوق النشر.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#4aa1e8] mb-3">4. استخدام البيانات</h2>
                        <p>
                            نحن نلتزم بحماية بياناتك الشخصية وفقاً لسياسة الخصوصية الخاصة بنا. يتم استخدام البيانات لتحليل الأداء الرياضي
                            وتحسين تجربة المستخدم.
                        </p>
                    </section>

                    <div className="border-t pt-6 mt-8">
                        <p className="text-sm text-gray-500 text-center">
                            لأي استفسارات قانونية، يرجى التواصل معنا عبر: <a href="mailto:legal@el7lm.com" className="text-blue-600 hover:underline">legal@el7lm.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
