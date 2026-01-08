# Career Navigator

Career Navigator is a comprehensive career development platform designed to help students navigate their career journey with AI-powered tools, mentorship opportunities, and personalized guidance. The platform connects students with experienced mentors and provides various tools to enhance their career readiness.

## What is Career Navigator?

Career Navigator is a full-stack web application that serves as a one-stop solution for students' career development needs. It combines artificial intelligence, mentorship programs, and interactive tools to help students:

- Discover their career interests and strengths through assessments
- Build professional resumes and cover letters
- Practice interview skills with AI-powered mock interviews
- Connect with experienced mentors for personalized guidance
- Access industry insights and salary trends
- Follow structured learning paths for skill development
- Track their progress and maintain consistency through streak tracking

## Key Features

### For Students

#### 1. **Career Assessments**
- **Aptitude Assessment**: Tests quantitative reasoning, logical thinking, and verbal ability
- **Personality Assessment**: Evaluates work style, values, decision-making, and career interests
- **Personalized Career Report**: AI-generated recommendations based on assessment results, including:
  - Career readiness score
  - Strengths and areas for improvement
  - 3-5 personalized career options with match percentages
  - Salary ranges and growth outlook
  - Required skills for each career path

#### 2. **Resume Builder**
- Interactive resume creation with multiple sections:
  - Professional summary
  - Work experience
  - Education
  - Skills
  - Projects
  - Certifications
- **AI Improvement Feature**: Uses AI to enhance resume content, making it more impactful and ATS-friendly
- Real-time preview of the resume
- Export functionality to PDF

#### 3. **Cover Letter Generator**
- AI-powered cover letter generation based on job descriptions
- Customizable templates
- Professional formatting
- Export to PDF

#### 4. **Mock Interview Practice**
- AI-powered mock interview sessions
- Customizable interview settings:
  - Skill/domain selection
  - Role type (Frontend Developer, Backend Developer, etc.)
  - Interview type (Technical, Behavioral, etc.)
  - Difficulty level (Easy, Medium, Hard)
  - Number of questions
- Real-time voice recording and transcription
- Practice answering questions with time limits
- Session completion tracking

#### 5. **Mentorship Program**
- Browse and connect with verified mentors
- View mentor profiles with:
  - Skills and expertise
  - Ratings and reviews
  - Availability
  - Pricing for different mentorship plans
- Book mentorship sessions
- Real-time messaging with mentors
- Session management and tracking

#### 6. **Learning Paths**
- Personalized learning paths based on selected career
- Structured skill progression from beginner to advanced
- Each skill includes:
  - Learning resources (YouTube videos, documentation, courses)
  - Assignments (MCQs and practical tasks)
  - Estimated duration
- Progress tracking for each skill

#### 7. **Industry Insights**
- Weekly personalized industry insights based on:
  - Engineering branch/field
  - Current year/grade
  - Education type
  - Skills and career path
- Content includes:
  - Current market trends
  - Career opportunities
  - Skills in demand
  - Salary trends
  - Top companies
  - Emerging technologies

#### 8. **Student Dashboard**
- **Activity Streak Tracking**: Visual calendar showing daily login activity
  - Green boxes for days with activity
  - Red boxes for missed days
  - Streak count showing consecutive active days
  - Legend explaining the calendar
- **Key Metrics**:
  - Career readiness score
  - Resume strength
  - Mock interviews completed
  - Mentorship sessions booked
  - Learning progress
- **Quick Actions**: Easy access to all major features
- **Current Skill Progress**: Shows progress on the active learning path

#### 9. **Profile Management**
- Complete educational profile:
  - School/College name
  - Branch/Field of study
  - Year/Grade
  - Education type (B.Tech, M.Tech, etc.)
  - Skills
  - Experience level
- Profile completion tracking

### For Mentors

#### 1. **Mentor Dashboard**
- Overview of students and sessions
- Session management
- Student progress tracking
- Revenue and insights

