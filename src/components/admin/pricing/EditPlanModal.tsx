'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Star, Settings, DollarSign, Layers, Info, Calendar, Edit3, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface SubscriptionPlan {
    id: string;
    title: string;
    subtitle?: string;
    period: string;
    base_currency: string;
    base_original_price: number;
    base_price: number;
    features: string[];
    bonusFeatures?: string[];
    isActive: boolean;
    order?: number;
}

interface EditPlanModalProps {
    plan: SubscriptionPlan;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlan: SubscriptionPlan) => void;
}

export default function EditPlanModal({ plan, isOpen, onClose, onSave }: EditPlanModalProps) {
    const [editedPlan, setEditedPlan] = useState<SubscriptionPlan>(plan);
    const [newFeature, setNewFeature] = useState('');
    const [newBonus, setNewBonus] = useState('');
    const [activeSection, setActiveSection] = useState<'basic' | 'features' | 'bonus'>('basic');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (plan) {
            setEditedPlan(plan);
        }
    }, [plan, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editedPlan);
            toast.success('✅ Protocol updated successfully');
            onClose();
        } catch (error) {
            toast.error('❌ Failed to update protocol');
        } finally {
            setIsSaving(false);
        }
    };

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setEditedPlan({
            ...editedPlan,
            features: [...(editedPlan.features || []), newFeature.trim()],
        });
        setNewFeature('');
        toast.success('Feature appended');
    };

    const removeFeature = (index: number) => {
        const updated = [...editedPlan.features];
        updated.splice(index, 1);
        setEditedPlan({ ...editedPlan, features: updated });
    };

    const addBonus = () => {
        if (!newBonus.trim()) return;
        setEditedPlan({
            ...editedPlan,
            bonusFeatures: [...(editedPlan.bonusFeatures || []), newBonus.trim()],
        });
        setNewBonus('');
        toast.success('Bonus accelerator added');
    };

    const removeBonus = (index: number) => {
        const updated = [...(editedPlan.bonusFeatures || [])];
        updated.splice(index, 1);
        setEditedPlan({ ...editedPlan, bonusFeatures: updated });
    };

    const SECTIONS = [
        { id: 'basic', label: 'Core Parameters', icon: <Settings className="w-4 h-4" /> },
        { id: 'features', label: 'Standard Protocols', icon: <Check className="w-4 h-4" /> },
        { id: 'bonus', label: 'Accelerators', icon: <Star className="w-4 h-4" /> }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    <DialogHeader className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-blue-600 text-white border-none py-1.5 px-4 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-blue-500/20">
                                Tier Optimization
                            </Badge>
                            <Edit3 className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                        <DialogTitle className="text-4xl font-black italic tracking-tighter">
                            {editedPlan.title}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-xs mt-2 p-0 max-w-md">
                            Refine institutional subscription protocols and feature sets.
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tier Title</label>
                                        <input
                                            type="text"
                                            value={editedPlan.title}
                                            onChange={(e) => setEditedPlan({ ...editedPlan, title: e.target.value })}
                                            className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Cycle Strategy (Period)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editedPlan.period}
                                                onChange={(e) => setEditedPlan({ ...editedPlan, period: e.target.value })}
                                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                                            />
                                            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Market Standard (Retail)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={editedPlan.base_original_price}
                                                    onChange={(e) => setEditedPlan({ ...editedPlan, base_original_price: parseFloat(e.target.value) })}
                                                    className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl font-black text-slate-400 line-through transition-all"
                                                />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{editedPlan.base_currency}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Strategic Price (Active)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={editedPlan.base_price}
                                                    onChange={(e) => setEditedPlan({ ...editedPlan, base_price: parseFloat(e.target.value) })}
                                                    className="w-full h-16 px-6 bg-white border-2 border-blue-500/20 rounded-2xl shadow-xl shadow-blue-500/5 font-black text-3xl text-slate-900 focus:border-blue-500 transition-all"
                                                />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 uppercase">{editedPlan.base_currency}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${editedPlan.isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-900">Operational Status</span>
                                    </div>
                                    <div
                                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${editedPlan.isActive ? 'bg-blue-500' : 'bg-slate-200'}`}
                                        onClick={() => setEditedPlan({ ...editedPlan, isActive: !editedPlan.isActive })}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ease-in-out ${editedPlan.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'features' && (
                            <motion.div
                                key="features"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        placeholder="Add standard tactical feature..."
                                        className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                                    />
                                    <Button onClick={addFeature} className="h-14 w-14 rounded-2xl bg-slate-900 text-white p-0">
                                        <Plus className="w-6 h-6" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {(editedPlan.features || []).map((feature, index) => (
                                        <div key={index} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500/30 hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{feature}</span>
                                            </div>
                                            <button onClick={() => removeFeature(index)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'bonus' && (
                            <motion.div
                                key="bonus"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newBonus}
                                        onChange={(e) => setNewBonus(e.target.value)}
                                        placeholder="Define performance accelerator..."
                                        className="flex-1 h-14 px-6 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-bold text-slate-900"
                                        onKeyPress={(e) => e.key === 'Enter' && addBonus()}
                                    />
                                    <Button onClick={addBonus} className="h-14 w-14 rounded-2xl bg-emerald-600 text-white p-0 shadow-lg shadow-emerald-500/20">
                                        <Star className="w-6 h-6" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {(editedPlan.bonusFeatures || []).map((bonus, index) => (
                                        <div key={index} className="group flex items-center justify-between p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl hover:border-emerald-500/30 hover:shadow-lg transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                                                    <Star className="w-4 h-4 fill-current" />
                                                </div>
                                                <span className="text-sm font-bold text-emerald-900">{bonus}</span>
                                            </div>
                                            <button onClick={() => removeBonus(index)} className="p-2 text-emerald-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
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
                        disabled={isSaving}
                        onClick={handleSave}
                        className="flex-[2] h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Commit Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
