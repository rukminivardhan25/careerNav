-- ============================================
-- MENTOR DATABASE SAMPLE DATA
-- ============================================
-- Run this SQL script AFTER creating tables via Prisma migration
-- Make sure to replace placeholder values with actual hashed passwords

-- ============================================
-- 1. USERS (Mentors)
-- ============================================
INSERT INTO users (id, email, name, role, provider, "createdAt", "updatedAt", password, profile_completed)
VALUES
  ('mentor_001', 'dr.smith@example.com', 'Dr. John Smith', 'MENTOR', 'email', NOW(), NOW(), '$2a$10$placeholder_hash_here', true),
  ('mentor_002', 'priya.sharma@example.com', 'Priya Sharma', 'MENTOR', 'email', NOW(), NOW(), '$2a$10$placeholder_hash_here', true),
  ('mentor_003', 'rahul.kumar@example.com', 'Rahul Kumar', 'MENTOR', 'email', NOW(), NOW(), '$2a$10$placeholder_hash_here', true),
  ('mentor_004', 'ananya.patel@example.com', 'Ananya Patel', 'MENTOR', 'email', NOW(), NOW(), '$2a$10$placeholder_hash_here', true),
  ('mentor_005', 'vikram.singh@example.com', 'Vikram Singh', 'MENTOR', 'email', NOW(), NOW(), '$2a$10$placeholder_hash_here', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. MENTOR PROFILES
-- ============================================
INSERT INTO mentor_profiles (
  user_id, full_name, bio, current_role, 
  highest_qualification, degree, branch, college, graduation_year,
  experience_years, profession, company, expertise_areas,
  linkedin_url, profile_completed, rating, total_reviews,
  session_types, pricing_per_hour, available_slots,
  created_at, updated_at
)
VALUES
  (
    'mentor_001',
    'Dr. John Smith',
    'Experienced software engineer with 10+ years in the industry. Specialized in system design and cloud architecture.',
    'Working Professional',
    'M.Tech',
    'Master of Technology',
    'Computer Science',
    'IIT Delhi',
    2015,
    10,
    'Senior Software Engineer',
    'Google',
    ARRAY['System Design', 'Cloud Computing', 'Distributed Systems', 'Java'],
    'https://linkedin.com/in/johnsmith',
    true,
    4.85,
    24,
    ARRAY['Career Counseling', 'Resume Review', 'Mock Interview'],
    1500.00,
    '{"monday": ["10:00-12:00", "14:00-16:00"], "tuesday": ["10:00-12:00"], "wednesday": ["14:00-18:00"], "thursday": ["10:00-12:00"], "friday": ["14:00-16:00"]}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'mentor_002',
    'Priya Sharma',
    'Full-stack developer and career coach. Helping students transition into tech roles.',
    'Working Professional',
    'B.Tech',
    'Bachelor of Technology',
    'Information Technology',
    'NIT Trichy',
    2018,
    6,
    'Full Stack Developer',
    'Microsoft',
    ARRAY['Web Development', 'React', 'Node.js', 'JavaScript'],
    'https://linkedin.com/in/priyasharma',
    true,
    4.92,
    18,
    ARRAY['Career Counseling', 'Resume Review'],
    1200.00,
    '{"monday": ["15:00-17:00"], "wednesday": ["15:00-17:00"], "friday": ["15:00-17:00"]}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'mentor_003',
    'Rahul Kumar',
    'Data scientist and ML engineer. Passionate about teaching data science concepts.',
    'Working Professional',
    'MSc',
    'Master of Science',
    'Data Science',
    'IISc Bangalore',
    2019,
    5,
    'Data Scientist',
    'Amazon',
    ARRAY['Machine Learning', 'Python', 'Data Science', 'SQL'],
    'https://linkedin.com/in/rahulkumar',
    true,
    4.78,
    15,
    ARRAY['Career Counseling', 'Mock Interview'],
    1300.00,
    '{"tuesday": ["11:00-13:00"], "thursday": ["11:00-13:00"], "saturday": ["10:00-12:00"]}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'mentor_004',
    'Ananya Patel',
    'Student mentor currently pursuing M.Tech. Specialized in DSA and competitive programming.',
    'Student',
    'B.Tech',
    'Bachelor of Technology',
    'Computer Science',
    'IIT Bombay',
    2022,
    NULL,
    NULL,
    NULL,
    ARRAY['Data Structures', 'Algorithms', 'C++', 'Competitive Programming'],
    'https://linkedin.com/in/ananyapatel',
    true,
    4.65,
    12,
    ARRAY['Resume Review', 'Mock Interview'],
    800.00,
    '{"monday": ["18:00-20:00"], "wednesday": ["18:00-20:00"], "friday": ["18:00-20:00"]}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'mentor_005',
    'Vikram Singh',
    'Freelance developer and mentor. Expert in mobile app development.',
    'Freelancer',
    'BCA',
    'Bachelor of Computer Applications',
    'Computer Applications',
    'DU Delhi',
    2020,
    4,
    'Mobile App Developer',
    'Freelance',
    ARRAY['Android Development', 'Kotlin', 'Flutter', 'React Native'],
    'https://linkedin.com/in/vikramsingh',
    true,
    4.70,
    10,
    ARRAY['Career Counseling', 'Resume Review'],
    1000.00,
    '{"tuesday": ["16:00-18:00"], "thursday": ["16:00-18:00"], "saturday": ["14:00-16:00"]}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. MENTOR EXPERIENCES
-- ============================================
INSERT INTO mentor_experiences (
  mentor_id, company, role, domain, start_date, end_date, is_current, description, achievements
)
VALUES
  -- Dr. John Smith's Experience
  (
    'mentor_001',
    'Google',
    'Senior Software Engineer',
    'Cloud Infrastructure',
    '2018-01-01',
    NULL,
    true,
    'Leading a team of 5 engineers working on cloud infrastructure. Responsible for system design and architecture.',
    ARRAY['Led migration of 10+ microservices to cloud', 'Reduced system latency by 40%', 'Mentored 15+ junior engineers']
  ),
  (
    'mentor_001',
    'Microsoft',
    'Software Engineer',
    'Azure Services',
    '2015-06-01',
    '2017-12-31',
    false,
    'Developed and maintained Azure cloud services. Worked on distributed systems.',
    ARRAY['Built scalable API services', 'Improved system reliability by 30%']
  ),
  
  -- Priya Sharma's Experience
  (
    'mentor_002',
    'Microsoft',
    'Full Stack Developer',
    'Web Development',
    '2018-07-01',
    NULL,
    true,
    'Building scalable web applications using React and Node.js. Leading frontend architecture decisions.',
    ARRAY['Launched 3 major products', 'Improved page load time by 50%', 'Mentored 8 junior developers']
  ),
  
  -- Rahul Kumar's Experience
  (
    'mentor_003',
    'Amazon',
    'Data Scientist',
    'Machine Learning',
    '2019-08-01',
    NULL,
    true,
    'Building ML models for recommendation systems. Working with large-scale data processing.',
    ARRAY['Improved recommendation accuracy by 25%', 'Reduced model training time by 60%', 'Published 2 research papers']
  ),
  
  -- Ananya Patel (Student - Internships)
  (
    'mentor_004',
    'Google',
    'Software Engineering Intern',
    'Algorithms',
    '2021-05-01',
    '2021-08-31',
    false,
    'Worked on optimizing search algorithms. Participated in code reviews and design discussions.',
    ARRAY['Optimized search algorithm performance', 'Contributed to open-source projects']
  ),
  (
    'mentor_004',
    'CodeChef',
    'Problem Setter',
    'Competitive Programming',
    '2020-01-01',
    NULL,
    true,
    'Creating and reviewing competitive programming problems. Helping organize coding contests.',
    ARRAY['Created 50+ problems', 'Organized 10+ contests']
  ),
  
  -- Vikram Singh's Experience
  (
    'mentor_005',
    'Freelance',
    'Mobile App Developer',
    'Mobile Development',
    '2020-09-01',
    NULL,
    true,
    'Developing mobile applications for clients. Working with Android, iOS, and cross-platform frameworks.',
    ARRAY['Launched 20+ mobile apps', '5 apps with 100k+ downloads', 'Maintained 4.8+ app store rating']
  );

-- ============================================
-- 4. COURSES (if not already exists)
-- ============================================
INSERT INTO courses (career_id, title, description, is_active, created_at, updated_at)
VALUES
  ('software-engineer', 'Software Engineering', 'Complete software engineering course covering system design, algorithms, and best practices', true, NOW(), NOW()),
  ('data-analyst', 'Data Analysis', 'Data analysis course covering SQL, Python, and data visualization', true, NOW(), NOW()),
  ('web-developer', 'Web Development', 'Full-stack web development course with React, Node.js, and modern frameworks', true, NOW(), NOW()),
  ('mobile-developer', 'Mobile Development', 'Mobile app development course covering Android, iOS, and cross-platform frameworks', true, NOW(), NOW()),
  ('data-scientist', 'Data Science', 'Data science course covering ML, statistics, and data engineering', true, NOW(), NOW())
ON CONFLICT (career_id) DO NOTHING;

-- ============================================
-- 5. MENTOR TESTS
-- ============================================
INSERT INTO mentor_tests (
  mentor_id, course_name, course_category, score, status, 
  test_duration, total_questions, correct_answers,
  strengths, weaknesses, feedback, attempted_at, completed_at
)
VALUES
  -- Dr. John Smith - Passed Tests
  (
    'mentor_001',
    'Data Structures',
    'DSA',
    85.50,
    'PASSED',
    42,
    20,
    17,
    ARRAY['Strong understanding of algorithms', 'Excellent problem-solving skills', 'Good time complexity analysis'],
    ARRAY['Could improve on graph algorithms'],
    'Excellent performance. Strong fundamentals in data structures.',
    '2025-01-15 10:00:00',
    '2025-01-15 10:42:00'
  ),
  (
    'mentor_001',
    'System Design',
    'System',
    92.00,
    'PASSED',
    38,
    20,
    19,
    ARRAY['Excellent system architecture knowledge', 'Strong scalability understanding', 'Good trade-off analysis'],
    ARRAY['Minor improvements in caching strategies'],
    'Outstanding performance. Ready to mentor students in system design.',
    '2025-01-10 14:00:00',
    '2025-01-10 14:38:00'
  ),
  
  -- Priya Sharma - Passed Tests
  (
    'mentor_002',
    'Java Programming',
    'Programming',
    88.75,
    'PASSED',
    40,
    20,
    18,
    ARRAY['Strong Java fundamentals', 'Good understanding of OOP', 'Excellent code quality'],
    ARRAY['Could improve on advanced Java features'],
    'Great performance. Well-suited to mentor Java programming.',
    '2025-01-12 11:00:00',
    '2025-01-12 11:40:00'
  ),
  (
    'mentor_002',
    'Web Development',
    'Web',
    90.00,
    'PASSED',
    35,
    20,
    18,
    ARRAY['Excellent React knowledge', 'Strong backend understanding', 'Good full-stack skills'],
    ARRAY['Minor improvements in testing'],
    'Excellent performance. Ready to mentor web development.',
    '2025-01-08 15:00:00',
    '2025-01-08 15:35:00'
  ),
  
  -- Rahul Kumar - Passed Tests
  (
    'mentor_003',
    'Machine Learning',
    'Data Science',
    87.25,
    'PASSED',
    43,
    20,
    18,
    ARRAY['Strong ML fundamentals', 'Good understanding of algorithms', 'Excellent practical knowledge'],
    ARRAY['Could improve on deep learning theory'],
    'Great performance. Ready to mentor machine learning.',
    '2025-01-14 09:00:00',
    '2025-01-14 09:43:00'
  ),
  
  -- Ananya Patel - Passed Tests
  (
    'mentor_004',
    'Data Structures',
    'DSA',
    91.50,
    'PASSED',
    36,
    20,
    19,
    ARRAY['Excellent problem-solving', 'Strong algorithm knowledge', 'Fast and accurate'],
    ARRAY['Minor improvements in advanced topics'],
    'Outstanding performance. Excellent for mentoring DSA.',
    '2025-01-11 16:00:00',
    '2025-01-11 16:36:00'
  ),
  
  -- Vikram Singh - Passed Tests
  (
    'mentor_005',
    'Android Development',
    'Mobile',
    83.00,
    'PASSED',
    44,
    20,
    17,
    ARRAY['Strong Android fundamentals', 'Good Kotlin knowledge', 'Practical experience'],
    ARRAY['Could improve on advanced Android features'],
    'Good performance. Ready to mentor Android development.',
    '2025-01-13 13:00:00',
    '2025-01-13 13:44:00'
  ),
  
  -- Failed Test Example (for retry logic)
  (
    'mentor_005',
    'Web Development',
    'Web',
    58.00,
    'FAILED',
    45,
    20,
    12,
    ARRAY['Basic HTML/CSS knowledge'],
    ARRAY['Weak in JavaScript', 'Limited React knowledge', 'Backend concepts unclear'],
    'Test score below passing threshold. Retry available after 7 days. Focus on JavaScript and React fundamentals.',
    '2025-01-05 10:00:00',
    '2025-01-05 10:45:00'
  );

-- ============================================
-- 6. MENTOR COURSE VERIFICATIONS
-- ============================================
-- Note: Adjust course_id values based on actual course IDs in your database
INSERT INTO mentor_course_verifications (
  mentor_id, course_id, test_id, verified_at, verification_score, is_active
)
SELECT 
  mp.user_id,
  c.id as course_id,
  mt.id as test_id,
  mt.completed_at,
  mt.score,
  true
FROM mentor_profiles mp
CROSS JOIN courses c
JOIN mentor_tests mt ON mt.mentor_id = mp.user_id
WHERE 
  (mp.user_id = 'mentor_001' AND c.career_id = 'software-engineer' AND mt.course_name = 'Data Structures' AND mt.status = 'PASSED')
  OR
  (mp.user_id = 'mentor_002' AND c.career_id = 'web-developer' AND mt.course_name = 'Web Development' AND mt.status = 'PASSED')
  OR
  (mp.user_id = 'mentor_003' AND c.career_id = 'data-scientist' AND mt.course_name = 'Machine Learning' AND mt.status = 'PASSED')
  OR
  (mp.user_id = 'mentor_004' AND c.career_id = 'software-engineer' AND mt.course_name = 'Data Structures' AND mt.status = 'PASSED')
  OR
  (mp.user_id = 'mentor_005' AND c.career_id = 'mobile-developer' AND mt.course_name = 'Android Development' AND mt.status = 'PASSED')
ON CONFLICT (mentor_id, course_id) DO NOTHING;

-- ============================================
-- 7. MENTOR COURSES (Mapping)
-- ============================================
INSERT INTO mentor_courses (mentor_id, course_id, created_at)
SELECT 
  mp.user_id,
  c.id,
  NOW()
FROM mentor_profiles mp
CROSS JOIN courses c
WHERE 
  (mp.user_id = 'mentor_001' AND c.career_id = 'software-engineer')
  OR
  (mp.user_id = 'mentor_002' AND c.career_id = 'web-developer')
  OR
  (mp.user_id = 'mentor_003' AND c.career_id = 'data-scientist')
  OR
  (mp.user_id = 'mentor_004' AND c.career_id = 'software-engineer')
  OR
  (mp.user_id = 'mentor_005' AND c.career_id = 'mobile-developer')
ON CONFLICT (mentor_id, course_id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify data insertion:

-- SELECT COUNT(*) FROM mentor_profiles;
-- SELECT COUNT(*) FROM mentor_experiences;
-- SELECT COUNT(*) FROM mentor_tests;
-- SELECT COUNT(*) FROM mentor_course_verifications;
-- SELECT COUNT(*) FROM mentor_courses;




