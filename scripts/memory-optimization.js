#!/usr/bin/env node

/**
 * Memory Optimization Script for Vercel Build
 * This script applies various optimizations to reduce memory usage during build
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying memory optimizations for build...');

// Set memory optimization environment variables
const memoryOptimizations = {
  // Node.js memory settings
  NODE_OPTIONS: '--max-old-space-size=2048 --optimize-for-size',

  // Next.js build optimizations
  NEXT_PHASE: 'phase-production-build',
  DISABLE_FIREBASE_DURING_BUILD: 'true',
  DISABLE_ANALYTICS_DURING_BUILD: 'true',
  DISABLE_HEAVY_OPERATIONS_DURING_BUILD: 'true',

  // Vercel specific
  VERCEL: '1',
  VERCEL_ENV: 'production',

  // Disable source maps to save memory
  GENERATE_SOURCEMAP: 'false',

  // Optimize bundle size
  ANALYZE_BUNDLE: 'false',

  // Disable development features
  NODE_ENV: 'production'
};

// Write memory optimization environment file
const envContent = Object.entries(memoryOptimizations)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

const envPath = path.join(process.cwd(), '.env.memory-optimization');
fs.writeFileSync(envPath, envContent);

console.log('✅ Memory optimization environment variables set');
console.log('📝 Created .env.memory-optimization');

// Create a build wrapper script
const buildWrapperScript = `#!/bin/bash
echo "🚀 Starting optimized build process..."

# Load memory optimizations
export $(cat .env.memory-optimization | xargs)

# Set additional memory limits
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

echo "📊 Memory settings:"
echo "  NODE_OPTIONS: $NODE_OPTIONS"
echo "  DISABLE_FIREBASE_DURING_BUILD: $DISABLE_FIREBASE_DURING_BUILD"
echo "  NEXT_PHASE: $NEXT_PHASE"

# Run the build
echo "🔨 Running Next.js build..."
next build

# Cleanup
echo "🧹 Cleaning up..."
rm -f .env.memory-optimization

echo "✅ Build completed successfully!"
`;

const buildWrapperPath = path.join(process.cwd(), 'scripts', 'build-with-optimization.sh');
fs.writeFileSync(buildWrapperPath, buildWrapperScript);
fs.chmodSync(buildWrapperPath, '755');

console.log('📝 Created build wrapper script');

// Update package.json build script
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add memory-optimized build script
packageJson.scripts['build:memory-optimized'] = 'node scripts/memory-optimization.js && ./scripts/build-with-optimization.sh';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('📝 Updated package.json with memory-optimized build script');
console.log('🚀 Memory optimizations ready!');
console.log('');
console.log('Usage:');
console.log('  npm run build:memory-optimized');
console.log('  or');
console.log('  ./scripts/build-with-optimization.sh');