#### 2. **Skill Verification**
- Take skill tests to verify expertise
- AI-generated questions for various skills
- Test results and feedback
- Skill certification upon passing

#### 3. **Mentorship Plans**
- Create mentorship plans for different skills
- Three levels: Basic, Intermediate, Advanced
- Set pricing, duration, and session frequency
- AI-generated plan topics and curriculum

#### 4. **Session Management**
- Schedule and manage sessions with students
- Real-time messaging
- Session materials and resources
- Assignment creation and review

#### 5. **Student Reviews**
- View and respond to student reviews
- Rating management
- Feedback collection

## Technology Stack

This section provides a comprehensive overview of all technologies used in the Career Navigator platform, explaining **why** each technology was chosen, **how** it's implemented, and **where** it's used in the codebase.

### Frontend Technologies

#### **React 18**
- **Why**: React is the industry standard for building modern, interactive user interfaces. React 18 provides concurrent rendering, automatic batching, and improved performance.
- **How**: The entire frontend is built as a single-page application (SPA) using React components. Components are organized by feature (pages, components, layouts) and use hooks for state management.
- **Where**: 
  - `src/App.tsx` - Main application component with routing
  - `src/pages/` - All page components (dashboard, assessments, resume, etc.)
  - `src/components/` - Reusable UI components
  - `src/main.tsx` - Application entry point

#### **TypeScript**
- **Why**: TypeScript provides static type checking, catching errors at compile-time, improving code quality, and enhancing developer experience with IntelliSense.
- **How**: All frontend files use TypeScript (`.tsx` for components, `.ts` for utilities). Type definitions are in `src/types/`.
- **Where**: 
  - All `.tsx` and `.ts` files in `src/`
  - `src/types/resume.ts` - Resume type definitions
  - `tsconfig.json` - TypeScript configuration

#### **Vite**
- **Why**: Vite offers lightning-fast development server startup, instant Hot Module Replacement (HMR), and optimized production builds using esbuild and Rollup.
- **How**: Vite serves as both the development server and build tool. It uses native ES modules for fast dev server and Rollup for production bundling.
- **Where**: 
  - `vite.config.ts` - Vite configuration with path aliases (`@/` for `src/`)
  - `package.json` - Scripts: `dev`, `build`, `preview`
  - Development server runs on `http://localhost:5173`

#### **React Router DOM v6**
- **Why**: Enables client-side routing without page refreshes, providing a smooth SPA experience with programmatic navigation.
- **How**: Uses declarative routing with `<Routes>` and `<Route>` components. Protected routes are wrapped with `<ProfileGuard>`.
- **Where**: 
  - `src/App.tsx` - All route definitions (lines 52-89)
  - `src/components/auth/ProfileGuard.tsx` - Route protection wrapper
  - Navigation via `useNavigate()` hook throughout the app

#### **TanStack Query (React Query) v5**
- **Why**: Simplifies server state management, provides automatic caching, background refetching, and optimistic updates without Redux complexity.
- **How**: Wraps the app with `QueryClientProvider`. Components use `useQuery` for fetching and `useMutation` for mutations.
- **Where**: 
  - `src/App.tsx` - `QueryClientProvider` setup (line 44-47)
  - Used in dashboard, assessments, and data-fetching components
  - Handles API calls with automatic loading/error states

#### **Tailwind CSS v3**
- **Why**: Utility-first CSS framework enables rapid UI development without writing custom CSS, with built-in responsive design and dark mode support.
- **How**: Configured via `tailwind.config.js`. Uses utility classes directly in JSX (e.g., `bg-blue-500`, `p-4`, `flex`).
- **Where**: 
  - `tailwind.config.js` - Tailwind configuration
  - `src/index.css` - Tailwind directives (`@tailwind base/components/utilities`)
  - All component files use Tailwind classes

