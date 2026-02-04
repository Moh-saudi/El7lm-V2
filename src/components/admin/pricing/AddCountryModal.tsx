'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, MapPin, Search, Check, Loader2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CountryPreset {
    code: string;
    name: string;
    currency: string;
    flag: string;
    region: string;
}

const COUNTRY_PRESETS: CountryPreset[] = [
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', flag: '🇸🇦', region: 'Gulf' },
    { code: 'QA', name: 'Qatar', currency: 'QAR', flag: '🇶🇦', region: 'Gulf' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', flag: '🇦🇪', region: 'Gulf' },
    { code: 'KW', name: 'Kuwait', currency: 'KWD', flag: '🇰🇼', region: 'Gulf' },
    { code: 'BH', name: 'Bahrain', currency: 'BHD', flag: '🇧🇭', region: 'Gulf' },
    { code: 'OM', name: 'Oman', currency: 'OMR', flag: '🇴🇲', region: 'Gulf' },
    { code: 'EG', name: 'Egypt', currency: 'EGP', flag: '🇪🇬', region: 'North Africa' },
    { code: 'LY', name: 'Libya', currency: 'LYD', flag: '🇱🇾', region: 'North Africa' },
    { code: 'TN', name: 'Tunisia', currency: 'TND', flag: '🇹🇳', region: 'North Africa' },
    { code: 'DZ', name: 'Algeria', currency: 'DZD', flag: '🇩🇿', region: 'North Africa' },
    { code: 'MA', name: 'Morocco', currency: 'MAD', flag: '🇲🇦', region: 'North Africa' },
    { code: 'SD', name: 'Sudan', currency: 'SDG', flag: '🇸🇩', region: 'North Africa' },
    { code: 'IQ', name: 'Iraq', currency: 'IQD', flag: '🇮🇶', region: 'Middle East' },
    { code: 'JO', name: 'Jordan', currency: 'JOD', flag: '🇯🇴', region: 'Middle East' },
    { code: 'PS', name: 'Palestine', currency: 'ILS', flag: '🇵🇸', region: 'Middle East' },
    { code: 'LB', name: 'Lebanon', currency: 'LBP', flag: '🇱🇧', region: 'Middle East' },
    { code: 'SY', name: 'Syria', currency: 'SYP', flag: '🇸🇾', region: 'Middle East' },
    { code: 'YE', name: 'Yemen', currency: 'YER', flag: '🇾🇪', region: 'Middle East' },
    { code: 'TR', name: 'Turkey', currency: 'TRY', flag: '🇹🇷', region: 'Other' },
    { code: 'GLOBAL', name: 'Global (USD)', currency: 'USD', flag: '🌍', region: 'Global' },
];

interface AddCountryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (country: any) => void;
    existingCodes: string[];
}

export default function AddCountryModal({ isOpen, onClose, onAdd, existingCodes }: AddCountryModalProps) {
    const [search, setSearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<CountryPreset | null>(null);

    const filteredCountries = COUNTRY_PRESETS.filter(c =>
        (c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search.toUpperCase())) &&
        !existingCodes.includes(c.code)
    );

    const handleConfirm = () => {
        if (selectedCountry) {
            onAdd({
                countryCode: selectedCountry.code,
                countryName: selectedCountry.name,
                currency: selectedCountry.currency,
                methods: [
                    {
                        id: 'bank_transfer',
                        name: 'Bank Transfer',
                        type: 'bank_transfer',
                        enabled: true,
                        isDefault: false,
                        accountNumber: '',
                        icon: '🏦'
                    },
                    ...(selectedCountry.code === 'EG' ? [{ id: 'vodafone_cash', name: 'Vodafone Cash', type: 'wallet', enabled: true, icon: '📱' }] : []),
                    ...(selectedCountry.code === 'QA' ? [{ id: 'skipcash', name: 'SkipCash', type: 'card', enabled: true, icon: '💳' }] : []),
                    ...(selectedCountry.code === 'SA' ? [{ id: 'stc_pay', name: 'STC Pay', type: 'wallet', enabled: true, icon: '📱' }] : []),
                    ...(selectedCountry.code === 'IQ' ? [{ id: 'zain_cash', name: 'Zain Cash', type: 'wallet', enabled: true, icon: '📱' }] : []),
                ]
            });
            onClose();
            setSelectedCountry(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-blue-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-500/20">
                                Global Expansion
                            </Badge>
                            <Globe className="w-10 h-10 text-blue-500 opacity-50" />
                        </div>
                        <DialogTitle className="text-4xl font-black italic tracking-tighter">
                            New Operational Region
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-xs mt-2 p-0 max-w-md">
                            Integrate localized financial ecosystems for institutional athletes and partners.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-10 flex flex-col min-h-0 h-[600px]">
                    <div className="relative mb-8">
                        <input
                            type="text"
                            placeholder="Search sovereign regions (Saudi, Egypt, Iraq...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 transition-all text-lg"
                            autoFocus
                        />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {filteredCountries.map((country, idx) => (
                                <motion.div
                                    key={country.code}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                    onClick={() => setSelectedCountry(country)}
                                    className={`
                                        relative group p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 flex flex-col justify-between h-[160px]
                                        ${selectedCountry?.code === country.code
                                            ? 'border-blue-500 bg-blue-600 text-white shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10'
                                            : 'bg-white border-slate-100 hover:border-blue-500/30 hover:bg-slate-50 hover:shadow-xl'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={`text-4xl filter drop-shadow-sm transition-transform duration-500 group-hover:scale-110`}>
                                            {country.flag}
                                        </div>
                                        <Badge className={`border-none rounded-full px-3 py-1 text-[8px] font-black tracking-widest uppercase
                                            ${selectedCountry?.code === country.code ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}
                                        `}>
                                            {country.region}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h4 className={`font-black tracking-tight text-xl mb-1 ${selectedCountry?.code === country.code ? 'text-white' : 'text-slate-900'}`}>
                                            {country.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border
                                                ${selectedCountry?.code === country.code ? 'border-white/30 text-white/80' : 'border-slate-200 text-slate-500'}
                                            `}>
                                                {country.code}
                                            </span>
                                            <span className={`text-[10px] font-black tracking-widest uppercase
                                                ${selectedCountry?.code === country.code ? 'text-emerald-300' : 'text-emerald-600'}
                                            `}>
                                                {country.currency}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedCountry?.code === country.code && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute top-4 right-4 w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg"
                                        >
                                            <Check className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredCountries.length === 0 && (
                            <div className="col-span-full py-24 text-center">
                                <MapPin className="w-16 h-16 mx-auto mb-6 text-slate-200" />
                                <p className="text-xl font-black text-slate-400 italic">No uncharted territories found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        {selectedCountry ? (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-left">
                                <div className="text-2xl">{selectedCountry.flag}</div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Staging</p>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedCountry.name}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select region to proceed</p>
                        )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 md:flex-none h-14 px-8 rounded-2xl text-slate-600 font-bold hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!selectedCountry}
                            className="flex-[2] md:flex-none h-14 px-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-3"
                        >
                            Initialize Sync <Zap className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
