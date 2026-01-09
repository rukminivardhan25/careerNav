# Prisma & Migrations Structure

## 📁 Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Main Prisma schema file (948 lines)
│   ├── migrations/            # Migration history
│   │   ├── migration_lock.toml
│   │   ├── 20250115000000_remove_resume_review_unique_constraint/
│   │   │   └── migration.sql
│   │   ├── 20250115000001_add_cover_letter_reviews/
│   │   │   └── migration.sql
│   │   ├── 20251231083156_init/
│   │   │   └── migration.sql
│   │   └── 20260104121639_add_sender_role_to_session_messages/
│   │       └── migration.sql
│   └── seed-skill-tests.ts    # Seed script for skill tests
└── package.json               # Contains Prisma scripts
```

## 🔧 Prisma Configuration

### `schema.prisma`
- **Generator**: `prisma-client-js` (v5.22.0)
- **Datasource**: PostgreSQL
- **URL**: From `DATABASE_URL` environment variable

### Key Models (Total: ~40+ models)

#### Core User Models
- `User` - Main user table (mapped to `users` in DB)
- `student_profiles` - Student-specific data
- `mentor_profiles` - Mentor-specific data

#### Assessment & Learning
- `assessments` - Assessment templates
- `assessment_questions` - Questions (deprecated, now generated on-the-fly)
- `assessment_answers` - Answers (deprecated)
- `student_assessments` - Student assessment results
- `career_recommendations` - AI-generated career suggestions
- `selected_careers` - Student's chosen career path
- `learning_paths` - Career-based learning paths
- `learning_skills` - Skills within learning paths
- `student_learning_progress` - Student progress tracking
- `skill_completions` - Individual skill completion records

#### Sessions & Mentorship
- `sessions` - Main session/booking table
- `session_schedule` - Scheduled session items
- `session_messages` - Chat messages within sessions
- `session_resources` - PDF resources uploaded by mentors
- `courses` - Course catalog
- `mentor_courses` - Mentor-course associations
- `course_enrollments` - Student-mentor course enrollments
- `plans` - Mentorship plans
- `plan_topics` - Topics within plans

#### Payments & Admin
- `payments` - Payment records
- `admin_ledger` - Admin wallet and mentor payout tracking

#### Reviews & Feedback
- `resumes` - Student resumes
- `resume_review_requests` - Resume review requests
- `cover_letters` - Student cover letters
- `cover_letter_review_requests` - Cover letter review requests
- `career_nav_ratings` - Platform ratings

#### Mentorship Features
- `assignments` - Mentor-created assignments
- `assignment_submissions` - Student submissions
- `mentor_tests` - Mentor skill verification tests
- `mentor_course_verifications` - Verified mentor-course pairs
- `mentor_experiences` - Mentor work experience

#### Industry Insights
- `industry_insights` - Industry-specific insights
- `branch_industry_insights` - Branch-specific weekly insights
- `student_industry_insights` - Personalized student insights

#### Other
- `notifications` - User notifications
- `user_activity` - Daily user activity tracking

### Enums
- `Role` - STUDENT, MENTOR
- `SessionStatus` - PENDING, APPROVED, PAID, SCHEDULED, COMPLETED, REJECTED, CANCELLED
- `PaymentStatus` - PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED
- `PayoutStatus` - PENDING, READY, PROCESSING, RELEASED
- `ScheduleStatus` - LOCKED, UPCOMING, COMPLETED
- `TestStatus` - PENDING, IN_PROGRESS, PASSED, CONDITIONAL, FAILED
- `ReviewStatus` - PENDING, VERIFIED
- `SubmissionStatus` - SUBMITTED, LATE
- `CourseStatus` - PAYMENT_PENDING, ONGOING, COMPLETED

## 📦 Migration History

### Migration Order (Chronological)

1. **20251231083156_init** (Init Migration)
   - Creates base `users` table with Role enum
   - Creates all core tables (assessments, sessions, payments, etc.)
   - Creates all indexes and foreign keys
   - **Status**: ✅ Applied (will run on next deploy)

2. **20250115000000_remove_resume_review_unique_constraint**
   - Removes unique constraint on `resume_review_requests.resume_id`
   - Allows multiple reviews per resume (history)
   - **Status**: ✅ Resolved in production

3. **20250115000001_add_cover_letter_reviews**
   - Creates `ReviewStatus` enum
   - Creates `cover_letters` table (if not exists)
   - Creates `cover_letter_review_requests` table
   - Adds foreign keys with conditional logic
   - **Status**: ✅ Resolved in production

4. **20260104121639_add_sender_role_to_session_messages**
   - Adds `sender_role` VARCHAR(50) column to `session_messages`
   - **Status**: ⏳ Pending (will run on next deploy)

## 🛠️ Package.json Scripts

```json
{
  "prisma:generate": "prisma generate",      // Generate Prisma Client
  "prisma:migrate": "prisma migrate dev",     // Create new migration
  "prisma:studio": "prisma studio"           // Open Prisma Studio GUI
}
```

## 📝 Migration Lock File

**`migration_lock.toml`**
```toml
provider = "postgresql"
```
- Locks Prisma to PostgreSQL provider
- Prevents accidental database provider changes

## 🔄 Migration Status (Production)

### Current State
- **Total Migrations**: 4
- **Applied**: 2 (resolved manually)
- **Pending**: 2 (will apply on next deploy)

### Resolved Migrations
1. ✅ `20250115000000_remove_resume_review_unique_constraint`
2. ✅ `20250115000001_add_cover_letter_reviews`

### Pending Migrations
1. ⏳ `20251231083156_init` - Creates all base tables
2. ⏳ `20260104121639_add_sender_role_to_session_messages` - Adds sender_role field

## 🎯 Key Features

### Database Features
- **PostgreSQL** with Neon (serverless)
- **Foreign Keys** with CASCADE deletes
- **Indexes** for performance optimization
- **JSONB** fields for flexible data storage
- **Enums** for type safety

### Migration Features
- **Conditional Logic** in migrations (IF NOT EXISTS, DO blocks)
- **Safe Migration Resolution** via `prisma migrate resolve`
- **Automatic Migration Bootstrap** in production (via `prismaInit.ts`)

## 📊 Database Tables Summary

### Core Tables (Created by init migration)
- `users` - Base user table
- `student_profiles` - Student data
- `mentor_profiles` - Mentor data
- `sessions` - Session bookings
- `payments` - Payment records
- `admin_ledger` - Admin wallet
- `session_messages` - Chat messages
- `session_schedule` - Scheduled items
- `courses` - Course catalog
- `plans` - Mentorship plans
- `notifications` - User notifications
- `career_nav_ratings` - Platform ratings
- And 30+ more tables...

## 🔐 Important Notes

1. **Migration Resolution**: Failed migrations must be resolved against production DB using:
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

2. **Production Bootstrap**: Migrations run automatically via `backend/src/utils/prismaInit.ts`

3. **Build Command**: Render uses:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

4. **Schema Changes**: Always create migrations via:
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```