#### **Radix UI**
- **Why**: Provides accessible, unstyled component primitives that follow WAI-ARIA guidelines, ensuring the app is accessible to all users.
- **How**: Components are built on Radix primitives and styled with Tailwind. Located in `src/components/ui/`.
- **Where**: 
  - `src/components/ui/` - 49 UI components (buttons, dialogs, dropdowns, etc.)
  - Used throughout the app for modals, dropdowns, tooltips, tabs, etc.
  - Examples: `dialog.tsx`, `dropdown-menu.tsx`, `toast.tsx`

#### **Socket.IO Client v4**
- **Why**: Enables real-time bidirectional communication between client and server for instant messaging and live updates.
- **How**: Singleton pattern ensures one socket connection per browser tab. Connects with JWT authentication.
- **Where**: 
  - `src/lib/socket.ts` - Socket client implementation with singleton pattern
  - `src/pages/mentor/Messages.tsx` - Real-time messaging
  - `src/pages/student/SessionDetail.tsx` - Session chat
  - Used for mentor-student messaging during sessions

#### **Axios**
- **Why**: Promise-based HTTP client with interceptors for automatic token attachment and error handling.
- **How**: Custom `ApiClient` class wraps Axios with request/response interceptors for JWT token management.
- **Where**: 
  - `src/lib/api.ts` - `ApiClient` class with token refresh logic
  - All API calls throughout the app use this client
  - Automatic token attachment via request interceptor

#### **React Hook Form v7**
- **Why**: Performant form library with minimal re-renders, built-in validation, and easy integration with Zod.
- **How**: Forms use `useForm` hook with `react-hook-form` resolvers for validation.
- **Where**: 
  - `src/pages/auth/StudentSignUp.tsx` - Registration forms
  - `src/pages/profile/EducationForm.tsx` - Profile forms
  - `src/pages/interview/InterviewSetup.tsx` - Interview configuration

#### **Zod v3**
- **Why**: TypeScript-first schema validation library that provides runtime validation with type inference.
- **How**: Used with React Hook Form via `@hookform/resolvers/zod` for form validation.
- **Where**: Form validation schemas in signup/login/profile forms

#### **Date-fns v3**
- **Why**: Lightweight date utility library for parsing, formatting, and manipulating dates.
- **How**: Used for date formatting in dashboards, calendars, and session scheduling.
- **Where**: 
  - `src/components/dashboard/StreakCalendar.tsx` - Date calculations
  - Session date formatting throughout the app

#### **Recharts v2**
- **Why**: Composable charting library built on React and D3, perfect for data visualization.
- **How**: Used for displaying charts and graphs in dashboards and insights.
- **Where**: 
  - `src/pages/mentor/Insights.tsx` - Analytics charts
  - Dashboard statistics visualization

#### **Sonner (Toast Notifications)**
- **Why**: Beautiful, accessible toast notification library with smooth animations.
- **How**: Wrapped in `Toaster` component in `App.tsx`. Used via `toast()` function.
- **Where**: 
  - `src/components/ui/sonner.tsx` - Toast component
  - `src/App.tsx` - Toaster provider (line 50)
  - Used throughout app for success/error notifications

#### **Firebase v12**
- **Why**: Provides additional authentication services (Google OAuth) and can be extended for cloud storage.
- **How**: Configured in `src/lib/firebase.ts`. Used for Google sign-in.
- **Where**: 
  - `src/lib/firebase.ts` - Firebase configuration
  - `src/pages/auth/StudentLogin.tsx` - Google OAuth integration

### Backend Technologies

#### **Node.js**
- **Why**: JavaScript runtime that allows running JavaScript on the server, enabling code sharing between frontend and backend.
- **How**: Backend runs as a Node.js process using Express.js framework.
- **Where**: 
  - `backend/src/server.ts` - Server entry point
  - All backend code runs on Node.js runtime

#### **Express.js v4**
- **Why**: Minimal, flexible web framework for Node.js with robust middleware ecosystem and routing capabilities.
- **How**: Express app configured in `app.ts` with middleware (CORS, JSON parsing, authentication) and route handlers.
- **Where**: 
  - `backend/src/app.ts` - Express app setup with middleware and routes
  - `backend/src/routes/` - All API route handlers
  - `backend/src/middlewares/` - Custom middleware (auth, error handling)

