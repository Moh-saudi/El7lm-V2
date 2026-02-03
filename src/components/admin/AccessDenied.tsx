import React from 'react';
import { Result, Button } from 'antd';
import { ShieldCloseIcon } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied({ resource }: { resource?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50 rounded-xl m-4">
            <Result
                icon={<ShieldCloseIcon className="w-24 h-24 text-red-500 mx-auto opacity-80" />}
                status="403"
                title="عذراً، انت لا تملك صلاحية الوصول"
                subTitle={
                    resource
                        ? `حسابك ليس لديه الصلاحيات اللازمة للوصول إلى قسم "${resource}".`
                        : "ليس لديك إذن لعرض هذه الصفحة. يرجى مراجعة المسؤول إذا كنت تعتقد أن هذا خطأ."
                }
                extra={
                    <Link href="/dashboard/admin">
                        <Button type="primary" size="large">
                            العودة للرئيسية
                        </Button>
                    </Link>
                }
            />
        </div>
    );
}
