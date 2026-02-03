'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function FixAdminPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState('Waiting for user...');

    useEffect(() => {
        if (!user) return;

        const upgradeUser = async () => {
            setStatus(`Processing user: ${user.uid} (${user.email})...`);

            try {
                // 1. Update/Create entry in 'admins' collection (Primary source of truth for admin role)
                const adminRef = doc(db, 'admins', user.uid);
                await setDoc(adminRef, {
                    uid: user.uid,
                    email: user.email,
                    role: 'admin',
                    isActive: true, // Critical
                    name: user.displayName || 'Emergency Admin',
                    createdAt: new Date(),
                    permissions: {
                        all: true // Master key
                    }
                }, { merge: true });

                setStatus('Added to admins collection ✅');

                // 2. Update entry in 'users' collection (Used for session data)
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    accountType: 'admin',
                    role: 'admin',
                    isAdmin: true
                });

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
