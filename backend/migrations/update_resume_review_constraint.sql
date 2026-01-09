-- Migration: Update resume_review_requests unique constraint
-- Change from: UNIQUE(resume_id, mentor_id) 
-- To: UNIQUE(resume_id) - ONE resume can be shared with ONLY ONE mentor

-- Step 1: Drop the old constraint
ALTER TABLE resume_review_requests
DROP CONSTRAINT IF EXISTS unique_resume_mentor_review;

-- Step 2: Remove any duplicate resume_id entries (keep only the first one)
-- This handles existing data that might have multiple mentors per resume
DELETE FROM resume_review_requests r1
WHERE r1.id NOT IN (
  SELECT MIN(r2.id)
  FROM resume_review_requests r2
  GROUP BY r2.resume_id
);

-- Step 3: Add the new constraint (ONE resume → ONE mentor)
ALTER TABLE resume_review_requests
ADD CONSTRAINT unique_resume_review UNIQUE (resume_id);















