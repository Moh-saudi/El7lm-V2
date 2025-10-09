import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [check-user-exists] Checking:', { email, phone });

    let phoneExists = false;
    let emailExists = false;

    // التحقق من رقم الهاتف في المجموعات المختلفة
    if (phone) {
      const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers'];

      for (const collectionName of collections) {
        try {
          const q = query(
            collection(db, collectionName),
            where('phone', '==', phone)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            phoneExists = true;
            console.log(`✅ Phone found in ${collectionName}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Error checking ${collectionName}:`, error);
        }
      }
    }

    // التحقق من البريد الإلكتروني
    if (email && !phoneExists) {
      const collections = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers'];

      for (const collectionName of collections) {
        try {
          const q = query(
            collection(db, collectionName),
            where('email', '==', email)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            emailExists = true;
            console.log(`✅ Email found in ${collectionName}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Error checking ${collectionName}:`, error);
        }
      }
    }

    const response = {
      exists: phoneExists || emailExists,
      phoneExists,
      emailExists,
      message: phoneExists ? 'Phone number exists' : emailExists ? 'Email exists' : 'User not found'
    };

    console.log('📊 [check-user-exists] Results:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [check-user-exists] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
