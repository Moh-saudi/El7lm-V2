'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';

export default function FixAdminPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState('Waiting for user...');

    useEffect(() => {
        if (!user) return;

        const upgradeUser = async () => {
            setStatus(`Processing user: ${user.id} (${user.email})...`);

            try {
                // 1. Update/Create entry in 'admins' collection (Primary source of truth for admin role)
                await supabase.from('admins').upsert({
                    id: user.id,
                    uid: user.id,
                    email: user.email,
                    role: 'admin',
                    isActive: true, // Critical
                    name: user.user_metadata?.displayName || 'Emergency Admin',
                    createdAt: new Date().toISOString(),
                    permissions: {
                        all: true // Master key
                    }
                });

                setStatus('Added to admins collection ✅');

                // 2. Update entry in 'users' collection (Used for session data)
                await supabase.from('users').update({
                    accountType: 'admin',
                    role: 'admin',
                    isAdmin: true
                }).eq('id', user.id);

                setStatus('Updated users collection ✅. You are now an ADMIN! Redirecting...');

                setTimeout(() => {
                    window.location.href = '/dashboard/admin';
                }, 2000);

            } catch (error: any) {
                console.error(error);
                setStatus(`Error: ${error.message}`);
            }
        };

        upgradeUser();
    }, [user]);

    return (
        <div className="p-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Admin Fix Tool</h1>
            <div className="p-4 bg-gray-100 rounded border border-gray-300">
                {status}
            </div>
            {!user && <p className="mt-4 text-red-500">Please login first (even as a club/player).</p>}
        </div>
    );
}
