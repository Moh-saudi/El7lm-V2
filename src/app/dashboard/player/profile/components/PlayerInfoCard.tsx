import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Edit2 } from 'lucide-react';
import Image from 'next/image';

interface PlayerInfoCardProps {
    formData: any; // Ideally strictly typed
    editFormData: any;
    isEditing: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    countrySlot?: React.ReactNode;
    citySlot?: React.ReactNode;
    loading: boolean;
}

export const PlayerInfoCard: React.FC<PlayerInfoCardProps> = ({
    formData,
    editFormData,
    isEditing,
    handleInputChange,
    handleProfileImageUpload,
    loading,
    countrySlot,
    citySlot
}) => {
    const displayData = isEditing ? editFormData : formData;

    const getImageUrl = (url: string | null | undefined) => {
        if (!url) return '/images/default-avatar.png';
        if (url.startsWith('http')) return url;
        return url; // fallback
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
            <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Profile Image Section */}
                    <div className="relative group mx-auto md:mx-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden relative bg-gray-50">
                            <Image
                                src={getImageUrl(displayData.image)}
                                alt="Profile"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 128px, 160px"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                            {loading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <label
                            className={`absolute bottom-2 right-2 p-2.5 rounded-full shadow-lg cursor-pointer transition-all duration-300
                ${isEditing
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white translate-y-0 opacity-100'
                                    : 'bg-gray-100 text-gray-400 translate-y-2 opacity-0 pointer-events-none'
                                }`}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfileImageUpload}
                                disabled={!isEditing || loading}
                            />
                            <Camera className="w-5 h-5" />
                        </label>
                    </div>

                    {/* Info Fields */}
                    <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Name - Full Width */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-1">الاسم الكامل</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={displayData.name || ''}
                                        onChange={handleInputChange}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="الاسم الكامل"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold text-gray-800">{displayData.name || 'غير محدد'}</h2>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">تاريخ الميلاد</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={displayData.birth_date || ''}
                                        onChange={handleInputChange}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    />
                                ) : (
                                    <p className="text-lg text-gray-700 font-medium">{displayData.birth_date || 'غير محدد'}</p>
                                )}
                            </div>

                            {/* Nationality */}
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">الجنسية</label>
                                {countrySlot ? countrySlot : (
                                    isEditing ? (
                                        <select
                                            name="nationality"
                                            value={displayData.nationality || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        >
                                            <option value="">اختر الدولة</option>
                                        </select>
                                    ) : (
                                        <p className="text-lg text-gray-700 font-medium">{displayData.nationality || 'غير محدد'}</p>
                                    )
                                )}
                            </div>

                            {/* Gender - Full Width */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-1">الجنس</label>
                                {isEditing ? (
                                    <div className="flex gap-4 mt-1">
                                        {['male', 'female'].map((gender) => (
                                            <label
                                                key={gender}
                                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${displayData.gender === gender
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value={gender}
                                                    checked={displayData.gender === gender}
                                                    onChange={handleInputChange}
                                                    className="hidden"
                                                />
                                                <span className="font-medium">{gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-lg text-gray-700 font-medium">
                                        {displayData.gender === 'male' ? 'ذكر' : displayData.gender === 'female' ? 'أنثى' : 'غير محدد'}
                                    </p>
                                )}
                            </div>

                            {/* Residence (City Slot) - Full Width */}
                            <div className="col-span-1 md:col-span-2">
                                {citySlot ? (
                                    citySlot
                                ) : (
                                    <>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">المدينة</label>
                                        {isEditing ? (
                                            <select
                                                name="city"
                                                value={displayData.city || ''}
                                                onChange={handleInputChange}
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            >
                                                <option value="">اختر المدينة</option>
                                            </select>
                                        ) : (
                                            <p className="text-lg text-gray-700 font-medium">{displayData.city || 'غير محدد'}</p>
                                        )}
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