#### **TypeScript (Backend)**
- **Why**: Same benefits as frontend - type safety, better IDE support, catch errors at compile-time.
- **How**: Backend code is written in TypeScript and compiled to JavaScript using `tsc` or `tsx` for development.
- **Where**: 
  - All files in `backend/src/` are TypeScript
  - `backend/tsconfig.json` - TypeScript configuration
  - Compiled to `backend/dist/` for production

#### **Prisma v5**
- **Why**: Next-generation ORM with type-safe database queries, automatic migrations, and excellent developer experience.
- **How**: Prisma Client is generated from `schema.prisma`. Used for all database operations with type-safe queries.
- **Where**: 
  - `backend/prisma/schema.prisma` - Database schema definition
  - `backend/src/services/` - All services use Prisma Client
  - `backend/prisma/migrations/` - Database migration history
  - Example: `prisma.sessions.findMany()` in `mentor.service.ts`

#### **PostgreSQL**
- **Why**: Robust, open-source relational database with ACID compliance, excellent performance, and rich feature set.
- **How**: Database connection via `DATABASE_URL` environment variable. Prisma manages the connection pool.
- **Where**: 
  - `backend/.env` - `DATABASE_URL` connection string
  - All data persisted in PostgreSQL tables
  - Prisma migrations manage schema changes

#### **JWT (JSON Web Tokens)**
- **Why**: Stateless authentication mechanism that doesn't require server-side session storage, perfect for scalable APIs.
- **How**: Tokens generated on login/signup using `jsonwebtoken`. Verified on protected routes via middleware.
- **Where**: 
  - `backend/src/utils/jwt.ts` - Token generation and verification
  - `backend/src/middlewares/auth.middleware.ts` - JWT verification middleware
  - `backend/src/routes/auth.ts` - Token generation on login
  - Tokens stored in `localStorage` on frontend

#### **Passport.js + Google OAuth 2.0**
- **Why**: Industry-standard authentication middleware. Google OAuth enables single sign-on (SSO) for better UX.
- **How**: Passport strategy configured in `config/passport.ts`. OAuth flow: redirect to Google → callback → create/login user.
- **Where**: 
  - `backend/src/config/passport.ts` - Passport and Google OAuth strategy
  - `backend/src/routes/auth.ts` - OAuth routes (`/api/auth/google`, `/api/auth/google/callback`)
  - `backend/src/app.ts` - Passport initialization (lines 62-63)

#### **Socket.IO v4**
- **Why**: Real-time bidirectional communication library built on WebSockets with automatic fallback to HTTP long-polling.
- **How**: Socket.IO server initialized in `config/socket.ts`. Clients connect with JWT authentication. Rooms used for session-based messaging.
- **Where**: 
  - `backend/src/config/socket.ts` - Socket.IO server setup and event handlers
  - `backend/src/server.ts` - Socket.IO initialization (line 18)
  - `backend/src/routes/sessions.ts` - Message sending via Socket.IO
  - Real-time messaging in mentor-student sessions

#### **Multer v2**
- **Why**: Middleware for handling `multipart/form-data`, essential for file uploads (profile photos, assignments, session materials).
- **How**: Configured with storage destination. Used in routes that accept file uploads.
- **Where**: 
  - `backend/src/utils/fileUpload.ts` - Multer configuration
  - `backend/src/routes/profile.ts` - Profile photo uploads
  - `backend/src/routes/assignments.ts` - Assignment file uploads
  - Files stored in `backend/uploads/` directory

#### **Bcryptjs v2**
- **Why**: Password hashing library that securely hashes passwords before storing in database, protecting against rainbow table attacks.
- **How**: Passwords hashed with salt rounds (typically 10) before storing. Verified on login by comparing hashes.
- **Where**: 
  - `backend/src/routes/auth.ts` - Password hashing on signup, verification on login
  - Used in `StudentSignUp` and `MentorSignUp` routes

