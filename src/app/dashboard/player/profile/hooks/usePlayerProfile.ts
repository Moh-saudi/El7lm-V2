"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, ProfileFormValues } from '../schemas/profile';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { toast } from 'sonner';

export const usePlayerProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { user } = useAuth();

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
                        // Ensure arrays are arrays
                        club_history: pData.club_history || [],
                        achievements: pData.achievements || [],
                        videos: pData.videos || [],
                        images: pData.images || [],
                    };

                    // Reset Form
                    console.log("Fetched Profile Data:", mergedData);
                    form.reset(mergedData);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
                toast.error("فشل تحميل بيانات الملف الشخصي");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, form]);

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

            // Update Player Doc
            await supabase.from('players').upsert({
                id: user.id,
                ...dataToSave,
                updatedAt: new Date().toISOString(),
                full_name: values.name, // Maintain legacy field name if needed
            });

            // Update User Doc (Basic Info)
            await supabase.from('users').upsert({
                id: user.id,
                displayName: values.name,
                phoneNumber: values.phone,
                updatedAt: new Date().toISOString(),
                isProfileComplete: true
            });

            toast.success("تم حفظ التغييرات بنجاح");
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.");
        }
        setSaving(false);
    };

    return { form, loading, saving, saveProfile, user, isEditing, setIsEditing };
};
