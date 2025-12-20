'use client';

import { useTournament } from '../providers';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
    const { tournament } = useTournament();

    if (!tournament) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>إعدادات البطولة العامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>حالة البطولة</Label>
                            <p className="text-sm text-gray-500">تفعيل أو تعطيل ظهور البطولة للجمهور</p>
                        </div>
                        <Switch checked={tournament.isActive} />
                    </div>

                    <div className="grid gap-2">
                        <Label>اسم البطولة</Label>
                        <Input defaultValue={tournament.name} />
                    </div>

                    <Button>حفظ التغييرات</Button>
                </CardContent>
            </Card>

            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">منطقة الخطر</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 mb-4">حذف البطولة سيؤدي لمسح جميع الفرق والمباريات والنتائج المرتبطة بها لا رجعة فيها.</p>
                    <Button variant="destructive">حذف البطولة</Button>
                </CardContent>
            </Card>
        </div>
    );
}
