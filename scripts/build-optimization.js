#!/usr/bin/env node

/**
 * Build Optimization Script
 * Prevents Firebase and other heavy operations during build time
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying build optimizations...');

// Create a build-time environment file
const buildEnvContent = `
# Build-time environment variables
NEXT_PHASE=phase-production-build
NODE_ENV=production
DISABLE_FIREBASE_DURING_BUILD=true
DISABLE_ANALYTICS_DURING_BUILD=true
DISABLE_HEAVY_OPERATIONS_DURING_BUILD=true
`;

// Write build environment file
const envPath = path.join(process.cwd(), '.env.build');
fs.writeFileSync(envPath, buildEnvContent);

console.log('✅ Build optimizations applied');
console.log('📝 Created .env.build with build-time optimizations');

// Create a post-build cleanup script
const cleanupScript = `#!/bin/bash
echo "🧹 Cleaning up build artifacts..."
rm -f .env.build
echo "✅ Build cleanup completed"
`;

const cleanupPath = path.join(process.cwd(), 'scripts', 'post-build-cleanup.sh');
fs.writeFileSync(cleanupPath, cleanupScript);
fs.chmodSync(cleanupPath, '755');

console.log('📝 Created post-build cleanup script');
console.log('🚀 Build optimizations ready!');
