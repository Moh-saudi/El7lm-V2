'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, Globe, CreditCard, Smartphone, Banknote, ShieldCheck, Zap, Wallet, Landmark, Loader2, ArrowRight } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import AddPaymentMethodModal from './AddPaymentMethodModal';
import AddCountryModal from './AddCountryModal';

interface PaymentMethod {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    enabled: boolean;
    isDefault: boolean;
    accountNumber?: string;
    instructions?: string;
    icon?: string;
}

interface CountrySettings {
    countryCode: string;
    countryName: string;
    currency: string;
    methods: PaymentMethod[];
}

const DEFAULT_SETTINGS: CountrySettings[] = [
    {
        countryCode: 'EG',
        countryName: 'مصر',
        currency: 'EGP',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'vodafone_cash', name: 'فودافون كاش', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'instapay', name: 'انستاباي', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'QA',
        countryName: 'قطر',
        currency: 'QAR',
        methods: [
            { id: 'skipcash', name: 'SkipCash (بطاقة بنكية)', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'fawran', name: 'خدمة فورا', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '⚡' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'SA',
        countryName: 'السعودية',
        currency: 'SAR',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, isDefault: false, accountNumber: '', icon: '📱' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    },
    {
        countryCode: 'GLOBAL',
        countryName: 'دولي (GLOBAL)',
        currency: 'USD',
        methods: [
            { id: 'geidea', name: 'بطاقة بنكية', type: 'card', enabled: true, isDefault: true, icon: '💳' },
            { id: 'paypal', name: 'PayPal', type: 'wallet', enabled: true, isDefault: false, icon: '💙' },
            { id: 'bank_transfer', name: 'تحويل بنكي', type: 'bank_transfer', enabled: true, isDefault: false, accountNumber: '', icon: '🏦' }
        ]
    }
];

export default function PaymentSettingsTab() {
    const [settings, setSettings] = useState<CountrySettings[]>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('EG');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const loadedSettings = [...DEFAULT_SETTINGS];
                for (let i = 0; i < loadedSettings.length; i++) {
                    const country = loadedSettings[i];
                    const docRef = doc(db, 'payment_settings', country.countryCode);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        loadedSettings[i] = { ...country, ...docSnap.data() } as CountrySettings;
                    }
                }
                setSettings(loadedSettings);
            } catch (error) {
                console.error('Error fetching settings:', error);
                toast.error('Synchronization failure');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (countryCode: string) => {
        setSaving(true);
        try {
            const countrySetting = settings.find(s => s.countryCode === countryCode);
            if (!countrySetting) return;
            const docRef = doc(db, 'payment_settings', countryCode);
            await setDoc(docRef, countrySetting);
            toast.success(`✅ Protocol synchronized for ${countrySetting.countryName}`);
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('❌ Finalization failed');
        } finally {
            setSaving(false);
        }
    };

    const updateMethod = (countryCode: string, methodId: string, updates: Partial<PaymentMethod>) => {
        setSettings(prev => prev.map(country => {
            if (country.countryCode !== countryCode) return country;
            return {
                ...country,
                methods: country.methods.map(method => {
                    if (method.id !== methodId) return method;
                    return { ...method, ...updates };
                })
            };
        }));
    };

    const handleAddMethod = (newMethod: PaymentMethod) => {
        setSettings(prev => prev.map(country => {
            if (country.countryCode !== selectedCountry) return country;
            return {
                ...country,
                methods: [...country.methods, newMethod]
            };
        }));
        toast.success(`Success: ${newMethod.name} integrated. Commit changes to finalize.`);
    };

    const handleAddCountry = (newCountry: CountrySettings) => {
        setSettings(prev => [...prev, newCountry]);
        setSelectedCountry(newCountry.countryCode);
        toast.success(`✅ ${newCountry.countryName} added to global grid`);
    };

    const currentCountry = settings.find(s => s.countryCode === selectedCountry) || settings[0];

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-24 gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Payment Protocols...</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            {/* Header & Country Selector */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Global Transaction Gateways</h2>
                    <p className="mt-2 text-slate-500 font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Configure localized payment methods and institutional account protocols.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] border border-white shadow-xl">
                    {settings.map(country => (
                        <button
                            key={country.countryCode}
                            onClick={() => setSelectedCountry(country.countryCode)}
                            className={`px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300
                                ${selectedCountry === country.countryCode
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {country.countryName}
                        </button>
                    ))}
                    <Button
                        variant="ghost"
                        onClick={() => setIsCountryModalOpen(true)}
                        className="h-10 px-4 rounded-xl text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> <span className="text-[10px] font-black uppercase">Region</span>
                    </Button>
                </div>
            </div>

            <AddCountryModal
                isOpen={isCountryModalOpen}
                onClose={() => setIsCountryModalOpen(false)}
                onAdd={handleAddCountry}
                existingCodes={settings.map(s => s.countryCode)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Method Configuration */}
                <Card className="lg:col-span-2 rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden group">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Localized Methods</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active protocols for {currentCountry.countryName}</CardDescription>
                            </div>
                        </div>
                        <Button
                            disabled={saving}
                            onClick={() => handleSave(currentCountry.countryCode)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Commit Changes
                        </Button>
                    </CardHeader>

                    <CardContent className="p-8 space-y-6">
                        <AnimatePresence mode="popLayout">
                            {currentCountry.methods.map((method, idx) => (
                                <motion.div
                                    key={method.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`relative group p-6 rounded-[2.5rem] border transition-all duration-300 ${method.enabled ? 'bg-white border-slate-100 shadow-xl shadow-slate-200/50' : 'bg-slate-50/50 border-dashed border-slate-200 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${method.enabled ? 'bg-slate-50' : 'bg-slate-200/50'
                                                }`}>
                                                {method.icon || <CreditCard className="w-6 h-6 text-slate-400" />}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{method.name}</h4>
                                                <Badge variant="outline" className={`mt-1 border-none bg-slate-100 text-[9px] font-black uppercase tracking-widest px-3 py-1 text-slate-500`}>
                                                    {method.type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ${method.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                                                onClick={() => updateMethod(currentCountry.countryCode, method.id, { enabled: !method.enabled })}
                                            >
                                                <div className={`bg-white w-5 h-5 rounded-full shadow-lg transform transition duration-300 ${method.enabled ? 'translate-x-7' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {method.enabled ? 'Active' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>

                                    {method.enabled && method.id !== 'geidea' && method.id !== 'paypal' && method.id !== 'skipcash' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50"
                                        >
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                                                    <Wallet className="w-3.5 h-3.5" /> Institutional Account Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={method.accountNumber || ''}
                                                    onChange={(e) => updateMethod(currentCountry.countryCode, method.id, { accountNumber: e.target.value })}
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                                    placeholder="IBAN or Account ID..."
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                                                    <Zap className="w-3.5 h-3.5" /> Transfer Instructions
                                                </label>
                                                <input
                                                    type="text"
                                                    value={method.instructions || ''}
                                                    onChange={(e) => updateMethod(currentCountry.countryCode, method.id, { instructions: e.target.value })}
                                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                                    placeholder="Instructions for final user..."
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Integrate New Protocol</span>
                        </button>
                    </CardContent>
                </Card>

                {/* Regional Context & Tips */}
                <div className="space-y-8">
                    <Card className="rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl p-8 overflow-hidden">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                            <Landmark className="w-4 h-4 text-blue-600" /> Regional Compliance
                        </h4>
                        <div className="space-y-6">
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-[11px] text-blue-900 font-bold leading-relaxed mb-4">
                                    Strategic default for card transactions is prioritized via <span className="font-black italic">Geidea Infrastructure</span> for all GCC and Global regions.
                                </p>
                                <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-blue-200/30">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Operational Status: Peak</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                                Institutional accounts (Vodafone Cash, STC Pay, Fawran) require localized verification. Ensure account numbers are accurately maintained to prevent transaction collisions.
                            </p>
                        </div>
                    </Card>

                    <div className="p-8 rounded-[3rem] bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <CardHeader className="p-0 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-indigo-400" />
                                <CardTitle className="text-xl font-black italic uppercase tracking-tighter">Growth Accelerator</CardTitle>
                            </div>
                            <CardDescription className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Global payout efficiency</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <p className="text-xs text-indigo-100 leading-relaxed opacity-80 mb-6 font-medium">
                                Localized payment methods increase checkout conversion by <span className="text-emerald-400 font-black">42%</span> in target MENA regions.
                            </p>
                            <Button variant="ghost" className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest transition-all">
                                View Analytics <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </div>
                </div>
            </div>

            <AddPaymentMethodModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddMethod}
            />
        </motion.div>
    );
}
