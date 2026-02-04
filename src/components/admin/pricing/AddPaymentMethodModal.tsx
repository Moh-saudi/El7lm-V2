'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, CreditCard, Banknote, Smartphone, Globe, Plus, Sparkles, Loader2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PaymentProvider {
    id: string;
    name: string;
    type: 'card' | 'wallet' | 'bank_transfer' | 'other';
    icon: string;
    description: string;
}

const COMMON_PROVIDERS: PaymentProvider[] = [
    { id: 'stripe', name: 'Stripe', type: 'card', icon: '💳', description: 'Global Infrastructure' },
    { id: 'paypal', name: 'PayPal', type: 'wallet', icon: '💙', description: 'Global Digital Wallet' },
    { id: 'vodafone_cash', name: 'Vodafone Cash', type: 'wallet', icon: '📱', description: 'MENA Mobile Liquidity' },
    { id: 'instapay', name: 'InstaPay', type: 'wallet', icon: '⚡', description: 'Instant Node Transfer' },
    { id: 'stc_pay', name: 'STC Pay', type: 'wallet', icon: '📱', description: 'KSA Digital Banking' },
    { id: 'skipcash', name: 'SkipCash', type: 'card', icon: '💳', description: 'Qatar Digital Gateway' },
    { id: 'zain_cash', name: 'Zain Cash', type: 'wallet', icon: '📱', description: 'Levant Mobile Wallet' },
    { id: 'bank_transfer', name: 'Bank Transfer', type: 'bank_transfer', icon: '🏦', description: 'Direct Institutional Sync' },
];

interface AddPaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (method: any) => void;
}

export default function AddPaymentMethodModal({ isOpen, onClose, onAdd }: AddPaymentMethodModalProps) {
    const [search, setSearch] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
    const [customName, setCustomName] = useState('');
    const [customType, setCustomType] = useState('wallet');

    const filteredProviders = COMMON_PROVIDERS.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleConfirm = () => {
        if (selectedProvider) {
            onAdd({
                id: selectedProvider.id === 'bank_transfer' ? `bank_${Date.now()}` : selectedProvider.id,
                name: selectedProvider.name,
                type: selectedProvider.type,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: selectedProvider.icon
            });
        } else if (customName) {
            onAdd({
                id: `custom_${Date.now()}`,
                name: customName,
                type: customType,
                enabled: true,
                isDefault: false,
                accountNumber: '',
                icon: customType === 'wallet' ? '📱' : customType === 'bank_transfer' ? '🏦' : '💳'
            });
        }
        onClose();
        setSearch('');
        setSelectedProvider(null);
        setCustomName('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-indigo-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-indigo-500/20">
                                Network Expansion
                            </Badge>
                            <CreditCard className="w-10 h-10 text-indigo-400 opacity-50" />
                        </div>
                        <DialogTitle className="text-4xl font-black italic tracking-tighter">
                            New Payment Protocol
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-xs mt-2 p-0 max-w-md">
                            Integrate sophisticated transaction nodes into regional operational grids.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-10 flex flex-col min-h-0 h-[500px]">
                    <div className="relative mb-8">
                        <input
                            type="text"
                            placeholder="Identify provider (Stripe, Vodafone, Instapay...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all text-lg"
                        />
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-10 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {filteredProviders.map((provider, idx) => (
                                <motion.div
                                    key={provider.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                    onClick={() => {
                                        setSelectedProvider(provider);
                                        setCustomName('');
                                    }}
                                    className={`
                                        relative group p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 flex items-center gap-5
                                        ${selectedProvider?.id === provider.id
                                            ? 'border-indigo-500 bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30'
                                            : 'bg-white border-slate-100 hover:border-indigo-500/30 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className={`w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 
                                        ${selectedProvider?.id === provider.id ? 'bg-white/20' : 'bg-slate-50'}
                                    `}>
                                        {provider.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-black tracking-tight text-lg ${selectedProvider?.id === provider.id ? 'text-white' : 'text-slate-900'}`}>
                                            {provider.name}
                                        </h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedProvider?.id === provider.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {provider.description}
                                        </p>
                                    </div>
                                    {selectedProvider?.id === provider.id && (
                                        <Check className="w-5 h-5 text-white" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Custom Provisioning */}
                        <div
                            onClick={() => setSelectedProvider(null)}
                            className={`
                                p-6 rounded-[2rem] border-2 border-dashed flex flex-col gap-4 transition-all duration-300
                                ${!selectedProvider && customName ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-600">Custom Provisioning</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Identifier name..."
                                value={customName}
                                onChange={(e) => {
                                    setCustomName(e.target.value);
                                    setSelectedProvider(null);
                                }}
                                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value)}
                                    className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500"
                                >
                                    <option value="wallet">Mobile Node</option>
                                    <option value="bank_transfer">Direct Sync</option>
                                    <option value="other">Misc Protocol</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        {selectedProvider ? (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-left">
                                <div className="text-2xl">{selectedProvider.icon}</div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Staging</p>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedProvider.name}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify protocol to proceed</p>
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
                            disabled={!selectedProvider && !customName}
                            className="flex-[2] md:flex-none h-14 px-12 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-3"
                        >
                            Execute Integration <Zap className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