#### **Express Session**
- **Why**: Manages user sessions for OAuth flow and can store session data server-side.
- **How**: Configured with secure cookies. Used primarily for Passport.js OAuth flow.
- **Where**: 
  - `backend/src/app.ts` - Session middleware configuration (lines 48-59)
  - Required for Google OAuth callback handling

#### **CORS (Cross-Origin Resource Sharing)**
- **Why**: Enables frontend (running on different port) to make API requests to backend, essential for development and production.
- **How**: Configured to allow requests from `FRONTEND_URL` with credentials.
- **Where**: 
  - `backend/src/app.ts` - CORS middleware (lines 37-42)
  - Allows frontend at `http://localhost:5173` to access backend at `http://localhost:5000`

### AI Services

#### **Groq AI (Llama 3.3 70B)**
- **Why**: Groq provides extremely fast inference speeds (up to 10x faster than traditional APIs) with high-quality responses, perfect for real-time AI features.
- **How**: Groq SDK initialized in `utils/groq.ts`. Used via `generateWithGroq()` function with system prompts and user prompts.
- **Where**: 
  - `backend/src/utils/groq.ts` - All Groq AI integration functions
  - `backend/src/services/assessment.service.ts` - Question generation
  - `backend/src/services/career.service.ts` - Career report generation
  - `backend/src/services/learning.service.ts` - Learning path creation
  - `backend/src/services/industry.service.ts` - Industry insights
  - `backend/src/routes/resumes.ts` - Resume improvement
  - `backend/src/routes/interviews.ts` - Mock interview questions
  - `backend/src/services/plans.service.ts` - Mentorship plan generation
  - Used for 9+ different AI-powered features

#### **Google Gemini AI**
- **Why**: Backup AI service when Groq fails or rate limits are hit. Provides redundancy and fallback capability.
- **How**: Configured in `utils/gemini.ts`. Used as fallback in assessment question generation.
- **Where**: 
  - `backend/src/utils/gemini.ts` - Gemini AI integration
  - `backend/src/services/assessment.service.ts` - Fallback for question generation

### Development Tools

#### **ESLint**
- **Why**: Catches code quality issues, enforces coding standards, and prevents common bugs.
- **How**: Configured with TypeScript and React plugins. Runs on `npm run lint`.
- **Where**: 
  - `.eslintrc` or `package.json` - ESLint configuration
  - Used during development and CI/CD

#### **TSX**
- **Why**: TypeScript execution tool that runs TypeScript files directly without compilation, perfect for development scripts.
- **How**: Used in `package.json` scripts for running TypeScript files directly (`tsx watch src/server.ts`).
- **Where**: 
  - `backend/package.json` - `dev` script uses `tsx watch`
  - `backend/scripts/` - All utility scripts use `tsx`

#### **Prisma Studio**
- **Why**: Visual database browser that allows viewing and editing database records through a GUI.
- **How**: Run `npx prisma studio` to open web-based database browser.
- **Where**: 
  - `backend/package.json` - `prisma:studio` script
  - Accessible at `http://localhost:5555` when running

#### **Dotenv**
- **Why**: Loads environment variables from `.env` files, keeping sensitive data out of code.
- **How**: Imported in `config/env.ts` to load environment variables at startup.
- **Where**: 
  - `backend/src/config/env.ts` - Environment variable loading and validation
  - `backend/.env` - Environment variables file (not in git)

### Additional Libraries

#### **Class Variance Authority (CVA)**
- **Why**: Utility for building type-safe, composable component variants (e.g., button sizes, colors).
- **How**: Used in UI components to create variant-based styling.
- **Where**: `src/components/ui/button.tsx` and other variant-based components

#### **Lucide React**
- **Why**: Beautiful, consistent icon library with tree-shaking support.
- **How**: Icons imported and used throughout the app.
- **Where**: All components use Lucide icons (e.g., `<User>`, `<Settings>`, `<Calendar>`)