## 📚 Related Files

- `backend/src/utils/prismaInit.ts` - Migration bootstrap utility
- `backend/src/server.ts` - Calls `initializePrisma()` on startup
- `backend/prisma/seed-skill-tests.ts` - Seed script for skill tests



## 📁 Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Main Prisma schema file (948 lines)
│   ├── migrations/            # Migration history
│   │   ├── migration_lock.toml
│   │   ├── 20250115000000_remove_resume_review_unique_constraint/
│   │   │   └── migration.sql
│   │   ├── 20250115000001_add_cover_letter_reviews/
│   │   │   └── migration.sql
│   │   ├── 20251231083156_init/
│   │   │   └── migration.sql
│   │   └── 20260104121639_add_sender_role_to_session_messages/
│   │       └── migration.sql
│   └── seed-skill-tests.ts    # Seed script for skill tests
└── package.json               # Contains Prisma scripts
```

## 🔧 Prisma Configuration

### `schema.prisma`
- **Generator**: `prisma-client-js` (v5.22.0)
- **Datasource**: PostgreSQL
- **URL**: From `DATABASE_URL` environment variable

### Key Models (Total: ~40+ models)

#### Core User Models
- `User` - Main user table (mapped to `users` in DB)
- `student_profiles` - Student-specific data
- `mentor_profiles` - Mentor-specific data

#### Assessment & Learning
- `assessments` - Assessment templates
- `assessment_questions` - Questions (deprecated, now generated on-the-fly)
- `assessment_answers` - Answers (deprecated)
- `student_assessments` - Student assessment results
- `career_recommendations` - AI-generated career suggestions
- `selected_careers` - Student's chosen career path
- `learning_paths` - Career-based learning paths
- `learning_skills` - Skills within learning paths
- `student_learning_progress` - Student progress tracking
- `skill_completions` - Individual skill completion records

#### Sessions & Mentorship
- `sessions` - Main session/booking table
- `session_schedule` - Scheduled session items
- `session_messages` - Chat messages within sessions
- `session_resources` - PDF resources uploaded by mentors
- `courses` - Course catalog
- `mentor_courses` - Mentor-course associations
- `course_enrollments` - Student-mentor course enrollments
- `plans` - Mentorship plans
- `plan_topics` - Topics within plans

#### Payments & Admin
- `payments` - Payment records
- `admin_ledger` - Admin wallet and mentor payout tracking

#### Reviews & Feedback
- `resumes` - Student resumes
- `resume_review_requests` - Resume review requests
- `cover_letters` - Student cover letters
- `cover_letter_review_requests` - Cover letter review requests
- `career_nav_ratings` - Platform ratings

#### Mentorship Features
- `assignments` - Mentor-created assignments
- `assignment_submissions` - Student submissions
- `mentor_tests` - Mentor skill verification tests
- `mentor_course_verifications` - Verified mentor-course pairs
- `mentor_experiences` - Mentor work experience

#### Industry Insights
- `industry_insights` - Industry-specific insights
- `branch_industry_insights` - Branch-specific weekly insights
- `student_industry_insights` - Personalized student insights

#### Other
- `notifications` - User notifications
- `user_activity` - Daily user activity tracking

### Enums
- `Role` - STUDENT, MENTOR
- `SessionStatus` - PENDING, APPROVED, PAID, SCHEDULED, COMPLETED, REJECTED, CANCELLED
- `PaymentStatus` - PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED
- `PayoutStatus` - PENDING, READY, PROCESSING, RELEASED
- `ScheduleStatus` - LOCKED, UPCOMING, COMPLETED
- `TestStatus` - PENDING, IN_PROGRESS, PASSED, CONDITIONAL, FAILED
- `ReviewStatus` - PENDING, VERIFIED
- `SubmissionStatus` - SUBMITTED, LATE
- `CourseStatus` - PAYMENT_PENDING, ONGOING, COMPLETED

## 📦 Migration History

### Migration Order (Chronological)

1. **20251231083156_init** (Init Migration)
   - Creates base `users` table with Role enum
   - Creates all core tables (assessments, sessions, payments, etc.)
   - Creates all indexes and foreign keys
   - **Status**: ✅ Applied (will run on next deploy)

2. **20250115000000_remove_resume_review_unique_constraint**
   - Removes unique constraint on `resume_review_requests.resume_id`
   - Allows multiple reviews per resume (history)
   - **Status**: ✅ Resolved in production

3. **20250115000001_add_cover_letter_reviews**
   - Creates `ReviewStatus` enum
   - Creates `cover_letters` table (if not exists)
   - Creates `cover_letter_review_requests` table
   - Adds foreign keys with conditional logic
   - **Status**: ✅ Resolved in production

4. **20260104121639_add_sender_role_to_session_messages**
   - Adds `sender_role` VARCHAR(50) column to `session_messages`
   - **Status**: ⏳ Pending (will run on next deploy)

## 🛠️ Package.json Scripts

```json
{
  "prisma:generate": "prisma generate",      // Generate Prisma Client
  "prisma:migrate": "prisma migrate dev",     // Create new migration
  "prisma:studio": "prisma studio"           // Open Prisma Studio GUI
}
```

## 📝 Migration Lock File

**`migration_lock.toml`**
```toml
provider = "postgresql"
```
- Locks Prisma to PostgreSQL provider
- Prevents accidental database provider changes

## 🔄 Migration Status (Production)

### Current State
- **Total Migrations**: 4
- **Applied**: 2 (resolved manually)
- **Pending**: 2 (will apply on next deploy)

### Resolved Migrations
1. ✅ `20250115000000_remove_resume_review_unique_constraint`
2. ✅ `20250115000001_add_cover_letter_reviews`

### Pending Migrations
1. ⏳ `20251231083156_init` - Creates all base tables
2. ⏳ `20260104121639_add_sender_role_to_session_messages` - Adds sender_role field

## 🎯 Key Features

### Database Features
- **PostgreSQL** with Neon (serverless)
- **Foreign Keys** with CASCADE deletes
- **Indexes** for performance optimization
- **JSONB** fields for flexible data storage
- **Enums** for type safety

### Migration Features
- **Conditional Logic** in migrations (IF NOT EXISTS, DO blocks)
- **Safe Migration Resolution** via `prisma migrate resolve`
- **Automatic Migration Bootstrap** in production (via `prismaInit.ts`)

## 📊 Database Tables Summary

### Core Tables (Created by init migration)
- `users` - Base user table
- `student_profiles` - Student data
- `mentor_profiles` - Mentor data
- `sessions` - Session bookings
- `payments` - Payment records
- `admin_ledger` - Admin wallet
- `session_messages` - Chat messages
- `session_schedule` - Scheduled items
- `courses` - Course catalog
- `plans` - Mentorship plans
- `notifications` - User notifications
- `career_nav_ratings` - Platform ratings
- And 30+ more tables...

## 🔐 Important Notes

1. **Migration Resolution**: Failed migrations must be resolved against production DB using:
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

2. **Production Bootstrap**: Migrations run automatically via `backend/src/utils/prismaInit.ts`

3. **Build Command**: Render uses:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```

4. **Schema Changes**: Always create migrations via:
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```

## 📚 Related Files

- `backend/src/utils/prismaInit.ts` - Migration bootstrap utility
- `backend/src/server.ts` - Calls `initializePrisma()` on startup
- `backend/prisma/seed-skill-tests.ts` - Seed script for skill tests





