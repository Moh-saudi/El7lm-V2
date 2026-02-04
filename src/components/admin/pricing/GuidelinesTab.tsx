'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Plus, Trash2, X, Check, Loader2, Tag, Star, Users, Layout, Sparkles, MessageSquare, Target, Eye, RefreshCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PricingService } from '@/lib/pricing/pricing-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";

// ==================== GUIDELINES TAB ====================

export default function GuidelinesTab() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [editForm, setEditForm] = useState<any>({
        badges: [],
        highlights: [],
        recommendedFor: '',
        description: ''
    });
    const [newBadge, setNewBadge] = useState('');
    const [newHighlight, setNewHighlight] = useState('');

    useEffect(() => {
        loadPlans();
    }, []);

    useEffect(() => {
        if (selectedPlanId) {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (plan) {
                setEditForm({
                    badges: plan.badges || [],
                    highlights: plan.highlights || [],
                    recommendedFor: plan.recommendedFor || '',
                    description: plan.description || ''
                });
            }
        }
    }, [selectedPlanId, plans]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await PricingService.getAllPlans();
            setPlans(plansData);
            if (plansData.length > 0 && !selectedPlanId) {
                setSelectedPlanId(plansData[0].id);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
            toast.error('Failed to synchronize guidelines');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedPlanId) return;
        setIsSaving(true);

        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            await PricingService.updatePlan({
                ...plan,
                badges: editForm.badges,
                highlights: editForm.highlights,
                recommendedFor: editForm.recommendedFor,
                description: editForm.description
            });

            toast.success('✅ Branding guidelines synchronized');
            loadPlans();
        } catch (error) {
            console.error('Error saving guidelines:', error);
            toast.error('❌ Synchronization failure');
        } finally {
            setIsSaving(false);
        }
    };

    const addBadge = () => {
        if (!newBadge.trim()) return;
        setEditForm({
            ...editForm,
            badges: [...editForm.badges, newBadge.trim()]
        });
        setNewBadge('');
        toast.success('Badge appended');
    };

    const removeBadge = (index: number) => {
        setEditForm({
            ...editForm,
            badges: editForm.badges.filter((_: any, i: number) => i !== index)
        });
    };

    const addHighlight = () => {
        if (!newHighlight.trim()) return;
        setEditForm({
            ...editForm,
            highlights: [...editForm.highlights, newHighlight.trim()]
        });
        setNewHighlight('');
        toast.success('Highlight synchronized');
    };

    const removeHighlight = (index: number) => {
        setEditForm({
            ...editForm,
            highlights: editForm.highlights.filter((_: any, i: number) => i !== index)
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center py-24 gap-4">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Creative Assets...</p>
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
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Creative Guidelines & Narrative</h2>
                    <p className="mt-2 text-slate-500 font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        Refine plan branding, strategic highlights, and marketing propositions.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-2 rounded-[1.5rem] border border-white shadow-xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Active Plan:</span>
                    <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase focus:ring-0 outline-none cursor-pointer hover:bg-slate-800 transition-all"
                    >
                        {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Visual Anchors & Branding */}
                <Card className="rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl p-10 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                    <CardHeader className="p-0 mb-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                                <Tag className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Strategic Branding</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visual visibility anchors</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 space-y-10">
                        {/* Shارات (Badges) */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-purple-600 tracking-[0.2em] flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" /> Identity Badges
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newBadge}
                                    onChange={(e) => setNewBadge(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addBadge()}
                                    placeholder="e.g. Most Popular, Elite Select..."
                                    className="flex-1 h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 font-bold text-slate-900 transition-all shadow-sm"
                                />
                                <Button onClick={addBadge} className="h-14 w-14 rounded-2xl bg-purple-600 text-white p-0 shadow-lg shadow-purple-500/20 active:scale-90">
                                    <Plus className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {editForm.badges.map((badge: string, index: number) => (
                                    <Badge key={index} className="h-10 px-4 bg-white border border-purple-100 text-purple-700 rounded-xl font-bold flex items-center gap-3 group hover:border-purple-300 hover:shadow-md transition-all">
                                        {badge}
                                        <button onClick={() => removeBadge(index)} className="hover:text-rose-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* highlights */}
                        <div className="space-y-4 pt-10 border-t border-slate-100/50">
                            <label className="text-[10px] font-black uppercase text-yellow-600 tracking-[0.2em] flex items-center gap-2">
                                <Star className="w-3.5 h-3.5" /> Strategic Highlights
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newHighlight}
                                    onChange={(e) => setNewHighlight(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                                    placeholder="e.g. Save 35% on annual protocol..."
                                    className="flex-1 h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-yellow-500/10 font-bold text-slate-900 transition-all shadow-sm"
                                />
                                <Button onClick={addHighlight} className="h-14 w-14 rounded-2xl bg-yellow-500 text-white p-0 shadow-lg shadow-yellow-500/20 active:scale-90">
                                    <Plus className="w-6 h-6" />
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                <AnimatePresence mode="popLayout">
                                    {editForm.highlights.map((highlight: string, index: number) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex justify-between items-center p-4 bg-yellow-50/30 border border-yellow-100/50 rounded-2xl group hover:border-yellow-300 hover:bg-white hover:shadow-lg transition-all"
                                        >
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-4">
                                                <div className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                </div>
                                                {highlight}
                                            </span>
                                            <button onClick={() => removeHighlight(index)} className="p-2 hover:bg-rose-50 text-rose-300 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Narrative & Value Proposition */}
                <div className="space-y-8">
                    <Card className="rounded-[3rem] border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl p-10 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                        <CardHeader className="p-0 mb-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Value Narrative</CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target audience & core proposition</CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> Target Entity Class
                                </label>
                                <input
                                    type="text"
                                    value={editForm.recommendedFor}
                                    onChange={(e) => setEditForm({ ...editForm, recommendedFor: e.target.value })}
                                    placeholder="e.g. Professional Sports Academies..."
                                    className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 transition-all shadow-sm"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                                    <MessageSquare className="w-3.5 h-3.5" /> Marketing Narrative
                                </label>
                                <textarea
                                    rows={6}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Compose a compelling narrative for this strategic tier..."
                                    className="w-full p-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 leading-relaxed custom-scrollbar shadow-sm min-h-[160px]"
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="p-0 mt-10">
                            <Button
                                disabled={isSaving}
                                onClick={handleSave}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Commit Narrative Updates
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Integrated Live Preview */}
                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden border border-white/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6">
                            <Eye className="w-3.5 h-3.5" /> Tier Visualization Preview
                        </h4>

                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {editForm.badges.map((badge: string, i: number) => (
                                    <span key={i} className="px-3 py-1.5 bg-blue-600 rounded-full text-[9px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20">
                                        {badge}
                                    </span>
                                ))}
                                {editForm.badges.length === 0 && <span className="text-[10px] text-slate-500 font-bold italic tracking-wider">No active badges...</span>}
                            </div>

                            <div className="space-y-3">
                                {editForm.highlights.map((h: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                        {h}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-white/5 font-medium">
                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                    {editForm.description || "Narrative pending configuration..."}
                                </p>
                            </div>

                            {editForm.recommendedFor && (
                                <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-white/5 rounded-xl border border-white/5 w-fit">
                                    <Users className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Targeting:</span>
                                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{editForm.recommendedFor}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
