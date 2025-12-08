import { adminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];

async function check(email: string) {
    if (!adminDb) throw new Error('No Admin DB');

    for (const coll of COLLECTIONS) {
        const snap = await adminDb.collection(coll).where('email', '==', email).limit(1).get();
        if (!snap.empty) {
            const data = snap.docs[0].data();
            return {
                found: true,
                collection: coll,
                isDeleted: data.isDeleted,
                isActive: data.isActive,
                email: data.email,
                uid: data.uid
            };
        }
    }
    return { found: false };
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        const result = await check(email);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        const result = await check(email);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
