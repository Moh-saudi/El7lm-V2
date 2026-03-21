"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, ProfileFormValues } from '../schemas/profile';
import { db, auth } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

export const usePlayerProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // 1. Fetch User Data (Role, Basic)
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    // 2. Fetch Player Data (Specifics)
                    const playerDocRef = doc(db, 'players', currentUser.uid);
                    const playerSnap = await getDoc(playerDocRef);

                    if (playerSnap.exists() || userSnap.exists()) {
                        const userData = userSnap.data() || {};
                        const playerData = playerSnap.data() || {};

                        // Merge Data
                        const mergedData = {
                            ...userData,
                            ...playerData,
                            // Map specific fields if names differ
                            name: playerData.full_name || userData.displayName || '',
                            email: userData.email || currentUser.email || '',
                            phone: playerData.phone || userData.phoneNumber || '',
                            // Ensure arrays are arrays
                            club_history: playerData.club_history || [],
                            achievements: playerData.achievements || [],
                            videos: playerData.videos || [],
                            images: playerData.images || [],
                        };

                        // Reset Form
                        console.log("Fetched Profile Data:", mergedData);
                        form.reset(mergedData);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    toast.error("فشل تحميل بيانات الملف الشخصي");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [form]);

    const saveProfile = async (values: ProfileFormValues) => {
        if (!user) return;
        setSaving(true);
        try {
            const playerDocRef = doc(db, 'players', user.uid);
            const userDocRef = doc(db, 'users', user.uid);

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
            await setDoc(playerDocRef, {
                ...dataToSave,
                updatedAt: new Date().toISOString(),
                full_name: values.name, // Maintain legacy field name if needed
            }, { merge: true });

            // Update User Doc (Basic Info)
            await setDoc(userDocRef, {
                displayName: values.name,
                phoneNumber: values.phone,
                updatedAt: new Date().toISOString(),
                isProfileComplete: true
            }, { merge: true });

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
