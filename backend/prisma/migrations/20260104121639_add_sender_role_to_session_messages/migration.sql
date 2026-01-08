-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'READY', 'PROCESSING', 'RELEASED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('LOCKED', 'UPCOMING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'CONDITIONAL', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password" VARCHAR(255),
ADD COLUMN     "profile_completed" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" SERIAL NOT NULL,
    "student_assessment_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "answer_index" INTEGER,
    "is_correct" BOOLEAN,
    "points_earned" INTEGER DEFAULT 0,
    "answered_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" SERIAL NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" VARCHAR(50) NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "points" INTEGER DEFAULT 1,
    "question_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "student_assessment_id" INTEGER,
    "generated_by_ai" BOOLEAN DEFAULT true,
    "ai_metadata" JSONB,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "generated_by_ai" BOOLEAN DEFAULT true,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_recommendations" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "career_title" VARCHAR(255) NOT NULL,
    "career_id" VARCHAR(100) NOT NULL,
    "match_percentage" INTEGER NOT NULL,
    "description" TEXT,
    "salary_min" DECIMAL(10,2),
    "salary_max" DECIMAL(10,2),
    "salary_currency" VARCHAR(10) DEFAULT '₹',
    "salary_unit" VARCHAR(20) DEFAULT 'LPA',
    "growth_indicator" VARCHAR(255),
    "growth_type" VARCHAR(50),
    "skills" TEXT[],
    "based_on_assessment_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "generated_from_profile" JSONB,
    "generated_from_assessment" JSONB,
    "ai_provider" VARCHAR(50) DEFAULT 'gemini',
    "prompt_version" VARCHAR(50),

    CONSTRAINT "career_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_letters" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "job_title" VARCHAR(255),
    "company_name" VARCHAR(255),
    "cover_letter_text" TEXT NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_insights" (
    "id" SERIAL NOT NULL,
    "industry" VARCHAR(255) NOT NULL,
    "industry_id" VARCHAR(100) NOT NULL,
    "role_title" VARCHAR(255),
    "experience_level" VARCHAR(50),
    "location" VARCHAR(255) DEFAULT 'India',
    "salary_min" DECIMAL(10,2),
    "salary_max" DECIMAL(10,2),
    "salary_currency" VARCHAR(10) DEFAULT '₹',
    "salary_unit" VARCHAR(20) DEFAULT 'LPA',
    "growth_trend" JSONB,
    "roles_in_demand" JSONB,
    "skills_in_demand" TEXT[],
    "summary_points" TEXT[],
    "last_updated" DATE NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_industry_insights" (
    "id" SERIAL NOT NULL,
    "branch" VARCHAR(100) NOT NULL,
    "week_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "summary" TEXT,
    "last_updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "branch_industry_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" SERIAL NOT NULL,
    "career_id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "total_skills" INTEGER DEFAULT 0,
    "estimated_duration_weeks" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_skills" (
    "id" SERIAL NOT NULL,
    "learning_path_id" INTEGER NOT NULL,
    "skill_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "long_description" TEXT,
    "skill_order" INTEGER NOT NULL,
    "youtube_videos" JSONB,
    "external_resources" JSONB,
    "skill_test_questions" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "generated_by_ai" BOOLEAN DEFAULT false,
    "ai_metadata" JSONB,

    CONSTRAINT "learning_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100),
    "profession" VARCHAR(100),
    "company" VARCHAR(150),
    "experience_years" INTEGER,
    "expertise_areas" TEXT[],
    "linkedin_url" VARCHAR(255),
    "bio" TEXT,
    "profile_completed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "available_slots" JSONB,
    "branch" VARCHAR(100),
    "college" VARCHAR(255),
    "current_role" VARCHAR(50),
    "current_year" VARCHAR(50),
    "degree" VARCHAR(255),
    "graduation_year" INTEGER,
    "highest_qualification" VARCHAR(100),
    "pricing_per_hour" DECIMAL(10,2),
    "profile_photo_url" VARCHAR(500),
    "rating" DECIMAL(3,2) DEFAULT 0,
    "session_types" TEXT[],
    "total_reviews" INTEGER DEFAULT 0,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "resume_data" JSONB NOT NULL,
    "generated_resume_text" TEXT,
    "is_primary" BOOLEAN DEFAULT false,
    "version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_careers" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "career_id" VARCHAR(100) NOT NULL,
    "career_title" VARCHAR(255) NOT NULL,
    "selected_from_recommendation_id" INTEGER,
    "selected_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selected_careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_completions" (
    "id" SERIAL NOT NULL,
    "student_learning_progress_id" INTEGER NOT NULL,
    "skill_id" VARCHAR(100) NOT NULL,
    "skill_test_score" DECIMAL(5,2),
    "completed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "time_spent_minutes" INTEGER,

    CONSTRAINT "skill_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assessments" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "score" DECIMAL(5,2),
    "total_points" INTEGER,
    "earned_points" INTEGER,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "time_taken_minutes" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "ai_provider" VARCHAR(50) DEFAULT 'groq',
    "prompt_version" VARCHAR(50),
    "assessment_type" VARCHAR(50),

    CONSTRAINT "student_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_learning_progress" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "learning_path_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "skills_completed" INTEGER DEFAULT 0,
    "total_skills" INTEGER NOT NULL,
    "progress_percentage" INTEGER DEFAULT 0,
    "current_skill_id" VARCHAR(100),
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "last_accessed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(100),
    "grade_or_year" VARCHAR(50),
    "school_or_college" VARCHAR(150),
    "interests" TEXT[],
    "career_goals" TEXT,
    "bio" TEXT,
    "profile_completed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "primary_domain" VARCHAR(100),
    "existing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "other_skills" TEXT,
    "experience_level" VARCHAR(50),
    "profile_verified" BOOLEAN DEFAULT false,
    "education_type" VARCHAR(50),
    "branch" VARCHAR(100),

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "activity_date" DATE NOT NULL,
    "activity_type" VARCHAR(50) DEFAULT 'general',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "career_id" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_courses" (
    "id" SERIAL NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "course_id" INTEGER NOT NULL,
    "session_type" VARCHAR(100),
    "scheduled_at" TIMESTAMP(6),
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "student_message" TEXT,
    "zoom_link" VARCHAR(500),
    "zoom_link_expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),
    "skill_name" VARCHAR(255),
    "selected_plan_id" INTEGER,
    "plan_id" INTEGER,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "gateway" VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    "gateway_payment_id" VARCHAR(255),
    "gateway_order_id" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_to" VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    "payment_method" VARCHAR(50) DEFAULT 'UPI',
    "payment_data" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_ledger" (
    "id" SERIAL NOT NULL,
    "payment_id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "mentor_payout_amount" DECIMAL(10,2),
    "platform_fee" DECIMAL(10,2),
    "payout_status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payout_released_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_messages" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "sender_id" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "sender_role" VARCHAR(50),

    CONSTRAINT "session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "skill_name" VARCHAR(255) NOT NULL,
    "plan_key" VARCHAR(50) NOT NULL,
    "plan_title" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "sessions_per_week" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_topics" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "session_number" INTEGER NOT NULL,
    "topic_title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_schedule" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "week_number" INTEGER NOT NULL,
    "session_number" INTEGER NOT NULL,
    "topic_title" VARCHAR(255) NOT NULL,
    "scheduled_date" TIMESTAMP(6) NOT NULL,
    "scheduled_time" VARCHAR(50) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'LOCKED',
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "session_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_experiences" (
    "id" SERIAL NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(100),
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN DEFAULT false,
    "description" TEXT,
    "achievements" TEXT[],
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_tests" (
    "id" SERIAL NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "course_name" VARCHAR(255) NOT NULL,
    "course_category" VARCHAR(100),
    "score" DECIMAL(5,2) NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'PENDING',
    "test_duration" INTEGER,
    "total_questions" INTEGER,
    "correct_answers" INTEGER,
    "analysis" JSONB,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "feedback" TEXT,
    "attempted_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),
    "retry_available_after" TIMESTAMP(6),

    CONSTRAINT "mentor_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_course_verifications" (
    "id" SERIAL NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "course_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "verified_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "verification_score" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "mentor_course_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "related_id" VARCHAR(255),
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature" VARCHAR(255) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_sessions" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "session_order" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "week_number" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_plans" (
    "id" SERIAL NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "plan_name" VARCHAR(100) NOT NULL,
    "price" INTEGER NOT NULL,
    "duration" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_sessions" (
    "id" SERIAL NOT NULL,
    "session_uuid" VARCHAR(255) NOT NULL,
    "payment_session_id" VARCHAR(255) NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "skill_name" VARCHAR(255) NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "plan_session_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "scheduled_date" TIMESTAMP(6) NOT NULL,
    "scheduled_time" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'LOCKED',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assessment_answers_question" ON "assessment_answers"("question_id");

-- CreateIndex
CREATE INDEX "idx_assessment_answers_student_assessment" ON "assessment_answers"("student_assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_answer_per_question" ON "assessment_answers"("student_assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_assessment_questions_assessment" ON "assessment_questions"("assessment_id");

-- CreateIndex
CREATE INDEX "idx_assessment_questions_order" ON "assessment_questions"("assessment_id", "question_order");

-- CreateIndex
CREATE INDEX "idx_assessment_questions_student_assessment" ON "assessment_questions"("student_assessment_id");

-- CreateIndex
CREATE INDEX "idx_assessments_active" ON "assessments"("is_active");

-- CreateIndex
CREATE INDEX "idx_assessments_type" ON "assessments"("type");

-- CreateIndex
CREATE INDEX "idx_career_recommendations_match" ON "career_recommendations"("student_id", "match_percentage" DESC);

-- CreateIndex
CREATE INDEX "idx_career_recommendations_student" ON "career_recommendations"("student_id");

-- CreateIndex
CREATE INDEX "idx_cover_letters_student" ON "cover_letters"("student_id");

-- CreateIndex
CREATE INDEX "idx_industry_insights_industry" ON "industry_insights"("industry_id");

-- CreateIndex
CREATE INDEX "idx_industry_insights_updated" ON "industry_insights"("last_updated" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_industry_insight" ON "industry_insights"("industry_id", "role_title", "experience_level", "location");

-- CreateIndex
CREATE INDEX "idx_branch_insights_week" ON "branch_industry_insights"("branch", "year", "week_number" DESC);

-- CreateIndex
CREATE INDEX "idx_branch_insights_updated" ON "branch_industry_insights"("last_updated" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_branch_weekly_insight" ON "branch_industry_insights"("branch", "week_number", "year");

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_career_id_key" ON "learning_paths"("career_id");

-- CreateIndex
CREATE INDEX "idx_learning_paths_active" ON "learning_paths"("is_active");

-- CreateIndex
CREATE INDEX "idx_learning_paths_career_id" ON "learning_paths"("career_id");

-- CreateIndex
CREATE INDEX "idx_learning_skills_order" ON "learning_skills"("learning_path_id", "skill_order");

-- CreateIndex
CREATE INDEX "idx_learning_skills_path" ON "learning_skills"("learning_path_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_skill_per_path" ON "learning_skills"("learning_path_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_mentor_profiles_user_id" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_resumes_student" ON "resumes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "selected_careers_student_id_key" ON "selected_careers"("student_id");

-- CreateIndex
CREATE INDEX "idx_selected_careers_student" ON "selected_careers"("student_id");

-- CreateIndex
CREATE INDEX "idx_skill_completions_progress" ON "skill_completions"("student_learning_progress_id");

-- CreateIndex
CREATE INDEX "idx_skill_completions_skill" ON "skill_completions"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_completion_per_skill" ON "skill_completions"("student_learning_progress_id", "skill_id");

-- CreateIndex
CREATE INDEX "idx_student_assessments_assessment" ON "student_assessments"("assessment_id");

-- CreateIndex
CREATE INDEX "idx_student_assessments_status" ON "student_assessments"("student_id", "status");

-- CreateIndex
CREATE INDEX "idx_student_assessments_student" ON "student_assessments"("student_id");

-- CreateIndex
CREATE INDEX "idx_student_assessments_type" ON "student_assessments"("assessment_type");

-- CreateIndex
CREATE INDEX "idx_student_learning_progress_status" ON "student_learning_progress"("student_id", "status");

-- CreateIndex
CREATE INDEX "idx_student_learning_progress_student" ON "student_learning_progress"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_progress_per_student_path" ON "student_learning_progress"("student_id", "learning_path_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_student_profiles_user_id" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_activity_date" ON "user_activity"("user_id", "activity_date" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activity_user" ON "user_activity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_activity_per_day" ON "user_activity"("user_id", "activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "courses_career_id_key" ON "courses"("career_id");

-- CreateIndex
CREATE INDEX "idx_courses_career_id" ON "courses"("career_id");

-- CreateIndex
CREATE INDEX "idx_courses_active" ON "courses"("is_active");

-- CreateIndex
CREATE INDEX "idx_mentor_courses_mentor" ON "mentor_courses"("mentor_id");

-- CreateIndex
CREATE INDEX "idx_mentor_courses_course" ON "mentor_courses"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_mentor_course" ON "mentor_courses"("mentor_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_sessions_student_status" ON "sessions"("student_id", "status");

-- CreateIndex
CREATE INDEX "idx_sessions_mentor_status" ON "sessions"("mentor_id", "status");

-- CreateIndex
CREATE INDEX "idx_sessions_course" ON "sessions"("course_id");

-- CreateIndex
CREATE INDEX "idx_sessions_plan" ON "sessions"("plan_id");

-- CreateIndex
CREATE INDEX "idx_sessions_status" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "idx_sessions_selected_plan" ON "sessions"("selected_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_session_id_key" ON "payments"("session_id");

-- CreateIndex
CREATE INDEX "idx_payments_session" ON "payments"("session_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_gateway_id" ON "payments"("gateway_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_ledger_payment_id_key" ON "admin_ledger"("payment_id");

-- CreateIndex
CREATE INDEX "idx_admin_ledger_payment" ON "admin_ledger"("payment_id");

-- CreateIndex
CREATE INDEX "idx_admin_ledger_mentor_payout" ON "admin_ledger"("mentor_id", "payout_status");

-- CreateIndex
CREATE INDEX "idx_admin_ledger_payout_status" ON "admin_ledger"("payout_status");

-- CreateIndex
CREATE INDEX "idx_session_messages_session_time" ON "session_messages"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_session_messages_sender" ON "session_messages"("sender_id");

-- CreateIndex
CREATE INDEX "idx_plans_skill" ON "plans"("skill_name");

-- CreateIndex
CREATE INDEX "idx_plans_active" ON "plans"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "unique_skill_plan" ON "plans"("skill_name", "plan_key");

-- CreateIndex
CREATE INDEX "idx_plan_topics_plan" ON "plan_topics"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_topics_ordering" ON "plan_topics"("plan_id", "week_number", "session_number");

-- CreateIndex
CREATE INDEX "idx_session_schedule_session" ON "session_schedule"("session_id");

-- CreateIndex
CREATE INDEX "idx_session_schedule_ordering" ON "session_schedule"("session_id", "week_number", "session_number");

-- CreateIndex
CREATE INDEX "idx_session_schedule_status" ON "session_schedule"("status");

-- CreateIndex
CREATE INDEX "idx_session_schedule_date" ON "session_schedule"("scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_session_schedule_entry" ON "session_schedule"("session_id", "week_number", "session_number");

-- CreateIndex
CREATE INDEX "idx_mentor_experiences_mentor" ON "mentor_experiences"("mentor_id");

-- CreateIndex
CREATE INDEX "idx_mentor_tests_status" ON "mentor_tests"("mentor_id", "status");

-- CreateIndex
CREATE INDEX "idx_mentor_tests_mentor" ON "mentor_tests"("mentor_id");

-- CreateIndex
CREATE INDEX "idx_mentor_tests_course" ON "mentor_tests"("course_name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_mentor_course_test" ON "mentor_tests"("mentor_id", "course_name");

-- CreateIndex
CREATE INDEX "idx_mentor_verifications_active" ON "mentor_course_verifications"("mentor_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_mentor_verifications_course" ON "mentor_course_verifications"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_mentor_course_verification" ON "mentor_course_verifications"("mentor_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_user_time" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_plan_features_plan" ON "plan_features"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_sessions_plan" ON "plan_sessions"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_sessions_plan_order" ON "plan_sessions"("plan_id", "session_order");

-- CreateIndex
CREATE INDEX "idx_skill_plans_skill" ON "skill_plans"("skill_id");

-- CreateIndex
CREATE INDEX "idx_skill_plans_skill_name" ON "skill_plans"("skill_id", "plan_name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "idx_skills_name" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "student_sessions_session_uuid_key" ON "student_sessions"("session_uuid");

-- CreateIndex
CREATE INDEX "idx_student_sessions_date" ON "student_sessions"("scheduled_date");

-- CreateIndex
CREATE INDEX "idx_student_sessions_mentor" ON "student_sessions"("mentor_id");

-- CreateIndex
CREATE INDEX "idx_student_sessions_payment_session" ON "student_sessions"("payment_session_id");

-- CreateIndex
CREATE INDEX "idx_student_sessions_status" ON "student_sessions"("status");

-- CreateIndex
CREATE INDEX "idx_student_sessions_student" ON "student_sessions"("student_id");

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "fk_assessment_answers_assessment" FOREIGN KEY ("student_assessment_id") REFERENCES "student_assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "fk_assessment_answers_question" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "fk_assessment_questions_assessment" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "fk_assessment_questions_student_assessment" FOREIGN KEY ("student_assessment_id") REFERENCES "student_assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_recommendations" ADD CONSTRAINT "fk_career_recommendations_assessment" FOREIGN KEY ("based_on_assessment_id") REFERENCES "student_assessments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "career_recommendations" ADD CONSTRAINT "fk_career_recommendations_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "fk_cover_letters_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_skills" ADD CONSTRAINT "fk_learning_skills_path" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "fk_resumes_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "selected_careers" ADD CONSTRAINT "fk_selected_careers_recommendation" FOREIGN KEY ("selected_from_recommendation_id") REFERENCES "career_recommendations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "selected_careers" ADD CONSTRAINT "fk_selected_careers_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "skill_completions" ADD CONSTRAINT "fk_skill_completions_progress" FOREIGN KEY ("student_learning_progress_id") REFERENCES "student_learning_progress"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "fk_student_assessments_assessment" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "fk_student_assessments_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_learning_progress" ADD CONSTRAINT "fk_student_learning_progress_path" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_learning_progress" ADD CONSTRAINT "fk_student_learning_progress_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "fk_user_activity_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_courses" ADD CONSTRAINT "mentor_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_courses" ADD CONSTRAINT "mentor_courses_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_selected_plan_id_fkey" FOREIGN KEY ("selected_plan_id") REFERENCES "skill_plans"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_ledger" ADD CONSTRAINT "admin_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_ledger" ADD CONSTRAINT "admin_ledger_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_topics" ADD CONSTRAINT "plan_topics_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_schedule" ADD CONSTRAINT "session_schedule_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_experiences" ADD CONSTRAINT "mentor_experiences_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_tests" ADD CONSTRAINT "mentor_tests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_course_verifications" ADD CONSTRAINT "mentor_course_verifications_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_course_verifications" ADD CONSTRAINT "mentor_course_verifications_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mentor_course_verifications" ADD CONSTRAINT "mentor_course_verifications_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mentor_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "skill_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plan_sessions" ADD CONSTRAINT "plan_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "skill_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "skill_plans" ADD CONSTRAINT "skill_plans_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_payment_session_id_fkey" FOREIGN KEY ("payment_session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_plan_session_id_fkey" FOREIGN KEY ("plan_session_id") REFERENCES "plan_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
