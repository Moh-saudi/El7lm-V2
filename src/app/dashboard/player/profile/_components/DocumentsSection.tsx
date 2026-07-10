"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploader from "@/components/shared/FileUploader";
import { useTranslation } from "@/lib/i18n";

export function DocumentsSection() {
    const { t } = useTranslation();
    const { control, watch, setValue } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "documents",
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle>{t('profile.documentsSection.title')}</CardTitle>
                        <CardDescription>{t('profile.documentsSection.desc')}</CardDescription>
                    </div>
                </div>
                <Button type="button" onClick={() => append({ type: 'other', name: '', url: '' })} className="bg-black text-white hover:bg-black/90 gap-2">
                    <Plus className="w-4 h-4" /> {t('profile.documentsSection.addButton')}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-xl bg-gray-50/50 relative">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-2 left-2 text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <FormField control={control} name={`documents.${index}.name`} render={({ field }) => <FormItem><FormLabel>{t('profile.documentsSection.nameLabel')}</FormLabel><FormControl><Input {...field} className="bg-white" placeholder={t('profile.documentsSection.namePlaceholder')} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={control} name={`documents.${index}.type`} render={({ field }) => <FormItem><FormLabel>{t('profile.documentsSection.typeLabel')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                <SelectItem value="guardian_consent">{t('profile.documentsSection.guardianConsent')}</SelectItem>
                                <SelectItem value="id_card">{t('profile.documentsSection.idCard')}</SelectItem>
                                <SelectItem value="other">{t('profile.documentsSection.other')}</SelectItem>
                            </SelectContent></Select><FormMessage /></FormItem>} />
                        </div>
                        {watch(`documents.${index}.url`) ? <div className="text-green-600 flex items-center justify-between p-3 bg-white border rounded"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span>{t('profile.documentsSection.uploaded')}</span></div><Button type="button" variant="ghost" className="text-red-500" onClick={() => setValue(`documents.${index}.url`, '', { shouldDirty: true })}>{t('profile.documentsSection.delete')}</Button></div> : <FileUploader type="document" onUploadComplete={(url) => setValue(`documents.${index}.url`, url, { shouldDirty: true })} />}
                    </div>
                ))}
                {!fields.length && <div className="text-center py-8 text-gray-400">{t('profile.documentsSection.noDocuments')}</div>}
            </CardContent>
        </Card>
    );
}