#### **Next Themes**
- **Why**: Simple theme management for dark/light mode switching.
- **How**: Wraps app with `ThemeProvider`. Theme persisted in localStorage.
- **Where**: Used for dark mode toggle in navigation bar

#### **React Day Picker**
- **Why**: Accessible date picker component for selecting dates.
- **How**: Used in forms that require date selection.
- **Where**: Session scheduling, date filtering components

#### **Zustand (if used)**
- **Why**: Lightweight state management alternative to Redux.
- **How**: (If implemented) Global state management for user data, theme, etc.
- **Where**: (If used) `src/store/` or similar directory

## Project Structure

```
CAREER-NAVIGATOR/
├── backend/                 # Backend server code
│   ├── src/
│   │   ├── app.ts          # Express app configuration
│   │   ├── server.ts       # Server startup
│   │   ├── config/         # Configuration files
│   │   │   ├── env.ts      # Environment variables
│   │   │   ├── passport.ts # OAuth configuration
│   │   │   └── socket.ts   # Socket.IO setup
│   │   ├── routes/         # API route handlers
│   │   │   ├── auth.ts     # Authentication routes
│   │   │   ├── dashboard.ts # Dashboard data
│   │   │   ├── assessments.ts # Assessment routes
│   │   │   ├── resumes.ts  # Resume routes
│   │   │   ├── interviews.ts # Mock interview routes
│   │   │   ├── mentors.ts   # Mentor routes
│   │   │   ├── sessions.ts  # Session management
│   │   │   ├── learning.ts  # Learning path routes
│   │   │   └── ...         # Other routes
│   │   ├── services/       # Business logic
│   │   │   ├── dashboard.service.ts
│   │   │   ├── assessment.service.ts
│   │   │   ├── mentor.service.ts
│   │   │   └── ...         # Other services
│   │   ├── middlewares/    # Express middlewares
│   │   │   ├── auth.middleware.ts # JWT authentication
│   │   │   └── error.middleware.ts # Error handling
│   │   ├── utils/          # Utility functions
│   │   │   ├── groq.ts     # Groq AI integration
│   │   │   ├── gemini.ts   # Gemini AI integration
│   │   │   ├── jwt.ts      # JWT token handling
│   │   │   └── ...         # Other utilities
│   │   └── jobs/           # Background jobs
│   │       ├── sessionStatusCron.ts # Session status updates
│   │       └── industryInsightsCron.ts # Weekly insights
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   └── package.json
│
├── src/                     # Frontend React application
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── student/        # Student pages
│   │   ├── mentor/          # Mentor pages
│   │   ├── assessment/     # Assessment pages
│   │   ├── resume/         # Resume builder
│   │   ├── interview/      # Mock interview
│   │   ├── learning/        # Learning paths
│   │   └── profile/         # Profile management
│   ├── components/         # Reusable components
│   │   ├── ui/             # UI components (buttons, dialogs, etc.)
│   │   ├── dashboard/      # Dashboard components
│   │   ├── resume/         # Resume components
│   │   └── ...             # Other components
│   ├── lib/                # Library utilities
│   │   ├── api.ts          # API client
│   │   ├── auth.ts         # Authentication utilities
│   │   └── socket.ts       # Socket.IO client
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── App.tsx             # Main app component
│
└── package.json            # Frontend dependencies
```

## How It Works

### Authentication Flow

1. **Sign Up**: Students and mentors can sign up using:
   - Email and password
   - Google OAuth (single sign-on)

2. **Profile Completion**: After signup, students complete their educational profile with:
   - School/College information
   - Branch/Field of study
   - Year/Grade
   - Skills and experience

3. **Authentication**: The system uses JWT (JSON Web Tokens) for secure authentication. Tokens are stored in localStorage and sent with each API request.

### Assessment Flow

1. **Start Assessment**: Student selects either Aptitude or Personality assessment
2. **Question Generation**: AI (Groq) generates personalized questions based on:
   - Student's educational profile
   - Year/grade level
   - Branch/field of study
