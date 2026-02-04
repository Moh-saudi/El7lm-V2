import React from 'react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-card rounded-xl shadow-lg p-8 border border-border">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-primary mb-2">الشروط والأحكام</h1>
                    <p className="text-muted-foreground">آخر تحديث: 31 يناير 2026</p>
                </div>

                <div className="space-y-8 text-foreground leading-relaxed" dir="rtl">
                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            1. مقدمة
                        </h2>
                        <p className="text-muted-foreground">
                            مرحباً بك في منصة "الحلم" (EL7LM). باستخبارك لهذه المنصة، فإنك توافق على الالتزام بشروط الاستخدام هذه.
                            نحن نعمل بالتعاون مع شركاء دوليين لتوفير بيئة رياضية آمنة ومحترفة.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            2. الحسابات والتسجيل
                        </h2>
                        <p className="text-muted-foreground">
                            يجب عليك تقديم معلومات دقيقة وكاملة عند إنشاء حساب. أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور.
                            يمنع إنشاء حسابات وهمية أو انتحال شخصية لاعبين آخرين.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            3. حقوق الملكية الفكرية
                        </h2>
                        <p className="text-muted-foreground">
                            جميع المحتويات والمواد المتاحة على المنصة، بما في ذلك النصوص والرسومات والشعارات، هي ملك لشركة ميسك القطرية (MESK LLC)
                            ومحمية بموجب قوانين حقوق النشر.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            4. استخدام البيانات
                        </h2>
                        <p className="text-muted-foreground">
                            نحن نلتزم بحماية بياناتك الشخصية وفقاً لسياسة الخصوصية الخاصة بنا. يتم استخدام البيانات لتحليل الأداء الرياضي
                            وتحسين تجربة المستخدم.
                        </p>
                    </section>

                    <div className="border-t border-border pt-6 mt-8">
                        <p className="text-sm text-muted-foreground text-center">
                            لأي استفسارات قانونية، يرجى التواصل معنا عبر: <a href="mailto:legal@el7lm.com" className="text-primary hover:underline font-bold">legal@el7lm.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
