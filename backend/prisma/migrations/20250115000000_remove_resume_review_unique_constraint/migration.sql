-- Remove unique constraint on resume_id from resume_review_requests
-- This allows multiple reviews per resume (history), but only ONE PENDING review at a time (enforced in application logic)

-- Drop the unique constraint
ALTER TABLE "resume_review_requests" DROP CONSTRAINT IF EXISTS "unique_resume_review";
















