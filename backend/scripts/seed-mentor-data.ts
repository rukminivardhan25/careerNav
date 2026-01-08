/**
 * Seed mentor sample data
 * Run with: npx tsx scripts/seed-mentor-data.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding mentor data...");

  // Hash password for mentors
  const hashedPassword = await bcrypt.hash("password123", 10);

  // ============================================
  // 1. Create Mentor Users
  // ============================================
  console.log("Creating mentor users...");

  const mentors = [
    {
      id: "mentor_001",
      email: "dr.smith@example.com",
      name: "Dr. John Smith",
      role: "MENTOR" as const,
      password: hashedPassword,
    },
    {
      id: "mentor_002",
      email: "priya.sharma@example.com",
      name: "Priya Sharma",
      role: "MENTOR" as const,
      password: hashedPassword,
    },
    {
      id: "mentor_003",
      email: "rahul.kumar@example.com",
      name: "Rahul Kumar",
      role: "MENTOR" as const,
      password: hashedPassword,
    },
    {
      id: "mentor_004",
      email: "ananya.patel@example.com",
      name: "Ananya Patel",
      role: "MENTOR" as const,
      password: hashedPassword,
    },
    {
      id: "mentor_005",
      email: "vikram.singh@example.com",
      name: "Vikram Singh",
      role: "MENTOR" as const,
      password: hashedPassword,
    },
  ];

  for (const mentor of mentors) {
    await prisma.user.upsert({
      where: { email: mentor.email },
      update: {},
      create: mentor,
    });
  }

  // ============================================
  // 2. Create Mentor Profiles
  // ============================================
  console.log("Creating mentor profiles...");

  const profiles = [
    {
      user_id: "mentor_001",
      full_name: "Dr. John Smith",
      bio: "Experienced software engineer with 10+ years in the industry. Specialized in system design and cloud architecture.",
      current_role: "Working Professional",
      highest_qualification: "M.Tech",
      degree: "Master of Technology",
      branch: "Computer Science",
      college: "IIT Delhi",
      graduation_year: 2015,
      experience_years: 10,
      profession: "Senior Software Engineer",
      company: "Google",
      expertise_areas: ["System Design", "Cloud Computing", "Distributed Systems", "Java"],
      linkedin_url: "https://linkedin.com/in/johnsmith",
      profile_completed: true,
      rating: 4.85,
      total_reviews: 24,
      session_types: ["Career Counseling", "Resume Review", "Mock Interview"],
      pricing_per_hour: 1500.00,
      available_slots: {
        monday: ["10:00-12:00", "14:00-16:00"],
        tuesday: ["10:00-12:00"],
        wednesday: ["14:00-18:00"],
        thursday: ["10:00-12:00"],
        friday: ["14:00-16:00"],
      },
    },
    {
      user_id: "mentor_002",
      full_name: "Priya Sharma",
      bio: "Full-stack developer and career coach. Helping students transition into tech roles.",
      current_role: "Working Professional",
      highest_qualification: "B.Tech",
      degree: "Bachelor of Technology",
      branch: "Information Technology",
      college: "NIT Trichy",
      graduation_year: 2018,
      experience_years: 6,
      profession: "Full Stack Developer",
      company: "Microsoft",
      expertise_areas: ["Web Development", "React", "Node.js", "JavaScript"],
      linkedin_url: "https://linkedin.com/in/priyasharma",
      profile_completed: true,
      rating: 4.92,
      total_reviews: 18,
      session_types: ["Career Counseling", "Resume Review"],
      pricing_per_hour: 1200.00,
      available_slots: {
        monday: ["15:00-17:00"],
        wednesday: ["15:00-17:00"],
        friday: ["15:00-17:00"],
      },
    },
    {
      user_id: "mentor_003",
      full_name: "Rahul Kumar",
      bio: "Data scientist and ML engineer. Passionate about teaching data science concepts.",
      current_role: "Working Professional",
      highest_qualification: "MSc",
      degree: "Master of Science",
      branch: "Data Science",
      college: "IISc Bangalore",
      graduation_year: 2019,
      experience_years: 5,
      profession: "Data Scientist",
      company: "Amazon",
      expertise_areas: ["Machine Learning", "Python", "Data Science", "SQL"],
      linkedin_url: "https://linkedin.com/in/rahulkumar",
      profile_completed: true,
      rating: 4.78,
      total_reviews: 15,
      session_types: ["Career Counseling", "Mock Interview"],
      pricing_per_hour: 1300.00,
      available_slots: {
        tuesday: ["11:00-13:00"],
        thursday: ["11:00-13:00"],
        saturday: ["10:00-12:00"],
      },
    },
    {
      user_id: "mentor_004",
      full_name: "Ananya Patel",
      bio: "Student mentor currently pursuing M.Tech. Specialized in DSA and competitive programming.",
      current_role: "Student",
      highest_qualification: "B.Tech",
      degree: "Bachelor of Technology",
      branch: "Computer Science",
      college: "IIT Bombay",
      graduation_year: 2022,
      current_year: "2nd Year M.Tech",
      experience_years: null,
      profession: null,
      company: null,
      expertise_areas: ["Data Structures", "Algorithms", "C++", "Competitive Programming"],
      linkedin_url: "https://linkedin.com/in/ananyapatel",
      profile_completed: true,
      rating: 4.65,
      total_reviews: 12,
      session_types: ["Resume Review", "Mock Interview"],
      pricing_per_hour: 800.00,
      available_slots: {
        monday: ["18:00-20:00"],
        wednesday: ["18:00-20:00"],
        friday: ["18:00-20:00"],
      },
    },
    {
      user_id: "mentor_005",
      full_name: "Vikram Singh",
      bio: "Freelance developer and mentor. Expert in mobile app development.",
      current_role: "Freelancer",
      highest_qualification: "BCA",
      degree: "Bachelor of Computer Applications",
      branch: "Computer Applications",
      college: "DU Delhi",
      graduation_year: 2020,
      experience_years: 4,
      profession: "Mobile App Developer",
      company: "Freelance",
      expertise_areas: ["Android Development", "Kotlin", "Flutter", "React Native"],
      linkedin_url: "https://linkedin.com/in/vikramsingh",
      profile_completed: true,
      rating: 4.70,
      total_reviews: 10,
      session_types: ["Career Counseling", "Resume Review"],
      pricing_per_hour: 1000.00,
      available_slots: {
        tuesday: ["16:00-18:00"],
        thursday: ["16:00-18:00"],
        saturday: ["14:00-16:00"],
      },
    },
  ];

  for (const profile of profiles) {
    await prisma.mentor_profiles.upsert({
      where: { user_id: profile.user_id },
      update: {},
      create: profile,
    });
  }

  // ============================================
  // 3. Create Mentor Experiences
  // ============================================
  console.log("Creating mentor experiences...");

  const experiences = [
    {
      mentor_id: "mentor_001",
      company: "Google",
      role: "Senior Software Engineer",
      domain: "Cloud Infrastructure",
      start_date: new Date("2018-01-01"),
      end_date: null,
      is_current: true,
      description: "Leading a team of 5 engineers working on cloud infrastructure. Responsible for system design and architecture.",
      achievements: [
        "Led migration of 10+ microservices to cloud",
        "Reduced system latency by 40%",
        "Mentored 15+ junior engineers",
      ],
    },
    {
      mentor_id: "mentor_001",
      company: "Microsoft",
      role: "Software Engineer",
      domain: "Azure Services",
      start_date: new Date("2015-06-01"),
      end_date: new Date("2017-12-31"),
      is_current: false,
      description: "Developed and maintained Azure cloud services. Worked on distributed systems.",
      achievements: ["Built scalable API services", "Improved system reliability by 30%"],
    },
    {
      mentor_id: "mentor_002",
      company: "Microsoft",
      role: "Full Stack Developer",
      domain: "Web Development",
      start_date: new Date("2018-07-01"),
      end_date: null,
      is_current: true,
      description: "Building scalable web applications using React and Node.js. Leading frontend architecture decisions.",
      achievements: [
        "Launched 3 major products",
        "Improved page load time by 50%",
        "Mentored 8 junior developers",
      ],
    },
    {
      mentor_id: "mentor_003",
      company: "Amazon",
      role: "Data Scientist",
      domain: "Machine Learning",
      start_date: new Date("2019-08-01"),
      end_date: null,
      is_current: true,
      description: "Building ML models for recommendation systems. Working with large-scale data processing.",
      achievements: [
        "Improved recommendation accuracy by 25%",
        "Reduced model training time by 60%",
        "Published 2 research papers",
      ],
    },
    {
      mentor_id: "mentor_004",
      company: "Google",
      role: "Software Engineering Intern",
      domain: "Algorithms",
      start_date: new Date("2021-05-01"),
      end_date: new Date("2021-08-31"),
      is_current: false,
      description: "Worked on optimizing search algorithms. Participated in code reviews and design discussions.",
      achievements: ["Optimized search algorithm performance", "Contributed to open-source projects"],
    },
    {
      mentor_id: "mentor_004",
      company: "CodeChef",
      role: "Problem Setter",
      domain: "Competitive Programming",
      start_date: new Date("2020-01-01"),
      end_date: null,
      is_current: true,
      description: "Creating and reviewing competitive programming problems. Helping organize coding contests.",
      achievements: ["Created 50+ problems", "Organized 10+ contests"],
    },
    {
      mentor_id: "mentor_005",
      company: "Freelance",
      role: "Mobile App Developer",
      domain: "Mobile Development",
      start_date: new Date("2020-09-01"),
      end_date: null,
      is_current: true,
      description: "Developing mobile applications for clients. Working with Android, iOS, and cross-platform frameworks.",
      achievements: [
        "Launched 20+ mobile apps",
        "5 apps with 100k+ downloads",
        "Maintained 4.8+ app store rating",
      ],
    },
  ];

  for (const exp of experiences) {
    await prisma.mentor_experiences.create({
      data: exp,
    }).catch(() => {
      // Ignore if already exists
    });
  }

  // ============================================
  // 4. Create Courses (if not exist)
  // ============================================
  console.log("Creating courses...");

  const courses = [
    {
      career_id: "software-engineer",
      title: "Software Engineering",
      description: "Complete software engineering course covering system design, algorithms, and best practices",
      is_active: true,
    },
    {
      career_id: "data-analyst",
      title: "Data Analysis",
      description: "Data analysis course covering SQL, Python, and data visualization",
      is_active: true,
    },
    {
      career_id: "web-developer",
      title: "Web Development",
      description: "Full-stack web development course with React, Node.js, and modern frameworks",
      is_active: true,
    },
    {
      career_id: "mobile-developer",
      title: "Mobile Development",
      description: "Mobile app development course covering Android, iOS, and cross-platform frameworks",
      is_active: true,
    },
    {
      career_id: "data-scientist",
      title: "Data Science",
      description: "Data science course covering ML, statistics, and data engineering",
      is_active: true,
    },
  ];

  for (const course of courses) {
    await prisma.courses.upsert({
      where: { career_id: course.career_id },
      update: {},
      create: course,
    });
  }

  // ============================================
  // 5. Create Mentor Tests
  // ============================================
  console.log("Creating mentor tests...");

  const tests = [
    {
      mentor_id: "mentor_001",
      course_name: "Data Structures",
      course_category: "DSA",
      score: 85.50,
      status: "PASSED" as const,
      test_duration: 42,
      total_questions: 20,
      correct_answers: 17,
      strengths: [
        "Strong understanding of algorithms",
        "Excellent problem-solving skills",
        "Good time complexity analysis",
      ],
      weaknesses: ["Could improve on graph algorithms"],
      feedback: "Excellent performance. Strong fundamentals in data structures.",
      attempted_at: new Date("2025-01-15T10:00:00Z"),
      completed_at: new Date("2025-01-15T10:42:00Z"),
    },
    {
      mentor_id: "mentor_001",
      course_name: "System Design",
      course_category: "System",
      score: 92.00,
      status: "PASSED" as const,
      test_duration: 38,
      total_questions: 20,
      correct_answers: 19,
      strengths: [
        "Excellent system architecture knowledge",
        "Strong scalability understanding",
        "Good trade-off analysis",
      ],
      weaknesses: ["Minor improvements in caching strategies"],
      feedback: "Outstanding performance. Ready to mentor students in system design.",
      attempted_at: new Date("2025-01-10T14:00:00Z"),
      completed_at: new Date("2025-01-10T14:38:00Z"),
    },
    {
      mentor_id: "mentor_002",
      course_name: "Java Programming",
      course_category: "Programming",
      score: 88.75,
      status: "PASSED" as const,
      test_duration: 40,
      total_questions: 20,
      correct_answers: 18,
      strengths: ["Strong Java fundamentals", "Good understanding of OOP", "Excellent code quality"],
      weaknesses: ["Could improve on advanced Java features"],
      feedback: "Great performance. Well-suited to mentor Java programming.",
      attempted_at: new Date("2025-01-12T11:00:00Z"),
      completed_at: new Date("2025-01-12T11:40:00Z"),
    },
    {
      mentor_id: "mentor_002",
      course_name: "Web Development",
      course_category: "Web",
      score: 90.00,
      status: "PASSED" as const,
      test_duration: 35,
      total_questions: 20,
      correct_answers: 18,
      strengths: ["Excellent React knowledge", "Strong backend understanding", "Good full-stack skills"],
      weaknesses: ["Minor improvements in testing"],
      feedback: "Excellent performance. Ready to mentor web development.",
      attempted_at: new Date("2025-01-08T15:00:00Z"),
      completed_at: new Date("2025-01-08T15:35:00Z"),
    },
    {
      mentor_id: "mentor_003",
      course_name: "Machine Learning",
      course_category: "Data Science",
      score: 87.25,
      status: "PASSED" as const,
      test_duration: 43,
      total_questions: 20,
      correct_answers: 18,
      strengths: ["Strong ML fundamentals", "Good understanding of algorithms", "Excellent practical knowledge"],
      weaknesses: ["Could improve on deep learning theory"],
      feedback: "Great performance. Ready to mentor machine learning.",
      attempted_at: new Date("2025-01-14T09:00:00Z"),
      completed_at: new Date("2025-01-14T09:43:00Z"),
    },
    {
      mentor_id: "mentor_004",
      course_name: "Data Structures",
      course_category: "DSA",
      score: 91.50,
      status: "PASSED" as const,
      test_duration: 36,
      total_questions: 20,
      correct_answers: 19,
      strengths: ["Excellent problem-solving", "Strong algorithm knowledge", "Fast and accurate"],
      weaknesses: ["Minor improvements in advanced topics"],
      feedback: "Outstanding performance. Excellent for mentoring DSA.",
      attempted_at: new Date("2025-01-11T16:00:00Z"),
      completed_at: new Date("2025-01-11T16:36:00Z"),
    },
    {
      mentor_id: "mentor_005",
      course_name: "Android Development",
      course_category: "Mobile",
      score: 83.00,
      status: "PASSED" as const,
      test_duration: 44,
      total_questions: 20,
      correct_answers: 17,
      strengths: ["Strong Android fundamentals", "Good Kotlin knowledge", "Practical experience"],
      weaknesses: ["Could improve on advanced Android features"],
      feedback: "Good performance. Ready to mentor Android development.",
      attempted_at: new Date("2025-01-13T13:00:00Z"),
      completed_at: new Date("2025-01-13T13:44:00Z"),
    },
    {
      mentor_id: "mentor_005",
      course_name: "Web Development",
      course_category: "Web",
      score: 58.00,
      status: "FAILED" as const,
      test_duration: 45,
      total_questions: 20,
      correct_answers: 12,
      strengths: ["Basic HTML/CSS knowledge"],
      weaknesses: ["Weak in JavaScript", "Limited React knowledge", "Backend concepts unclear"],
      feedback: "Test score below passing threshold. Retry available after 7 days. Focus on JavaScript and React fundamentals.",
      attempted_at: new Date("2025-01-05T10:00:00Z"),
      completed_at: new Date("2025-01-05T10:45:00Z"),
      retry_available_after: new Date("2025-01-12T10:45:00Z"),
    },
  ];

  for (const test of tests) {
    await prisma.mentor_tests.create({
      data: test,
    }).catch(() => {
      // Ignore if already exists
    });
  }

  // ============================================
  // 6. Create Mentor Course Verifications
  // ============================================
  console.log("Creating mentor course verifications...");

  // Get course IDs
  const softwareCourse = await prisma.courses.findUnique({
    where: { career_id: "software-engineer" },
  });
  const webCourse = await prisma.courses.findUnique({
    where: { career_id: "web-developer" },
  });
  const dataScienceCourse = await prisma.courses.findUnique({
    where: { career_id: "data-scientist" },
  });
  const mobileCourse = await prisma.courses.findUnique({
    where: { career_id: "mobile-developer" },
  });

  // Get test IDs
  const dsTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_001",
      course_name: "Data Structures",
      status: "PASSED",
    },
  });
  const sdTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_001",
      course_name: "System Design",
      status: "PASSED",
    },
  });
  const javaTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_002",
      course_name: "Java Programming",
      status: "PASSED",
    },
  });
  const webTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_002",
      course_name: "Web Development",
      status: "PASSED",
    },
  });
  const mlTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_003",
      course_name: "Machine Learning",
      status: "PASSED",
    },
  });
  const dsTest2 = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_004",
      course_name: "Data Structures",
      status: "PASSED",
    },
  });
  const androidTest = await prisma.mentor_tests.findFirst({
    where: {
      mentor_id: "mentor_005",
      course_name: "Android Development",
      status: "PASSED",
    },
  });

  const verifications = [
    {
      mentor_id: "mentor_001",
      course_id: softwareCourse?.id,
      test_id: dsTest?.id,
      verification_score: 85.50,
      is_active: true,
    },
    {
      mentor_id: "mentor_002",
      course_id: webCourse?.id,
      test_id: webTest?.id,
      verification_score: 90.00,
      is_active: true,
    },
    {
      mentor_id: "mentor_003",
      course_id: dataScienceCourse?.id,
      test_id: mlTest?.id,
      verification_score: 87.25,
      is_active: true,
    },
    {
      mentor_id: "mentor_004",
      course_id: softwareCourse?.id,
      test_id: dsTest2?.id,
      verification_score: 91.50,
      is_active: true,
    },
    {
      mentor_id: "mentor_005",
      course_id: mobileCourse?.id,
      test_id: androidTest?.id,
      verification_score: 83.00,
      is_active: true,
    },
  ].filter((v) => v.course_id && v.test_id);

  for (const verification of verifications) {
    await prisma.mentor_course_verifications.upsert({
      where: {
        mentor_id_course_id: {
          mentor_id: verification.mentor_id,
          course_id: verification.course_id!,
        },
      },
      update: {},
      create: {
        mentor_id: verification.mentor_id,
        course_id: verification.course_id!,
        test_id: verification.test_id!,
        verification_score: verification.verification_score,
        is_active: true,
      },
    });
  }

  // ============================================
  // 7. Create Mentor Courses Mapping
  // ============================================
  console.log("Creating mentor-course mappings...");

  const mentorCourses = [
    { mentor_id: "mentor_001", course_id: softwareCourse?.id },
    { mentor_id: "mentor_002", course_id: webCourse?.id },
    { mentor_id: "mentor_003", course_id: dataScienceCourse?.id },
    { mentor_id: "mentor_004", course_id: softwareCourse?.id },
    { mentor_id: "mentor_005", course_id: mobileCourse?.id },
  ].filter((mc) => mc.course_id);

  for (const mc of mentorCourses) {
    await prisma.mentor_courses.upsert({
      where: {
        mentor_id_course_id: {
          mentor_id: mc.mentor_id,
          course_id: mc.course_id!,
        },
      },
      update: {},
      create: {
        mentor_id: mc.mentor_id,
        course_id: mc.course_id!,
      },
    });
  }

  console.log("✅ Mentor data seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`- ${mentors.length} mentor users created`);
  console.log(`- ${profiles.length} mentor profiles created`);
  console.log(`- ${experiences.length} experiences created`);
  console.log(`- ${courses.length} courses created`);
  console.log(`- ${tests.length} mentor tests created`);
  console.log(`- ${verifications.length} course verifications created`);
  console.log(`- ${mentorCourses.length} mentor-course mappings created`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



