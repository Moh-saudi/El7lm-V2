
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = '14521cdfec73fa908fbf7e760fae362a';
const accessKeyId = '979d63a7dd50597c3e862a8449c228e5';
const secretAccessKey = 'ba3be1a4f5451c3a69d138c5c7db7026f2ed44bb3ff257dd815d97cba9360ac8';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function verifyCredentials() {
    console.log('🔄 Checking Cloudflare R2 Credentials...');
    
    const bucketName = 'el7lmplatform'; 
    const testFileName = 'credential-test.txt';
    
    try {
        // 1. List Buckets (actually ListObjects to verify bucket access)
        console.log(`📂 Listing objects in bucket: ${bucketName}...`);
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            MaxKeys: 1
        });
        await s3Client.send(listCommand);
        console.log('✅ List objects successful!');

        // 2. Upload File
        console.log('cx Uploading test file...');
        const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: testFileName,
            Body: 'Verified!',
            ContentType: 'text/plain'
        });
        await s3Client.send(uploadCommand);
        console.log('✅ Upload successful!');

        // 3. Delete File
        console.log('🗑️ Deleting test file...');
        const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: testFileName
        });
        await s3Client.send(deleteCommand);
        console.log('✅ Delete successful!');

        console.log('\n🎉 CREDENTIALS ARE VALID!');

    } catch (error) {
        console.error('\n❌ Credential Verification Failed:', error);
    }
}

verifyCredentials();
