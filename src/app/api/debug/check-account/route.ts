import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

const COLLECTIONS = ['employees', 'users', 'players', 'clubs', 'academies', 'agents', 'trainers'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body?.phone || '').toString();
    
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const results: any[] = [];

    // البحث في جميع المجموعات
    for (const coll of COLLECTIONS) {
      try {
        const q = query(collection(db, coll), where('phone', '==', phone));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
          const data = doc.data();
          results.push({
            collection: coll,
            id: doc.id,
            email: data.email,
            phone: data.phone,
            isDeleted: data.isDeleted,
            isDeletedType: typeof data.isDeleted,
            isActive: data.isActive,
            isActiveType: typeof data.isActive,
            accountType: data.accountType,
            name: data.name || data.full_name,
            allFields: Object.keys(data)
          });
        });
      } catch (error) {
        console.error(`Error checking ${coll}:`, error);
      }
    }

    return NextResponse.json({
      phone,
      found: results.length > 0,
      count: results.length,
      accounts: results
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

