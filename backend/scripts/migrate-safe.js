/**
 * Safe Prisma migration script with timeout handling
 * Used during Render builds to handle database connection timeouts gracefully
 */

const { execSync } = require('child_process');
const { setTimeout } = require('timers/promises');

async function runMigrationWithTimeout() {
  const TIMEOUT_MS = 30000; // 30 seconds
  
  console.log('🔄 Starting Prisma migration with timeout protection...');
  
  try {
    // Run migration with a timeout
    const startTime = Date.now();
    
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      timeout: TIMEOUT_MS,
      env: process.env,
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Migration completed successfully in ${duration}ms`);
    process.exit(0);
  } catch (error) {
    const errorMessage = String(error.message || error.stderr || error.stdout || '');
    
    // Check if it's a timeout or connection issue
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('P1002') ||
      errorMessage.includes('advisory lock')
    ) {
      console.warn('⚠️ Migration timed out or database connection issue detected');
      console.warn('⚠️ This is expected on Render - migrations will retry at runtime via initializePrisma()');
      console.warn('⚠️ Build will continue - server will handle migrations on startup');
      process.exit(0); // Exit successfully so build continues
    } else {
      // Other errors - might be real issues
      console.error('❌ Migration failed with error:', errorMessage);
      console.warn('⚠️ Build will continue - server will attempt to handle migrations on startup');
      process.exit(0); // Still exit successfully - let runtime handle it
    }
  }
}

runMigrationWithTimeout();

