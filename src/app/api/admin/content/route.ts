import { db } from '@/lib/firebase/config';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Fetching content items...');

    // Skip Firebase calls during build time
    if (process.env.NODE_ENV === 'production' && !process.env.FIREBASE_PROJECT_ID) {
      console.log('🚫 [Admin API] Skipping Firebase calls during build phase');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const contentRef = collection(db, 'content');
    const q = query(contentRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const contentItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
    }));

    const response = {
      success: true,
      data: {
        items: contentItems,
        total: contentItems.length,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('✅ [Admin API] Content items fetched successfully:', contentItems.length);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error fetching content:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Creating content item...');

    const body = await request.json();
    const { title, content, type, status } = body;

    if (!title || !content || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, content, and type are required'
        },
        { status: 400 }
      );
    }

    const contentRef = collection(db, 'content');
    const newContent = {
      title,
      content,
      type,
      status: status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(contentRef, newContent);

    const response = {
      success: true,
      data: {
        id: docRef.id,
        ...newContent
      },
      message: 'Content created successfully'
    };

    console.log('✅ [Admin API] Content item created successfully:', docRef.id);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error creating content:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Updating content item...');

    const body = await request.json();
    const { id, title, content, type, status } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content ID is required'
        },
        { status: 400 }
      );
    }

    const contentRef = doc(db, 'content', id);
    const updatedContent = {
      ...(title && { title }),
      ...(content && { content }),
      ...(type && { type }),
      ...(status && { status }),
      updatedAt: new Date()
    };

    await updateDoc(contentRef, updatedContent);

    const response = {
      success: true,
      data: {
        id,
        ...updatedContent
      },
      message: 'Content updated successfully'
    };

    console.log('✅ [Admin API] Content item updated successfully:', id);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error updating content:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Deleting content item...');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content ID is required'
        },
        { status: 400 }
      );
    }

    const contentRef = doc(db, 'content', id);
    await deleteDoc(contentRef);

    const response = {
      success: true,
      message: 'Content deleted successfully'
    };

    console.log('✅ [Admin API] Content item deleted successfully:', id);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error deleting content:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
