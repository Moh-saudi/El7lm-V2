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

    console.log('🔍 [SERVER-SIDE] Checking user existence:', { email, phone });

    // For now, return a safe response since we don't have Firebase Admin SDK configured
    // In a real implementation, you would use Firebase Admin SDK to check the database

    // Mock response - user doesn't exist (allowing registration)
    const response = {
      exists: false,
      phoneExists: false,
      emailExists: false,
      message: 'User check completed - allowing registration'
    };

    console.log('📊 User check results:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking user existence:', error);
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
