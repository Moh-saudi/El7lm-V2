'use server';

import { storageManager } from '@/lib/storage';

const STORAGE_BUCKETS = {
    VIDEOS: 'videos',
    // Add others if mapped in config, but we use string literals mostly
};

export async function deleteUserMedia(userId: string) {
    if (!userId) return { success: false, error: 'User ID is required' };

    console.log(`🗑️ [Server Action] Deleting media for user ${userId}`);

    const buckets = [
        'videos',
        'profile-images',
        'additional-images',
        'player-avatar',
        'player-additional-images',
        'playertrainer',
        'playerclub',
        'playeragent',
        'playeracademy',
        'avatars',
        'wallet',
        'documents'
    ];

    let deletedCount = 0;
    let errors = [];

    for (const bucket of buckets) {
        try {
            // List files with user prefix
            // In our single-bucket design, this lists files in el7lmplatform/{bucket}/{userId}/
            const files = await storageManager.list(bucket, userId);

            if (files && files.length > 0) {
                console.log(`Found ${files.length} files in ${bucket}/${userId}, deleting...`);

                // Prepare paths: prefix + filename
                // The list() method returns relative names (filename only if we passed prefix)
                // We need to pass the path relative to the "virtual bucket" to delete()
                // e.g. "user123/image.jpg"

                const paths = files.map(f => `${userId}/${f.name}`);

                await storageManager.delete(bucket, paths);
                deletedCount += files.length;
            }
        } catch (error: any) {
            console.error(`Failed to cleanup bucket ${bucket}:`, error);
            errors.push(error.message);
        }
    }

    console.log(`✅ Cleanup complete. Deleted ${deletedCount} files.`);

    return {
        success: errors.length === 0,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
    };
}

export async function listBucketFiles(bucket: string, path: string = '') {
    try {
        const files = await storageManager.list(bucket, path);
        return { success: true, files };
    } catch (error: any) {
        console.error(`List bucket ${bucket} failed:`, error);
        return { success: false, error: error.message, files: [] };
    }
}
