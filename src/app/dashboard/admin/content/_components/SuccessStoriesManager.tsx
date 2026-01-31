'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Upload, User, Flag, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSuccessStories, saveSuccessStories, SuccessStory } from '@/lib/content/success-stories-service';
import { storageManager } from '@/lib/storage';

export default function SuccessStoriesManager() {
    const [stories, setStories] = useState<SuccessStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        try {
            const data = await getSuccessStories();
            setStories(data || []);
        } catch (error) {
            toast.error('Failed to load stories');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStory = () => {
        const newStory: SuccessStory = {
            id: Date.now(),
            name: 'New Player',
            role: 'Position',
            club: 'Club Name',
            flag: '🏳️',
            image: ''
        };
        setStories([...stories, newStory]);
    };

    const handleDelete = (id: number) => {
        setStories(stories.filter(s => s.id !== id));
    };

    const handleChange = (id: number, field: keyof SuccessStory, value: string) => {
        setStories(stories.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleImageUpload = async (id: number, file: File) => {
        try {
            setUploadingId(id);
            const fileName = `stories/${Date.now()}_${file.name}`;
            const result = await storageManager.upload('content', fileName, file, {
                contentType: file.type,
                upsert: true
            });

            if (result?.publicUrl) {
                handleChange(id, 'image', result.publicUrl);
                toast.success('Image uploaded');
            }
        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        } finally {
            setUploadingId(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveSuccessStories(stories);
            toast.success('Changes saved successfully');
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Success Stories</h3>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {stories.map((story) => (
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                            className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4 shadow-sm relative group"
                        >
                            <button
                                onClick={() => handleDelete(story.id)}
                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/80 rounded-full z-10"
                            >
                                <Trash2 size={16} />
                            </button>

                            <div className="flex gap-4">
                                {/* Image Upload Area */}
                                <div className="relative shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 z-20 cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleImageUpload(story.id, e.target.files[0]);
                                        }}
                                    />
                                    {uploadingId === story.id ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                            <Loader2 className="animate-spin text-blue-500" />
                                        </div>
                                    ) : story.image ? (
                                        <img src={story.image} alt={story.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Upload size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Inputs */}
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="text"
                                        value={story.name}
                                        onChange={(e) => handleChange(story.id, 'name', e.target.value)}
                                        placeholder="Player Name"
                                        className="w-full text-sm font-bold bg-transparent border-b border-transparent focus:border-blue-500 outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={story.role}
                                        onChange={(e) => handleChange(story.id, 'role', e.target.value)}
                                        placeholder="Role / Position"
                                        className="w-full text-xs text-gray-500 bg-transparent border-b border-transparent focus:border-blue-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={story.club}
                                            onChange={(e) => handleChange(story.id, 'club', e.target.value)}
                                            placeholder="Club"
                                            className="flex-1 text-xs bg-gray-50 dark:bg-slate-700 rounded px-2 py-1 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={story.flag}
                                            onChange={(e) => handleChange(story.id, 'flag', e.target.value)}
                                            placeholder="🏳️"
                                            className="w-8 text-center text-xs bg-gray-50 dark:bg-slate-700 rounded px-1 py-1 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Add Button */}
                <button
                    onClick={handleAddStory}
                    className="flex flex-col items-center justify-center h-[120px] border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-all text-gray-400 hover:text-blue-500"
                >
                    <Plus size={24} />
                    <span className="text-sm font-medium mt-2">Add Story</span>
                </button>
            </div>
        </div>
    );
}
