import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, orderBy, query, Timestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/careers/applications
 * جلب جميع طلبات التوظيف
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Careers API] Fetching career applications...');

    // Skip Firebase calls during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('🚫 [Careers API] Skipping Firebase calls during build phase');
      return NextResponse.json({
        success: true,
        items: []
      });
    }

    const applicationsRef = collection(db, 'careerApplications');
    const q = query(applicationsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to JavaScript Date
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      };
    });

    console.log(`✅ [Careers API] Fetched ${items.length} applications`);

    return NextResponse.json({
      success: true,
      items
    });

  } catch (error) {
    console.error('❌ [Careers API] Error fetching applications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch applications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/careers/applications
 * حفظ طلب توظيف جديد
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [Careers API] Creating new career application...');

    const body = await request.json().catch(() => ({}));

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate roles
    if (!body.roles || !Array.isArray(body.roles) || body.roles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one role must be selected'
        },
        { status: 400 }
      );
    }

    // Prepare application data
    const applicationData = {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      country: body.country || '',
      governorate: body.governorate || '',
      experience: body.experience || '',
      linkedin: body.linkedin || '',
      facebook: body.facebook || '',
      notes: body.notes || '',
      roles: body.roles, // Array of selected role keys
      role: body.role || body.roles[0], // For backward compatibility
      createdAt: Timestamp.now(),
      status: 'pending'
    };

    // Save to Firestore
    const applicationsRef = collection(db, 'careerApplications');
    const docRef = await addDoc(applicationsRef, applicationData);

    console.log(`✅ [Careers API] Application created with ID: ${docRef.id}`);

    // TODO: Send notification to admin (optional)
    // You can add notification logic here if needed

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('❌ [Careers API] Error creating application:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

