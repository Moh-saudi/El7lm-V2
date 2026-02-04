'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Plus, Trash2, X, Check, AlertCircle, Loader2, Tag, Star, Users, Briefcase, User, GraduationCap, Layout, Globe, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PricingService } from '@/lib/pricing/pricing-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ==================== ACCOUNT TYPE PRICING TAB ====================

function AccountTypePricingTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [editingType, setEditingType] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await PricingService.getAllPlans();
            setPlans(plansData);
            if (plansData.length > 0 && !selectedPlan) {
                setSelectedPlan(plansData[0].id);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Failed to synchronize pricing protocols');
        } finally {
            setLoading(false);
        }
    };

    const currentPlan = plans.find(p => p.id === selectedPlan);

    const ACCOUNT_TYPES = [
        { code: 'club', name: 'Clubs', icon: <Layout className="w-8 h-8" />, color: 'blue', desc: 'Institutional elite entities' },
        { code: 'academy', name: 'Academies', icon: <GraduationCap className="w-8 h-8" />, color: 'emerald', desc: 'Developmental organizations' },
        { code: 'trainer', name: 'Trainers', icon: <Star className="w-8 h-8" />, color: 'purple', desc: 'Individual professionals' },
        { code: 'agent', name: 'Agents', icon: <Briefcase className="w-8 h-8" />, color: 'orange', desc: 'Strategic intermediaries' },
        { code: 'player', name: 'Players', icon: <User className="w-8 h-8" />, color: 'rose', desc: 'Rising athletic talent' },
    ];

    const handleEditType = (typeCode: string) => {
        const override = currentPlan?.accountTypeOverrides?.[typeCode];

        setEditingType(typeCode);
        setEditForm({
            original_price: override?.original_price || currentPlan?.base_original_price || 0,
            price: override?.price || currentPlan?.base_price || 0,
            discount_percentage: override?.discount_percentage || 0,
            active: override?.active ?? true,
        });
    };

    const handleSaveTypePrice = async () => {
        if (!editingType || !currentPlan) return;
        setIsSaving(true);

        try {
            const updatedOverrides = {
                ...currentPlan.accountTypeOverrides,
                [editingType]: {
                    original_price: editForm.original_price ? parseFloat(editForm.original_price) : undefined,
                    price: editForm.price ? parseFloat(editForm.price) : undefined,
                    discount_percentage: editForm.discount_percentage ? parseFloat(editForm.discount_percentage) : undefined,
                    active: editForm.active
                }
            };

            await PricingService.updatePlan({
                ...currentPlan,
                accountTypeOverrides: updatedOverrides
            });

            toast.success('✅ Target protocol synchronized');
            setEditingType(null);
            loadPlans();
        } catch (error) {
            console.error('Error saving override:', error);
            toast.error('❌ Synchronization failure');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveTypePrice = async (typeCode: string) => {
        if (!currentPlan) return;

        try {
            const updatedOverrides = { ...currentPlan.accountTypeOverrides };
            delete updatedOverrides[typeCode];

            await PricingService.updatePlan({
                ...currentPlan,
                accountTypeOverrides: updatedOverrides
            });

            toast.success('✅ Override purged');
            loadPlans();
        } catch (error) {
            console.error('Error removing override:', error);
            toast.error('❌ Process termination failed');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-24 gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Global Tiers...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Protocol Optimization</h2>
                    <p className="mt-2 text-slate-500 font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Configure role-specific financial overrides for institutional targeting.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-2 rounded-[1.5rem] border border-white shadow-xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Active Strategy:</span>
                    <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase focus:ring-0 outline-none cursor-pointer hover:bg-slate-800 transition-all"
                    >
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Strategy Context Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 rounded-[2.5rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Global Baseline</h3>
                                <p className="text-[10px] text-slate-400 font-bold">Standard tier configuration</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Rate</span>
                                <span className="text-xl font-black text-slate-400 line-through opacity-50">${currentPlan?.base_original_price || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Strategy Price</span>
                                <span className="text-2xl font-black text-emerald-600">${currentPlan?.base_price || 0}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                            <p className="text-[10px] text-blue-900 font-bold leading-relaxed flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                Custom role overrides take precedence over global baseline parameters for selected account types.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Account Types Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ACCOUNT_TYPES.map((type, index) => {
                        const override = currentPlan?.accountTypeOverrides?.[type.code];
                        const hasCustomPrice = !!override;

                        return (
                            <motion.div
                                key={type.code}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className={`rounded-[2.5rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden group hover:scale-[1.03] transition-all duration-300 h-full flex flex-col ${hasCustomPrice ? 'ring-2 ring-blue-500/30 shadow-blue-500/5' : ''}`}>
                                    <div className="p-6 pb-2">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-4 rounded-2xl shadow-inner flex items-center justify-center
                                                    ${type.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                        type.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                                            type.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                                                                type.color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600'}
                                                `}>
                                                    {type.icon}
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{type.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{type.desc}</p>
                                                </div>
                                            </div>
                                            {hasCustomPrice && (
                                                <Badge className="bg-blue-600 text-white border-none py-1 px-3 rounded-full font-black text-[8px] tracking-[0.2em] shadow-lg shadow-blue-500/20">
                                                    OVERRIDE
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <CardContent className="px-6 pt-0 flex-1">
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Effective Rate</p>
                                                <p className={`text-xl font-black ${hasCustomPrice ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {hasCustomPrice ? `$${override.price}` : 'Default'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Reduction</p>
                                                <p className={`text-xl font-black ${override?.discount_percentage ? 'text-orange-600' : 'text-slate-400'}`}>
                                                    {override?.discount_percentage ? `${override.discount_percentage}%` : 'Standard'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${hasCustomPrice ? (override.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300') : 'bg-blue-400'}`} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                    {hasCustomPrice ? (override.active ? 'Operational' : 'Suspended') : 'Global Sync'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditType(type.code)}
                                                    className="w-10 h-10 rounded-xl bg-white hover:bg-slate-900 hover:text-white border border-slate-200 shadow-sm transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                {hasCustomPrice && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveTypePrice(type.code)}
                                                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Edit Override Dialog */}
            <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
                <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl border-white rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                    <div className="relative p-10 bg-slate-900 text-white overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <DialogHeader className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                    {ACCOUNT_TYPES.find(t => t.code === editingType)?.icon}
                                </div>
                                <div>
                                    <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">
                                        {ACCOUNT_TYPES.find(t => t.code === editingType)?.name}
                                    </DialogTitle>
                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Institutional Override</p>
                                </div>
                            </div>
                            <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 p-0">
                                Configure specific financial parameters for {ACCOUNT_TYPES.find(t => t.code === editingType)?.name}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Retail Rate</label>
                                    <input
                                        type="number"
                                        value={editForm.original_price}
                                        onChange={(e) => setEditForm({ ...editForm, original_price: e.target.value })}
                                        className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-400 line-through transition-all"
                                        placeholder="60"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Strategy Price</label>
                                    <input
                                        type="number"
                                        value={editForm.price}
                                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                        className="w-full h-14 px-6 bg-white border-2 border-blue-500/20 rounded-2xl font-black text-slate-900 focus:border-blue-500 transition-all text-xl"
                                        placeholder="35"
                                    />
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">or define reduction</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Reduction Protocol (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={editForm.discount_percentage}
                                        onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                                        className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="20"
                                        min="0"
                                        max="100"
                                    />
                                    <Tag className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${editForm.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Synchronized State</span>
                            </div>
                            <div
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${editForm.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                onClick={() => setEditForm({ ...editForm, active: !editForm.active })}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ease-in-out ${editForm.active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setEditingType(null)}
                                className="flex-1 h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={isSaving}
                                onClick={handleSaveTypePrice}
                                className="flex-[2] h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply Protocol'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

export default AccountTypePricingTab;
