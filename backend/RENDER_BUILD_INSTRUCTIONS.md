# Render Build Configuration

## Problem
Render builds are failing with database connection timeouts during Prisma migrations:
```
Error: P1002 - The database server was reached but timed out.
```

## Solution
Update your Render build command to use the safe migration script.

## Current Build Command (WRONG - Causes Failures)
```
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

## Correct Build Command (Use This)
```
npm install && npm run build:render
```

**OR** use the shell script:
```
cd backend && bash scripts/build-render.sh
```

## What Changed
1. **Created `migrate-safe.js`**: A Node.js script that handles migration timeouts gracefully
2. **Updated `build:render` script**: Uses the safe migration handler
3. **Build continues on timeout**: If migrations timeout, the build still succeeds and migrations retry at runtime

## How to Update in Render Dashboard

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Settings** → **Build & Deploy**
4. Find **Build Command**
5. Replace the current command with:
   ```
   cd backend && npm install && npm run build:render
   ```
6. Save and redeploy

## Why This Works

- The safe migration script catches timeout errors (P1002)
- Build continues even if migrations timeout
- Server's `initializePrisma()` function retries migrations at runtime
- No more failed builds due to transient database connection issues

## Alternative: Use Shell Script

If you prefer, you can also use:
```
cd backend && bash scripts/build-render.sh
```

Both approaches will handle migration timeouts gracefully.

