"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, ProfileFormValues } from '../schemas/profile';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/supabase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

export const usePlayerProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { user } = useAuth();
    const { t } = useTranslation();
    const profileSchema = useMemo(() => createProfileSchema(t), [t]);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema) as any,
        defaultValues: {
            name: '',
            birth_date: '',
            gender: 'male',
            nationality: '',
            country: '',
            city: '',
            phone: '',
            email: '',
            whatsapp: '',
            address: '',

            // Education
            education_level: '',
            school_name: '',
            graduation_year: '',
            university_name: '',
            languages: [],
            courses: [],

            // Sports
            position: '',
            detailed_position: '',
            secondary_position: '',
            jersey_number: '',
            current_club: '',
            contract_status: 'free',
            foot: 'right',
            club_history: [],
            achievements: [],

            // Stats & Mentality
            stats_pace: 50, stats_shooting: 50, stats_passing: 50, stats_dribbling: 50, stats_defending: 50, stats_physical: 50,
            mentality_leadership: 50, mentality_teamwork: 50, mentality_vision: 50, mentality_aggression: 50, mentality_composure: 50,
            skill_moves: 3, weak_foot: 3, work_rate_attack: 'Medium', work_rate_defense: 'Medium',

            // Medical
            height: 0,
            weight: 0,
            blood_type: '',
            chronic_diseases: '',
            surgeries_list: [],
            allergies_list: [],
            medications: [],
            injuries: [],
            family_history: '',
            last_checkup: '',

            // Media & Links
            agent_name: '',
            agent_phone: '',
            transfermarkt_url: '',
            instagram_handle: '',
            social_links: [],
            videos: [],
            documents: [],
            images: [],

            // Legacy/Objects
            skills: {},
            contract_history: [],
            agent_history: [],
            official_contact: {},
            private_coaches: [],
            academies: [],
            has_private_coach: false,
            has_joined_academy: false,
            objectives: [],
        },
        mode: "onChange"
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                // 1. Fetch User Data (Role, Basic)
                let { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                if (!userData) {
                    const res = await supabase.from('users').select('*').eq('uid', user.id).maybeSingle();
                    userData = res.data;
                }

                // 2. Fetch Player Data (Specifics)
                let { data: playerData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                if (!playerData) {
                    const res = await supabase.from('players').select('*').eq('uid', user.id).maybeSingle();
                    playerData = res.data;
                }

                if (playerData || userData) {
                    const uData = userData || {};
                    const pData = playerData || {};

                    // Merge Data
                    const mergedData = {
                        ...uData,
                        ...pData,
                        // Map specific fields if names differ
                        name: pData.full_name || uData.displayName || '',
                        email: uData.email || user.email || '',
                        phone: pData.phone || uData.phoneNumber || '',
                        chronic_diseases: pData.chronic_diseases || pData.chronic_details || pData.chronic_conditions || '',
                        position: pData.position || pData.primary_position || '',
                        // Ensure arrays are arrays
                        club_history: pData.club_history || [],
                        achievements: pData.achievements || [],
                        videos: pData.videos || [],
                        images: pData.images || [],
                    };

                    if (Array.isArray(pData.social_links)) {
                        const ig = pData.social_links.find((s: any) => s && s.platform === 'instagram');
                        if (ig && !mergedData.instagram_handle) mergedData.instagram_handle = ig.handle || ig.url || '';
                        const tm = pData.social_links.find((s: any) => s && s.platform === 'transfermarkt');
                        if (tm && !mergedData.transfermarkt_url) mergedData.transfermarkt_url = tm.url || '';
                    }
                    if (!mergedData.university_name && pData.school_name && ['bachelors', 'masters', 'phd'].includes(pData.education_level)) {
                        mergedData.university_name = pData.school_name;
                    }

                    // Reset Form
                    console.log("Fetched Profile Data:", mergedData);
                    form.reset(mergedData);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                toast.error(t('profile.notifications.loadFailed'));
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, form, t]);

    const saveProfile = async (values: ProfileFormValues) => {
        if (!user) return;
        setSaving(true);
        try {
            // Prepare Valid Data (remove undefined)
            const dataToSave = JSON.parse(JSON.stringify(values));

            // Stamp createdAt on new videos that don't have one
            if (Array.isArray(dataToSave.videos)) {
                dataToSave.videos = dataToSave.videos.map((v: any) => ({
                    ...v,
                    createdAt: v.createdAt || new Date().toISOString(),
                }));
            }

            // Sync aliases
            dataToSave.full_name = values.name;
            if (values.position) dataToSave.primary_position = values.position;
            if (values.chronic_diseases) {
                const hasCondition = Boolean(
                    values.chronic_diseases.trim() &&
                    values.chronic_diseases.trim() !== 'لا يوجد' &&
                    values.chronic_diseases.trim().toLowerCase() !== 'none'
                );
                dataToSave.chronic_details = values.chronic_diseases;
                dataToSave.chronic_conditions = hasCondition;
                dataToSave.has_chronic_conditions = hasCondition;
            }

            // Sync social links
            const currentLinks = Array.isArray(dataToSave.social_links) ? [...dataToSave.social_links] : [];
            if (values.instagram_handle) {
                const idx = currentLinks.findIndex((s: any) => s && s.platform === 'instagram');
                if (idx >= 0) currentLinks[idx].handle = values.instagram_handle;
                else currentLinks.push({ platform: 'instagram', handle: values.instagram_handle });
            }
            if (values.transfermarkt_url) {
                const idx = currentLinks.findIndex((s: any) => s && s.platform === 'transfermarkt');
                if (idx >= 0) currentLinks[idx].url = values.transfermarkt_url;
                else currentLinks.push({ platform: 'transfermarkt', url: values.transfermarkt_url });
            }
            dataToSave.social_links = currentLinks;

            // Update Player Doc with resilient missing-column fallback
            const playerPayload: Record<string, any> = {
                id: user.id,
                ...dataToSave,
                updatedAt: new Date().toISOString(),
                full_name: values.name,
            };

            let saved = false;
            while (!saved && Object.keys(playerPayload).length > 1) {
                const { error: upsertErr } = await supabase.from('players').upsert(playerPayload);
                if (!upsertErr) {
                    saved = true;
                    break;
                }
                const errStr = upsertErr.message || '';
                const match = errStr.match(/(?:Could not find the '([a-zA-Z0-9_]+)' column|column (?:public\.)?players\.([a-zA-Z0-9_]+) does not exist)/i);
                const missingCol = match ? (match[1] || match[2]) : null;
                if (missingCol && missingCol in playerPayload) {
                    console.warn(`Column "${missingCol}" not found in players table cache. Retrying without it...`);
                    delete playerPayload[missingCol];
                    continue;
                }
                throw upsertErr;
            }

            // Update User Doc (Basic Info)
            await supabase.from('users').upsert({
                id: user.id,
                displayName: values.name,
                phoneNumber: values.phone,
                updatedAt: new Date().toISOString(),
                isProfileComplete: true
            });

            toast.success(t('profile.notifications.saved'));
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error(t('profile.notifications.saveFailed'));
        }
        setSaving(false);
    };

    return { form, loading, saving, saveProfile, user, isEditing, setIsEditing };
};
