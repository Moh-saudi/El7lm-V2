import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 [Admin API] Starting email migration...');

    const body = await request.json();
    const { batchSize = 10, dryRun = false } = body;

    // Get all users with long email addresses
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '>=', 'user_'));
    const snapshot = await getDocs(q);

    const longEmails = snapshot.docs.filter(doc => {
      const email = doc.data().email;
      return email && email.length > 50; // Long email addresses
    });

    console.log(`📊 [Admin API] Found ${longEmails.length} users with long emails`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          totalFound: longEmails.length,
          sampleEmails: longEmails.slice(0, 5).map(doc => ({
            id: doc.id,
            email: doc.data().email,
            length: doc.data().email.length
          })),
          dryRun: true
        },
        message: 'Dry run completed - no changes made'
      });
    }

    // Process migration in batches
    const results = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < longEmails.length; i += batchSize) {
      const batch = longEmails.slice(i, i + batchSize);
      
      for (const userDoc of batch) {
        try {
          const userData = userDoc.data();
          const oldEmail = userData.email;
          
          // Generate new shorter email
          const newEmail = `user_${userDoc.id}@el7lm.com`;
          
          // Update user document
          await updateDoc(doc(db, 'users', userDoc.id), {
            email: newEmail,
            oldEmail: oldEmail,
            emailMigratedAt: new Date(),
            emailMigrationStatus: 'completed'
          });

          results.successful++;
          console.log(`✅ [Admin API] Migrated email for user ${userDoc.id}: ${oldEmail} -> ${newEmail}`);
          
        } catch (error) {
          results.failed++;
          const errorMsg = `Failed to migrate user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(`❌ [Admin API] ${errorMsg}`);
        }
        
        results.totalProcessed++;
      }

      // Add delay between batches to avoid overwhelming the database
      if (i + batchSize < longEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const response = {
      success: true,
      data: {
        ...results,
        totalFound: longEmails.length,
        migrationCompleted: true,
        completedAt: new Date().toISOString()
      },
      message: `Email migration completed. ${results.successful} successful, ${results.failed} failed.`
    };

    console.log('✅ [Admin API] Email migration completed:', results);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Admin API] Error during email migration:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to migrate emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
