'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Gift, AlertCircle, Calendar, Tag, Users, Globe, Layers, Percent, DollarSign, Plus, RefreshCcw, Loader2 } from 'lucide-react';
import { COUNTRIES } from '@/constants/countries';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CreateOfferModalProps {
    isOpen: boolean;
    formData: any;
    onClose: () => void;
    onSave: () => void;
    onChange: (data: any) => void;
    availablePlans: any[];
    isEditing?: boolean;
}

export default function CreateOfferModal({
    isOpen,
    formData,
    onClose,
    onSave,
    onChange,
    availablePlans,
    isEditing = false
}: CreateOfferModalProps) {
    const [activeSection, setActiveSection] = React.useState<'basic' | 'scope' | 'limits' | 'conditions'>('basic');

    const ACCOUNT_TYPES = [
        { value: 'club', label: 'Clubs', icon: <Users className="w-4 h-4" /> },
        { value: 'academy', label: 'Academies', icon: <Users className="w-4 h-4" /> },
        { value: 'trainer', label: 'Trainers', icon: <Users className="w-4 h-4" /> },
        { value: 'agent', label: 'Agents', icon: <Users className="w-4 h-4" /> },
        { value: 'player', label: 'Players', icon: <Users className="w-4 h-4" /> }
    ];

    const toggleAccountType = (type: string) => {
        const current = formData.targetAccountTypes || [];
        const updated = current.includes(type)
            ? current.filter((t: string) => t !== type)
            : [...current, type];
        onChange({ ...formData, targetAccountTypes: updated });
    };

    const toggleCountry = (code: string) => {
        const current = formData.targetCountries || [];
        const updated = current.includes(code)
            ? current.filter((c: string) => c !== code)
            : [...current, code];
        onChange({ ...formData, targetCountries: updated });
    };

    const togglePlan = (planId: string) => {
        const current = formData.applicablePlans || [];
        const updated = current.includes(planId)
            ? current.filter((p: string) => p !== planId)
            : [...current, planId];
        onChange({ ...formData, applicablePlans: updated });
    };

    const SECTIONS = [
        { id: 'basic', label: 'Protocol', icon: <Tag className="w-4 h-4" /> },
        { id: 'scope', label: 'Audience', icon: <Users className="w-4 h-4" /> },
        { id: 'limits', label: 'Parameters', icon: <Layers className="w-4 h-4" /> },
        { id: 'conditions', label: 'Logic', icon: <AlertCircle className="w-4 h-4" /> }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-emerald-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20">
                                Growth Accelerator
                            </Badge>
                            <Gift className="w-8 h-8 text-emerald-500 opacity-50" />
                        </div>
                        <DialogTitle className="text-4xl font-black italic tracking-tighter">
                            {isEditing ? 'Modify Campaign' : 'Initialize Offer'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-xs mt-2 p-0 max-w-md">
                            Configure promotional protocols to optimize user acquisition and retention.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                    {SECTIONS.map((section: any) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all
                                ${activeSection === section.id
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        >
                            {section.icon}
                            {section.label}
                        </button>
                    ))}
                </div>

                <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeSection === 'basic' && (
                            <motion.div
                                key="basic"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Campaign Identity</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => onChange({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Ramadan Performance Boost 2024..."
                                        className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-900 transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Narrative Description</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => onChange({ ...formData, description: e.target.value })}
                                        placeholder="Briefly define the value proposition..."
                                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-900"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Protocol Code</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.code || ''}
                                                onChange={(e) => onChange({ ...formData, code: e.target.value.toUpperCase() })}
                                                placeholder="VIP2024"
                                                className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black tracking-widest text-slate-900"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const randomCode = `OFFER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                                                    onChange({ ...formData, code: randomCode });
                                                }}
                                                className="w-14 h-14 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                                            >
                                                <RefreshCcw className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Discount Logic</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div
                                                onClick={() => onChange({ ...formData, discountType: 'percentage' })}
                                                className={`h-14 flex items-center justify-center gap-2 rounded-2xl cursor-pointer font-bold text-xs transition-all border
                                                    ${formData.discountType === 'percentage' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                            >
                                                <Percent className="w-4 h-4" /> Percentage
                                            </div>
                                            <div
                                                onClick={() => onChange({ ...formData, discountType: 'fixed' })}
                                                className={`h-14 flex items-center justify-center gap-2 rounded-2xl cursor-pointer font-bold text-xs transition-all border
                                                    ${formData.discountType === 'fixed' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                            >
                                                <DollarSign className="w-4 h-4" /> Fixed Amount
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Discount Value</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.discountValue}
                                                onChange={(e) => onChange({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-14 px-6 bg-slate-50 border-2 border-emerald-500/20 rounded-2xl font-black text-2xl text-slate-900"
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">
                                                {formData.discountType === 'percentage' ? '%' : 'USD'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Deployment Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => onChange({ ...formData, startDate: e.target.value })}
                                            className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Expiration Date</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => onChange({ ...formData, endDate: e.target.value })}
                                            className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-900">Immediate Deployment</span>
                                    </div>
                                    <div
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        onClick={() => onChange({ ...formData, isActive: !formData.isActive })}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ease-in-out ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'scope' && (
                            <motion.div
                                key="scope"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 text-center block">Target Audience Architecture</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'all', label: 'Global (All Users)', icon: <Globe className="w-5 h-5 text-blue-500" /> },
                                            { id: 'accountTypes', label: 'Role Specific', icon: <Users className="w-5 h-5 text-purple-500" /> },
                                            { id: 'countries', label: 'Regional Focus', icon: <Globe className="w-5 h-5 text-emerald-500" /> }
                                        ].map((scope) => (
                                            <div
                                                key={scope.id}
                                                onClick={() => onChange({ ...formData, scope: scope.id })}
                                                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3
                                                    ${formData.scope === scope.id
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-105'
                                                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                            >
                                                {scope.icon}
                                                <span className="text-xs font-black uppercase tracking-tighter leading-tight">{scope.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {formData.scope === 'accountTypes' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Target Account Roles</label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {ACCOUNT_TYPES.map(type => (
                                                <div
                                                    key={type.value}
                                                    onClick={() => toggleAccountType(type.value)}
                                                    className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center gap-2
                                                        ${formData.targetAccountTypes?.includes(type.value)
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg'
                                                            : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {type.icon}
                                                    <span className="text-[10px] font-black uppercase">{type.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {formData.scope === 'countries' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Regional Parameters</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[2rem] border border-slate-100 custom-scrollbar">
                                            {COUNTRIES.map(country => (
                                                <div
                                                    key={country.code}
                                                    onClick={() => toggleCountry(country.code)}
                                                    className={`p-3 rounded-xl cursor-pointer border-2 transition-all flex items-center gap-3
                                                        ${formData.targetCountries?.includes(country.code)
                                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : 'bg-white text-slate-600 border-slate-100'
                                                        }`}
                                                >
                                                    <span className="text-lg">{country.flag}</span>
                                                    <span className="text-[10px] font-bold uppercase truncate">{country.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {activeSection === 'limits' && (
                            <motion.div
                                key="limits"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 text-center block">Usage Constraint Protocols</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'unlimited', label: 'Infinite', desc: 'No constraints', icon: <Layers className="w-5 h-5 text-slate-400" /> },
                                            { id: 'total', label: 'Global Ceiling', desc: 'Fixed pool size', icon: <Tag className="w-5 h-5 text-emerald-500" /> },
                                            { id: 'perUser', label: 'Individual Cap', desc: 'Once per entity', icon: <Users className="w-5 h-5 text-blue-500" /> }
                                        ].map((limit) => (
                                            <div
                                                key={limit.id}
                                                onClick={() => onChange({ ...formData, usageLimitType: limit.id })}
                                                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2
                                                    ${formData.usageLimitType === limit.id
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-105'
                                                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                            >
                                                {limit.icon}
                                                <span className="text-xs font-black uppercase tracking-tighter">{limit.label}</span>
                                                <span className="text-[8px] font-bold uppercase opacity-50 tracking-widest">{limit.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {formData.usageLimitType === 'total' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 block text-center">Protocol Activation Pool Size</label>
                                        <input
                                            type="number"
                                            value={formData.totalUsageLimit}
                                            onChange={(e) => onChange({ ...formData, totalUsageLimit: parseInt(e.target.value) || 0 })}
                                            className="w-full h-20 text-center bg-white border-2 border-slate-200 rounded-3xl font-black text-5xl text-slate-900 focus:border-emerald-500 transition-all"
                                            placeholder="100"
                                        />
                                        <p className="text-[8px] font-black text-center text-slate-400 uppercase tracking-[0.2em] mt-2">Maximum valid redemptions across total network</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {activeSection === 'conditions' && (
                            <motion.div
                                key="conditions"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tier Applicability</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[2rem] border border-slate-100 custom-scrollbar">
                                        {(availablePlans || []).map(plan => (
                                            <div
                                                key={plan.id}
                                                onClick={() => togglePlan(plan.id)}
                                                className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between
                                                    ${formData.applicablePlans?.includes(plan.id)
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tight">{plan.title || plan.name}</span>
                                                {formData.applicablePlans?.includes(plan.id) && <Check className="w-4 h-4" />}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">Select specific tiers or leave clear for universal eligibility</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Minimum Roster Size</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.minPlayers}
                                                onChange={(e) => onChange({ ...formData, minPlayers: parseInt(e.target.value) || 0 })}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900"
                                                placeholder="0"
                                            />
                                            <Users className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Minimum Transaction (USD)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.minAmount}
                                                onChange={(e) => onChange({ ...formData, minAmount: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900"
                                                placeholder="0.00"
                                            />
                                            <DollarSign className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                    <Button variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 font-bold transition-all">
                        Cancel
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={!formData.title || !formData.discountValue}
                        className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isEditing ? 'Authorize Updates' : 'Launch Campaign'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

