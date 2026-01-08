-- Backfill skill_name for existing sessions with NULL values
-- This migration should be run BEFORE making skill_name NOT NULL

-- Strategy:
-- 1. If skill_id exists, try to get skill name from related tables
-- 2. If plan_id exists, use plan.skill_name
-- 3. If course_id exists, use courses.title
-- 4. Otherwise, set to "Unknown (Legacy)"

-- Step 1: Update from plans table (if plan_id exists)
UPDATE sessions s
SET skill_name = p.skill_name
FROM plans p
WHERE s.skill_name IS NULL
  AND s.plan_id IS NOT NULL
  AND s.plan_id = p.id
  AND p.skill_name IS NOT NULL;

-- Step 2: Update from courses table (if course_id exists and skill_name still NULL)
UPDATE sessions s
SET skill_name = c.title
FROM courses c
WHERE s.skill_name IS NULL
  AND s.course_id = c.id
  AND c.title IS NOT NULL;

-- Step 3: Set to "Unknown (Legacy)" for any remaining NULL values
UPDATE sessions
SET skill_name = 'Unknown (Legacy)'
WHERE skill_name IS NULL;













