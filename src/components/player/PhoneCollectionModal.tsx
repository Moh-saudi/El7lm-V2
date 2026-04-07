'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Check, MessageCircle, X, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { COUNTRIES_FROM_REGISTER, Country } from '@/data/countries-from-register';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PhoneCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    forceOpen?: boolean;
}

export default function PhoneCollectionModal({ isOpen, onClose, forceOpen = true }: PhoneCollectionModalProps) {
    const { user, userData, refreshUserData } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // State
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [whatsappCountry, setWhatsappCountry] = useState<Country | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [hasDifferentWhatsapp, setHasDifferentWhatsapp] = useState(false);
    const [error, setError] = useState('');

    // Popover states
    const [openCountry, setOpenCountry] = useState(false);
    const [openWaCountry, setOpenWaCountry] = useState(false);

    // Initial Country Setup
    useEffect(() => {
        if (!selectedCountry) {
            const defaultCode = '+974'; // Default to Qatar
            const defaultCountry = COUNTRIES_FROM_REGISTER.find(c => c.code === defaultCode) || COUNTRIES_FROM_REGISTER[0];
            setSelectedCountry(defaultCountry);
            if (!whatsappCountry) {
                setWhatsappCountry(defaultCountry);
            }
        }
    }, [selectedCountry, whatsappCountry]);

    // Sync Logic
    useEffect(() => {
        if (!hasDifferentWhatsapp) {
            setWhatsappNumber(phoneNumber);
            setWhatsappCountry(selectedCountry);
        }
    }, [phoneNumber, hasDifferentWhatsapp, selectedCountry]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user) return;
        if (!selectedCountry) {
            setError('يرجى اختيار الدولة');
            return;
        }

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const cleanWhatsApp = whatsappNumber.replace(/\D/g, '');

        if (!cleanPhone) {
            setError('يرجى إدخال رقم الهاتف');
            return;
        }

        // Validate Main Phone
        const phonePattern = new RegExp(selectedCountry.phonePattern);
        if (!phonePattern.test(cleanPhone)) {
            if (cleanPhone.length !== selectedCountry.phoneLength) {
                setError(`رقم الهاتف يجب أن يتكون من ${selectedCountry.phoneLength} أرقام (${selectedCountry.name})`);
                return;
            }
        }

        if (hasDifferentWhatsapp) {
            if (!cleanWhatsApp) {
                setError('يرجى إدخال رقم الواتساب');
                return;
            }
            if (!whatsappCountry) {
                setError('يرجى اختيار دولة الواتساب');
                return;
            }

            const waPattern = new RegExp(whatsappCountry.phonePattern);
            if (!waPattern.test(cleanWhatsApp)) {
                if (cleanWhatsApp.length !== whatsappCountry.phoneLength) {
                    setError(`رقم الواتساب يجب أن يتكون من ${whatsappCountry.phoneLength} أرقام (${whatsappCountry.name})`);
                    return;
                }
            }
        }

        try {
            setLoading(true);

            const updateData = {
                phone: cleanPhone,
                country: selectedCountry.name,
                countryCode: selectedCountry.code,
                whatsapp: cleanWhatsApp,
                whatsappCountry: hasDifferentWhatsapp ? whatsappCountry?.name : selectedCountry.name,
                whatsappCountryCode: hasDifferentWhatsapp ? whatsappCountry?.code : selectedCountry.code,
                phoneNumber: cleanPhone,
                updatedAt: new Date().toISOString(),
                phoneVerified: false,
                profileUpdateRequested: false // Reset the flag
            };

            const accountType = userData?.accountType as string;
            const collectionName = accountType === 'user' ? 'users' : `${accountType || 'player'}s`;
            const finalCollection = collectionName === 'users' ? 'users' : collectionName;

            await supabase.from(finalCollection).upsert({ id: user.id, ...updateData });

            if (finalCollection !== 'users') {
                try {
                    await supabase.from('users').upsert({ id: user.id, ...updateData });
                } catch (e) {
                    console.warn('Could not sync to users collection', e);
                }
            }

            toast.success('تم حفظ بيانات التواصل بنجاح');
            if (refreshUserData) {
                await refreshUserData();
            }
            onClose();
            router.refresh();

        } catch (err: any) {
            console.error('Error updating phone:', err);
            setError('حدث خطأ أثناء حفظ البيانات');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={() => !forceOpen && onClose()}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-40%" }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 z-50 w-[95%] max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide"
                    >
                        <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl overflow-hidden text-white min-h-full">

                            {/* Decorative Elements */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                                <motion.div
                                    animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                    className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"
                                />
                                <motion.div
                                    animate={{ rotate: -360, scale: [1, 1.3, 1] }}
                                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                    className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
                                />
                            </div>

                            {/* Close Button */}
                            {!forceOpen && (
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm z-10"
                                >
                                    <X className="h-5 w-5 text-white" />
                                </button>
                            )}

                            {/* Content */}
                            <div className="relative p-5 md:p-8">
                                {/* Header */}
                                <div className="text-center mb-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                        className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-full mb-4 shadow-lg ring-1 ring-white/30"
                                    >
                                        <Smartphone className="h-8 w-8 md:h-10 md:w-10 text-white" />
                                    </motion.div>

                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-2xl md:text-3xl font-bold mb-2"
                                    >
                                        تحديث التواصل
                                    </motion.h2>

                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-white/90 text-sm md:text-lg"
                                    >
                                        أضف رقم هاتفك لتصلك الإشعارات والعروض
                                    </motion.p>
                                </div>

                                <motion.form
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-5"
                                >
                                    {/* Country Searchable Select */}
                                    <div className="space-y-2">
                                        <Label className="text-white/90">الدولة</Label>
                                        <Popover open={openCountry} onOpenChange={setOpenCountry}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCountry}
                                                    className="w-full justify-between h-12 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                                                >
                                                    {selectedCountry ? (
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>{selectedCountry.name}</span>
                                                            <span className="text-white/60 text-xs ltr bg-white/10 px-2 py-0.5 rounded ml-2">
                                                                {selectedCountry.code}
                                                            </span>
                                                        </div>
                                                    ) : "اختر الدولة..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="ابحث عن دولة..." className="h-9 text-right" />
                                                    <CommandList>
                                                        <CommandEmpty>لا توجد دولة بهذا الاسم.</CommandEmpty>
                                                        <CommandGroup>
                                                            {COUNTRIES_FROM_REGISTER.map((country) => (
                                                                <CommandItem
                                                                    key={country.name}
                                                                    value={country.name}
                                                                    onSelect={(currentValue) => {
                                                                        const c = COUNTRIES_FROM_REGISTER.find(item => item.name === currentValue);
                                                                        if (c) setSelectedCountry(c);
                                                                        setOpenCountry(false);
                                                                    }}
                                                                    className="flex items-center justify-between cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Check
                                                                            className={cn(
                                                                                "h-4 w-4",
                                                                                selectedCountry?.name === country.name ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <span>{country.name}</span>
                                                                    </div>
                                                                    <span className="text-xs text-muted-foreground ltr">{country.code}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="space-y-2">
                                        <Label className="text-white/90">رقم الهاتف</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/70 bg-white/10 border-r border-white/10 px-3 rounded-l-xl z-20 backdrop-blur-sm font-mono">
                                                {selectedCountry?.code || '+966'}
                                            </div>
                                            <Input
                                                type="tel"
                                                placeholder="5xxxxxxx"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                                className="pl-[4.5rem] pr-4 text-left direction-ltr h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:ring-1 focus:ring-white/50 transition-all text-lg font-medium backdrop-blur-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* WhatsApp Toggle */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/20 p-2 rounded-lg text-white">
                                                    <MessageCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <Label htmlFor="whatsapp-switch" className="text-sm font-semibold text-white cursor-pointer block">
                                                        رقم واتساب مختلف؟
                                                    </Label>
                                                    <p className="text-[11px] text-white/50 mt-0.5">
                                                        فعّل هذا الخيار إذا كان رقم الواتساب من دولة أخرى أو مختلف
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                id="whatsapp-switch"
                                                checked={hasDifferentWhatsapp}
                                                onCheckedChange={setHasDifferentWhatsapp}
                                                className="data-[state=checked]:bg-green-500 border-white/30"
                                            />
                                        </div>

                                        <AnimatePresence>
                                            {hasDifferentWhatsapp && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="overflow-hidden space-y-3"
                                                >
                                                    {/* WhatsApp Country Searchable Select */}
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-white/70">دولة الواتساب</Label>
                                                        <Popover open={openWaCountry} onOpenChange={setOpenWaCountry}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    aria-expanded={openWaCountry}
                                                                    className="w-full justify-between h-10 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm text-sm"
                                                                >
                                                                    {whatsappCountry?.name || "اختر الدولة..."}
                                                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                                <Command>
                                                                    <CommandInput placeholder="ابحث عن دولة..." className="h-9 text-right" />
                                                                    <CommandList>
                                                                        <CommandEmpty>لا توجد دولة بهذا الاسم.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            {COUNTRIES_FROM_REGISTER.map((country) => (
                                                                                <CommandItem
                                                                                    key={country.name}
                                                                                    value={country.name}
                                                                                    onSelect={(currentValue) => {
                                                                                        const c = COUNTRIES_FROM_REGISTER.find(item => item.name === currentValue);
                                                                                        if (c) setWhatsappCountry(c);
                                                                                        setOpenWaCountry(false);
                                                                                    }}
                                                                                    className="flex items-center justify-between cursor-pointer"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Check
                                                                                            className={cn(
                                                                                                "h-4 w-4",
                                                                                                whatsappCountry?.name === country.name ? "opacity-100" : "opacity-0"
                                                                                            )}
                                                                                        />
                                                                                        <span>{country.name}</span>
                                                                                    </div>
                                                                                    <span className="text-xs text-muted-foreground ltr">{country.code}</span>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    <div className="relative group pt-1">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/70 bg-white/10 border-r border-white/10 px-3 rounded-l-xl z-20 backdrop-blur-sm font-mono">
                                                            {whatsappCountry?.code || selectedCountry?.code || '+00'}
                                                        </div>
                                                        <Input
                                                            type="tel"
                                                            placeholder="5xxxxxxx"
                                                            value={whatsappNumber}
                                                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                                                            className="pl-[4.5rem] pr-4 text-left direction-ltr h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/20 focus:ring-1 focus:ring-white/50 transition-all text-base"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 text-sm text-red-200 bg-red-900/40 rounded-xl border border-red-500/30 flex items-center gap-2 backdrop-blur-sm"
                                        >
                                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-white text-purple-600 hover:bg-white/90 rounded-xl font-bold shadow-lg shadow-black/10 active:scale-[0.98] transition-all duration-200"
                                        disabled={loading}
                                    >
                                        {loading ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
                                    </Button>

                                </motion.form>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