3. **Answer Questions**: Student answers questions with time tracking
4. **Results Analysis**: AI analyzes answers and generates:
   - Scores for different categories
   - Strengths and weaknesses
   - Career recommendations
5. **Career Report**: Detailed report with 3-5 career options, match percentages, salary ranges, and required skills

### Resume Building Flow

1. **Create Resume**: Student fills in resume sections:
   - Professional summary
   - Work experience
   - Education
   - Skills
   - Projects
   - Certifications
2. **AI Improvement**: Click "AI Improve" on any section to:
   - Get AI-suggested improvements
   - Make content more impactful
   - Ensure ATS-friendly formatting
3. **Preview**: Real-time preview of the resume
4. **Export**: Download as PDF

### Mock Interview Flow

1. **Setup Interview**: Configure interview parameters:
   - Skill/domain
   - Role type
   - Interview type
   - Difficulty level
   - Number of questions
2. **Start Session**: AI generates questions based on settings
3. **Answer Questions**: 
   - Read the question
   - Record voice answer (optional)
   - Type written answer
   - Submit and move to next question
4. **Complete**: Session is saved and counted in dashboard metrics

### Mentorship Flow

1. **Browse Mentors**: Students can view:
   - List of available mentors
   - Top-rated mentors
   - Mentors by skill/domain
2. **View Mentor Profile**: See mentor details:
   - Skills and expertise
   - Ratings and reviews
   - Available mentorship plans
   - Pricing
3. **Book Session**: Select a plan and schedule a session
4. **Session Communication**: Real-time messaging via Socket.IO
5. **Track Progress**: View session history and progress

### Learning Path Flow

1. **Select Career**: After receiving career recommendations, student selects a career
2. **Generate Path**: AI creates a personalized learning path with:
   - 8-12 skills in logical order
   - Learning resources for each skill
   - Assignments (MCQs and tasks)
   - Estimated duration
3. **Learn Skills**: Student progresses through skills:
   - Access learning resources
   - Complete assignments
   - Track progress
4. **Skill Completion**: Mark skills as complete and move to next

### Industry Insights Flow

1. **Weekly Generation**: System automatically generates insights every week
2. **Personalization**: Insights are tailored to:
   - Student's branch/field
   - Current year/grade
   - Skills and career path
3. **Content**: Includes trends, opportunities, skills in demand, salary trends, top companies, and emerging technologies
4. **Access**: Students can view insights on the dashboard

### Activity Streak System

1. **Daily Login Tracking**: System records when a student logs in
2. **Calendar Display**: Visual calendar shows:
   - Green boxes for days with at least one login
   - Red boxes for missed days
   - Grey boxes for future days
3. **Streak Calculation**: Counts consecutive active days from today backwards
4. **Reset Logic**: Streak resets to 0 if a day is missed
5. **Time Boundaries**: A day is defined as 12:00 AM to 11:59 PM (local time)

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key database models include:

- **Users**: Student and mentor accounts
- **Student Profiles**: Educational and professional information
- **Mentor Profiles**: Mentor skills, ratings, and availability
- **Assessments**: Assessment records and results
- **Career Recommendations**: AI-generated career suggestions
- **Resumes**: Student resume data
- **Cover Letters**: Generated cover letters
- **Sessions**: Mentorship session bookings
- **Session Messages**: Real-time chat messages
- **Learning Progress**: Student progress on learning paths
- **User Activity**: Daily login tracking for streaks
- **Resume Reviews**: Mentor reviews of student resumes
- **Cover Letter Reviews**: Mentor reviews of cover letters
- **Assignments**: Mentor-created assignments
- **Submissions**: Student assignment submissions
- **Notifications**: System notifications
- **Industry Insights**: Weekly generated insights

## AI Integration

### Groq AI Usage

The platform extensively uses Groq AI (Llama 3.3 70B model) for:

