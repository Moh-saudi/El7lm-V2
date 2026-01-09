"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Video, Link as LinkIcon, Plus, Trash2, Instagram, Globe, Youtube, Facebook, Twitter, Linkedin, FileText, Download } from "lucide-react";
import FileUploader from "@/components/shared/FileUploader";
import { DocumentsSection } from "./DocumentsSection";
import { ProfileFormValues } from "../schemas/profile";

export function MediaTab() {
    const { control, watch, setValue, getValues } = useFormContext<ProfileFormValues>();
    const watchedVideos = watch("videos");

    // Video Array
    const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({
        control,
        name: "videos",
    });

    // Social Links Array
    const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
        control,
        name: "social_links",
    });

    // Documents Array
    const { fields: docFields, append: appendDoc, remove: removeDoc } = useFieldArray({
        control,
        name: "documents",
    });

    // Images Handling
    const currentImages = watch("images") || [];
    const profileImage = watch("image");

    const handleProfileImageUpload = (url: string) => {
        setValue("image", url, { shouldDirty: true, shouldTouch: true });
    };

    const handleGalleryUpload = (url: string) => {
        const current = getValues("images") || [];
        setValue("images", [...current, url], { shouldDirty: true, shouldTouch: true });
    };

    const removeGalleryImage = (index: number) => {
        const current = getValues("images") || [];
        const newImages = current.filter((_: string, i: number) => i !== index);
        setValue("images", newImages, { shouldDirty: true, shouldTouch: true });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Profile Picture */}
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 py-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle>الصورة الشخصية</CardTitle>
                        <CardDescription>صورة الملف الشخصي التي ستظهر للأندية والمدربين</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Preview */}
                        <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-full border-4 border-white shadow-md"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                            )}
                        </div>

                        {/* Upload Control */}
                        <div className="flex-1 space-y-2 text-center md:text-right">
                            <h4 className="font-medium text-gray-900">تغيير الصورة الشخصية</h4>
                            <p className="text-sm text-red-500 font-bold mb-4 bg-red-50 p-2 rounded-lg border border-red-100">
                                تنبيه: يجب أن تكون الصورة بزي رياضي أو داخل الملعب لزيادة فرصة قبول ملفك.
                            </p>
                            <div className="max-w-xs mx-auto md:mx-0">
                                <FileUploader onUploadComplete={handleProfileImageUpload} type="image" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Photo Gallery */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>معرض الصور</CardTitle>
                            <CardDescription>صور من المباريات والتدريبات ({currentImages.length})</CardDescription>
                        </div>
                    </div>
                    <div className="w-fit">
                        <FileUploader onUploadComplete={handleGalleryUpload} type="image" />
                    </div>
                </CardHeader>
                <CardContent>
                    {currentImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {currentImages.map((img: string, index: number) => (
                                <div key={index} className="group relative aspect-square rounded-xl overflow-hidden border bg-gray-50">
                                    <img src={img} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryImage(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-gray-50/50">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <ImageIcon className="w-6 h-6 text-gray-400"
                                />
                            </div>
                            <h3 className="text-sm font-medium text-gray-900">لا توجد صور</h3>
                            <p className="text-sm text-gray-500 mt-1">قم برفع صور لإظهار مهاراتك</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Video Highlights */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>الفيديوهات</CardTitle>
                            <CardDescription>ارفع فيديوهات مباشرة أو أضف روابط يوتيوب</CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" onClick={() => appendVideo({ title: '', url: '', type: 'youtube' })} className="gap-2">
                            <LinkIcon className="w-4 h-4" /> إضافة رابط
                        </Button>
                        <Button variant="default" size="sm" onClick={() => appendVideo({ title: '', url: '', type: 'uploaded' })} className="gap-2 bg-black text-white hover:bg-black/90">
                            <Plus className="w-4 h-4" /> رفع من الجهاز
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {videoFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-xl bg-gray-50/50 space-y-4 relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeVideo(index)}
                                className="absolute top-2 left-2 text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name={`videos.${index}.title`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>عنوان الفيديو</FormLabel>
                                            <FormControl><Input placeholder="مثال: أهداف موسم 2024" className="bg-white" {...field} value={field.value || ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`videos.${index}.type`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>المنصة / طريقة الرفع</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'youtube'}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="اختر الطريقة" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="youtube">YouTube</SelectItem>
                                                    <SelectItem value="vimeo">Vimeo</SelectItem>
                                                    <SelectItem value="other">رابط آخر</SelectItem>
                                                    <SelectItem value="uploaded">رفع فيديو مباشر</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-1 md:col-span-2">
                                    {watchedVideos?.[index]?.type === 'uploaded' ? (
                                        <FormItem>
                                            <FormLabel>ملف الفيديو</FormLabel>
                                            {watchedVideos[index]?.url ? (
                                                <div className="relative rounded-lg overflow-hidden border bg-black group-video">
                                                    <video
                                                        src={watchedVideos[index].url}
                                                        controls
                                                        className="w-full h-48 md:h-64 object-contain"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="absolute top-2 right-2 opacity-90 hover:opacity-100"
                                                        onClick={() => setValue(`videos.${index}.url`, '', { shouldDirty: true })}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        تغيير الفيديو
                                                    </Button>
                                                </div>
                                            ) : (
                                                <FileUploader
                                                    type="video"
                                                    onUploadComplete={(url) => setValue(`videos.${index}.url`, url, { shouldDirty: true })}
                                                />
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    ) : (
                                        <FormField
                                            control={control}
                                            name={`videos.${index}.url`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>رابط الفيديو</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input placeholder="https://youtube.com/watch?v=..." className="bg-white pl-10 text-left ltr" {...field} value={field.value || ''} />
                                                            <Youtube className="w-5 h-5 absolute left-3 top-3.5 text-red-500" />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {videoFields.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Video className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-400">لا توجد فيديوهات مضافة</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. Social & Professional Links */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>الروابط الاجتماعية</CardTitle>
                            <CardDescription>أضف حساباتك على منصات التواصل الاجتماعي المختلفة</CardDescription>
                        </div>
                    </div>
                    <Button type="button" variant="default" size="sm" onClick={() => appendSocial({ platform: 'instagram', url: '', handle: '' })} className="gap-2 bg-black text-white hover:bg-black/90">
                        <Plus className="w-4 h-4" /> إضافة رابط
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {socialFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-xl bg-gray-50/50 relative group grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSocial(index)}
                                className="absolute top-2 left-2 text-red-500 hover:bg-red-50 z-10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>

                            <div className="md:col-span-4">
                                <FormField
                                    control={control}
                                    name={`social_links.${index}.platform`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>المنصة</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="اختر المنصة" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="instagram"><div className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-600" /> Instagram</div></SelectItem>
                                                    <SelectItem value="facebook"><div className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook</div></SelectItem>
                                                    <SelectItem value="twitter"><div className="flex items-center gap-2"><Twitter className="w-4 h-4 text-sky-500" /> Twitter</div></SelectItem>
                                                    <SelectItem value="linkedin"><div className="flex items-center gap-2"><Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn</div></SelectItem>
                                                    <SelectItem value="youtube"><div className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-600" /> YouTube</div></SelectItem>
                                                    <SelectItem value="transfermarkt"><div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Transfermarkt</div></SelectItem>
                                                    <SelectItem value="other"><div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-gray-500" /> أخرى</div></SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="md:col-span-8">
                                <FormField
                                    control={control}
                                    name={`social_links.${index}.url`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الرابط</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com/username" className="bg-white text-left ltr" {...field} value={field.value || ''} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    ))}
                    {socialFields.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <Globe className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-400">لا توجد روابط مضافة</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DocumentsSection />

        </div>
    );
}