1. **Assessment Questions**: Generates personalized aptitude and personality questions
2. **Career Reports**: Analyzes assessment results and generates career recommendations
3. **Learning Paths**: Creates structured learning paths for selected careers
4. **Industry Insights**: Generates weekly personalized industry insights
5. **Resume Improvement**: Enhances resume content for better impact
6. **Cover Letter Generation**: Creates professional cover letters
7. **Mock Interview Questions**: Generates interview questions based on settings
8. **Mentorship Plans**: Creates mentorship plan structures and topics
9. **Skill Test Questions**: Generates questions for mentor skill verification

### Gemini AI (Backup)

Google Gemini is configured as a backup AI service, primarily for assessment question generation if Groq fails.

## Real-Time Features

### Socket.IO Integration

The platform uses Socket.IO for real-time communication:

1. **Mentor-Student Messaging**: Instant messaging during sessions
2. **Session Updates**: Real-time session status updates
3. **Notifications**: Push notifications for important events

## Background Jobs

### Cron Jobs

1. **Session Status Updates**: Automatically updates session statuses (scheduled, ongoing, completed, cancelled)
2. **Industry Insights Generation**: Weekly generation of personalized insights for all students

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: Bcrypt for password security
3. **OAuth Integration**: Secure Google OAuth for single sign-on
4. **Role-Based Access**: Different access levels for students and mentors
5. **Protected Routes**: Frontend and backend route protection
6. **Input Validation**: Server-side validation for all inputs

## Environment Setup

### Required Environment Variables

**Backend (.env in backend/ directory):**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (e.g., "7d")
- `SESSION_SECRET`: Secret for session management
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend application URL
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: Google OAuth callback URL
- `GROQ_API_KEY`: Groq AI API key
- `GEMINI_API_KEY`: Google Gemini API key (optional)

**Frontend (.env in root directory):**
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000/api)

### Installation Steps

1. **Clone the repository**
2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   npm install
   ```

4. **Set up database**:
   - Create PostgreSQL database
   - Update `DATABASE_URL` in backend `.env`
   - Run migrations:
     ```bash
     cd backend
     npx prisma migrate dev
     npx prisma generate
     ```

5. **Configure environment variables**:
   - Copy `backend/env.example` to `backend/.env`
   - Fill in all required values
   - Create frontend `.env` if needed

6. **Start backend server**:
   ```bash
   cd backend
   npm run dev
   ```

7. **Start frontend development server**:
   ```bash
   npm run dev
   ```

8. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Prisma Studio: `cd backend && npx prisma studio`

## Development Workflow

1. **Frontend Development**: 
   - React components in `src/pages/` and `src/components/`
   - API calls through `src/lib/api.ts`
   - State management with TanStack Query

2. **Backend Development**:
   - Routes in `backend/src/routes/`
   - Business logic in `backend/src/services/`
   - Database models in `backend/prisma/schema.prisma`

3. **Database Changes**:
   - Modify `schema.prisma`
   - Create migration: `npx prisma migrate dev --name migration_name`
   - Generate Prisma client: `npx prisma generate`

## Key Design Decisions

1. **AI-First Approach**: Heavy use of AI for personalization and content generation
2. **Real-Time Communication**: Socket.IO for instant messaging and updates
3. **Streak System**: Gamification through daily activity tracking
4. **Modular Architecture**: Separation of concerns with services, routes, and components
5. **Type Safety**: TypeScript throughout for better code quality
6. **Responsive Design**: Mobile-friendly UI with Tailwind CSS
7. **Accessibility**: Radix UI components for accessible interfaces

## Future Enhancements

Potential areas for improvement:
- Video call integration for mentorship sessions
- Mobile app (React Native)
- Advanced analytics and reporting
- Integration with job boards
- Certificate generation for completed learning paths
- Peer-to-peer learning groups
- Advanced resume templates
- Interview feedback and analysis
- Career goal tracking and milestones

## Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.

---

**Career Navigator** - Empowering students to navigate their career journey with confidence and clarity.

