-- =====================================================================
-- CAMPUS 360 — CSE Curriculum Seed Data
-- =====================================================================
-- Source: BSCSE_Curriculum__UIU_2026.pdf (Updated March 2026)
-- Total Credits: 141.0
-- Run AFTER course_planner_schema.sql
-- =====================================================================

USE campus360;

-- Ensure CSE department exists
INSERT INTO departments (id, name, code)
VALUES (1, 'Computer Science and Engineering', 'CSE')
ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code);

-- =====================================================================
-- (A) Language Courses (6 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'ENG 1011', 'English I', 3.0, 'language', NULL),
(1, 'ENG 1013', 'English II', 3.0, 'language', NULL);

-- =====================================================================
-- (B) General Education — Compulsory (8 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'SOC 2101', 'Society, Environment and Engineering Ethics', 3.0, 'gen_ed_compulsory', NULL),
(1, 'PMG 4101', 'Project Management', 3.0, 'gen_ed_compulsory', NULL),
(1, 'BDS 1201', 'History of the Emergence of Bangladesh', 2.0, 'gen_ed_compulsory', NULL);

-- =====================================================================
-- (B) General Education — Optional (pick any 3 = 9 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'ECO 4101', 'Economics', 3.0, 'gen_ed_optional', NULL),
(1, 'SOC 4101', 'Introduction to Sociology', 3.0, 'gen_ed_optional', NULL),
(1, 'ACT 2111', 'Financial and Managerial Accounting', 3.0, 'gen_ed_optional', NULL),
(1, 'IPE 3401', 'Industrial and Operational Management', 3.0, 'gen_ed_optional', NULL),
(1, 'GED 4003', 'Technology Entrepreneurship', 3.0, 'gen_ed_optional', NULL),
(1, 'PSY 2101', 'Psychology', 3.0, 'gen_ed_optional', NULL),
(1, 'BDS 2201', 'Bangladesh Studies', 3.0, 'gen_ed_optional', NULL),
(1, 'BAN 2501', 'Bangla', 3.0, 'gen_ed_optional', NULL),
(1, 'SOC 4301', 'Introduction to Anthropology', 3.0, 'gen_ed_optional', NULL),
(1, 'FLN 1101', 'Introduction to a Foreign Language', 3.0, 'gen_ed_optional', NULL),
(1, 'SWL 4101', 'Software and Law', 3.0, 'gen_ed_optional', NULL),
(1, 'BHV 2101', 'Introduction to Behavioral Science', 3.0, 'gen_ed_optional', NULL),
(1, 'URC 1101', 'Life Skill for Success', 3.0, 'gen_ed_optional', NULL);

-- =====================================================================
-- (C) Basic Sciences (7 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'PHY 2105', 'Physics', 3.0, 'basic_science', NULL),
(1, 'PHY 2106', 'Physics Laboratory', 1.0, 'basic_science', NULL),
(1, 'BIO 3105', 'Biology for Engineers', 3.0, 'basic_science', NULL);

-- =====================================================================
-- (D) Mathematics (12 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'MATH 1151', 'Fundamental Calculus', 3.0, 'mathematics', NULL),
(1, 'MATH 2183', 'Calculus and Linear Algebra', 3.0, 'mathematics', NULL),
(1, 'MATH 2201', 'Coordinate Geometry and Vector Analysis', 3.0, 'mathematics', NULL),
(1, 'MATH 2205', 'Probability and Statistics', 3.0, 'mathematics', NULL);

-- =====================================================================
-- (E) Other Engineering (10 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'EEE 2113', 'Electrical Circuits', 3.0, 'other_engineering', NULL),
(1, 'EEE 2123', 'Electronics', 3.0, 'other_engineering', NULL),
(1, 'EEE 2124', 'Electronics Laboratory', 1.0, 'other_engineering', NULL),
(1, 'EEE 4261', 'Green Computing', 3.0, 'other_engineering', NULL);

-- =====================================================================
-- (F) Core Courses (68 credits)
-- =====================================================================

-- Programming (13 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 1110', 'Introduction to Computer Systems', 1.0, 'core', 'programming'),
(1, 'CSE 1111', 'Structured Programming Language', 3.0, 'core', 'programming'),
(1, 'CSE 1112', 'Structured Programming Language Laboratory', 1.0, 'core', 'programming'),
(1, 'CSE 1115', 'Object Oriented Programming', 3.0, 'core', 'programming'),
(1, 'CSE 1116', 'Object Oriented Programming Laboratory', 1.0, 'core', 'programming'),
(1, 'CSE 2118', 'Advanced Object Oriented Programming Laboratory', 1.0, 'core', 'programming'),
(1, 'CSE 4165', 'Web Programming', 3.0, 'core', 'programming');

-- Hardware (11 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 1325', 'Digital Logic Design', 3.0, 'core', 'hardware'),
(1, 'CSE 1326', 'Digital Logic Design Laboratory', 1.0, 'core', 'hardware'),
(1, 'CSE 3313', 'Computer Architecture', 3.0, 'core', 'hardware'),
(1, 'CSE 4325', 'Microprocessors and Microcontrollers', 3.0, 'core', 'hardware'),
(1, 'CSE 4326', 'Microprocessors and Microcontrollers Laboratory', 1.0, 'core', 'hardware');

-- Logics and Algorithms (14 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 2213', 'Discrete Mathematics', 3.0, 'core', 'logics_algorithms'),
(1, 'CSE 2215', 'Data Structure and Algorithms I', 3.0, 'core', 'logics_algorithms'),
(1, 'CSE 2216', 'Data Structure and Algorithms I Laboratory', 1.0, 'core', 'logics_algorithms'),
(1, 'CSE 2217', 'Data Structure and Algorithms II', 3.0, 'core', 'logics_algorithms'),
(1, 'CSE 2218', 'Data Structure and Algorithms II Laboratory', 1.0, 'core', 'logics_algorithms'),
(1, 'CSE 2233', 'Theory of Computation', 3.0, 'core', 'logics_algorithms');

-- Software (8 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 3411', 'System Analysis and Design', 3.0, 'core', 'software'),
(1, 'CSE 3412', 'System Analysis and Design Laboratory', 1.0, 'core', 'software'),
(1, 'CSE 3421', 'Software Engineering', 3.0, 'core', 'software'),
(1, 'CSE 3422', 'Software Engineering Laboratory', 1.0, 'core', 'software');

-- Systems (22 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4531', 'Computer Security', 3.0, 'core', 'systems'),
(1, 'CSE 3521', 'Database Management Systems', 3.0, 'core', 'systems'),
(1, 'CSE 3522', 'Database Management Systems Laboratory', 1.0, 'core', 'systems'),
(1, 'CSE 4509', 'Operating Systems', 3.0, 'core', 'systems'),
(1, 'CSE 4510', 'Operating Systems Laboratory', 1.0, 'core', 'systems'),
(1, 'CSE 3711', 'Computer Networks', 3.0, 'core', 'systems'),
(1, 'CSE 3712', 'Computer Networks Laboratory', 1.0, 'core', 'systems'),
(1, 'CSE 3811', 'Artificial Intelligence', 3.0, 'core', 'systems'),
(1, 'CSE 3812', 'Artificial Intelligence Laboratory', 1.0, 'core', 'systems'),
(1, 'CSE 4889', 'Machine Learning', 3.0, 'core', 'systems');

-- =====================================================================
-- (G) Elective Courses (pick any 5 = 15 credits)
-- =====================================================================

-- i. Network and Cyber Security
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4121', 'Security Monitoring', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4759', 'Wireless and Cellular Communication', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4123', 'Software and Application Security', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4125', 'Ethical Hacking and Network Defense', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4127', 'Cloud Security', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4129', 'Digital Forensics', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4131', 'Internet of Things (IoT) Security', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 3715', 'Data Communication', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4793', 'Advanced Network Services and Management', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4783', 'Cryptography', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4777', 'Network Security', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4943', 'Web Application Security', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 4949', 'IT Audit: Concepts and Practice', 3.0, 'elective', 'Network and Cyber Security'),
(1, 'CSE 3542', 'Industry Internship', 3.0, 'elective', 'Network and Cyber Security');

-- ii. Software Engineering
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4435', 'Software Architecture', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4181', 'Mobile Application Development', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4495', 'Software Testing and Quality Assurance', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4587', 'Cloud Computing', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4567', 'Advanced Database Management Systems', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4413', 'Virtual Reality/Augmented Reality System Design', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4611', 'Compiler Design', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4945', 'UI: Concepts and Design', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4871', 'Data Analytics', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4133', 'Business Intelligence', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4451', 'Human Computer Interaction', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4485', 'Game Design and Development', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4519', 'Distributed Systems', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4523', 'Simulation and Modeling', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4621', 'Computer Graphics', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4601', 'Mathematical Analysis for Computer Science', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4633', 'Basic Graph Theory', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4655', 'Algorithm Engineering', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4547', 'Multimedia Systems Design', 3.0, 'elective', 'Software Engineering'),
(1, 'CSE 4613', 'Computational Geometry', 3.0, 'elective', 'Software Engineering');

-- iii. Embedded System and Robotics
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4379', 'Real-time Embedded Systems', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4337', 'Robotics', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4399', 'Special Topics on Embedded System and Robotics', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4327', 'VLSI Design', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4853', 'Internet of Things (IoT)', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4819', 'AI for Autonomous Systems', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4813', 'Deep Learning', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4815', 'Large Language Model and Generative AI', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4329', 'Digital System Design', 3.0, 'elective', 'Embedded System and Robotics'),
(1, 'CSE 4397', 'Interfacing', 3.0, 'elective', 'Embedded System and Robotics');

-- iv. Business System Engineering
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4891', 'Data Mining', 3.0, 'elective', 'Business System Engineering'),
(1, 'CSE 4823', 'Data Driven Decision Making', 3.0, 'elective', 'Business System Engineering'),
(1, 'CSE 4817', 'Big Data Analytics', 3.0, 'elective', 'Business System Engineering'),
(1, 'CSE 4821', 'Digital Marketing', 3.0, 'elective', 'Business System Engineering'),
(1, 'CSE 4941', 'Enterprise Systems: Concepts and Practice', 3.0, 'elective', 'Business System Engineering'),
(1, 'CSE 4765', 'Electronic Commerce', 3.0, 'elective', 'Business System Engineering');

-- v. AI and Data Science
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4811', 'Natural Language Processing', 3.0, 'elective', 'AI and Data Science'),
(1, 'CSE 4893', 'Introduction to Bioinformatics', 3.0, 'elective', 'AI and Data Science'),
(1, 'CSE 4883', 'Digital Image Processing', 3.0, 'elective', 'AI and Data Science'),
(1, 'CSE 4825', 'Speech Processing and Recognition', 3.0, 'elective', 'AI and Data Science');

-- =====================================================================
-- (H) Final Year Design Project (6 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(1, 'CSE 4000A', 'Final Year Design Project - I', 2.0, 'capstone', NULL),
(1, 'CSE 4000B', 'Final Year Design Project - II', 2.0, 'capstone', NULL),
(1, 'CSE 4000C', 'Final Year Design Project - III', 2.0, 'capstone', NULL);

-- =====================================================================
-- PREREQUISITES (from Course Sequence in curriculum)
-- =====================================================================
-- Using variables to reference course IDs by course_code

SET @dept = 1;

-- Helper: we'll use subqueries to reference course IDs
-- ENG 1013 requires ENG 1011
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'ENG 1013'
  AND p.department_id = @dept AND p.course_code = 'ENG 1011';

-- CSE 1111 requires CSE 1110
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 1111'
  AND p.department_id = @dept AND p.course_code = 'CSE 1110';

-- CSE 1112 requires CSE 1110
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 1112'
  AND p.department_id = @dept AND p.course_code = 'CSE 1110';

-- MATH 2183 requires MATH 1151
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'MATH 2183'
  AND p.department_id = @dept AND p.course_code = 'MATH 1151';

-- CSE 2215 requires CSE 1111
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2215'
  AND p.department_id = @dept AND p.course_code = 'CSE 1111';

-- CSE 2216 requires CSE 1112
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2216'
  AND p.department_id = @dept AND p.course_code = 'CSE 1112';

-- MATH 2201 requires MATH 1151
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'MATH 2201'
  AND p.department_id = @dept AND p.course_code = 'MATH 1151';

-- CSE 1115 requires CSE 2215
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 1115'
  AND p.department_id = @dept AND p.course_code = 'CSE 2215';

-- CSE 1116 requires CSE 2216
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 1116'
  AND p.department_id = @dept AND p.course_code = 'CSE 2216';

-- MATH 2205 requires MATH 1151
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'MATH 2205'
  AND p.department_id = @dept AND p.course_code = 'MATH 1151';

-- CSE 2217 requires CSE 2215
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2217'
  AND p.department_id = @dept AND p.course_code = 'CSE 2215';

-- CSE 2218 requires CSE 2216
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2218'
  AND p.department_id = @dept AND p.course_code = 'CSE 2216';

-- CSE 3521 requires CSE 2215
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3521'
  AND p.department_id = @dept AND p.course_code = 'CSE 2215';

-- CSE 3522 requires CSE 2216
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3522'
  AND p.department_id = @dept AND p.course_code = 'CSE 2216';

-- CSE 4165 requires CSE 1115
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4165'
  AND p.department_id = @dept AND p.course_code = 'CSE 1115';

-- CSE 4165 requires CSE 1116
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4165'
  AND p.department_id = @dept AND p.course_code = 'CSE 1116';

-- EEE 2123 requires EEE 2113
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'EEE 2123'
  AND p.department_id = @dept AND p.course_code = 'EEE 2113';

-- CSE 3313 requires CSE 1325
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3313'
  AND p.department_id = @dept AND p.course_code = 'CSE 1325';

-- CSE 2118 requires CSE 1116
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2118'
  AND p.department_id = @dept AND p.course_code = 'CSE 1116';

-- CSE 3411 requires CSE 3521
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3411'
  AND p.department_id = @dept AND p.course_code = 'CSE 3521';

-- CSE 3412 requires CSE 3522
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3412'
  AND p.department_id = @dept AND p.course_code = 'CSE 3522';

-- CSE 4325 requires CSE 3313
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4325'
  AND p.department_id = @dept AND p.course_code = 'CSE 3313';

-- CSE 4326 requires EEE 2124
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4326'
  AND p.department_id = @dept AND p.course_code = 'EEE 2124';

-- CSE 3421 requires CSE 3411
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3421'
  AND p.department_id = @dept AND p.course_code = 'CSE 3411';

-- CSE 3422 requires CSE 3412
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3422'
  AND p.department_id = @dept AND p.course_code = 'CSE 3412';

-- CSE 3811 requires MATH 2205
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3811'
  AND p.department_id = @dept AND p.course_code = 'MATH 2205';

-- CSE 3811 requires CSE 2217
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3811'
  AND p.department_id = @dept AND p.course_code = 'CSE 2217';

-- CSE 3812 requires MATH 2205
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3812'
  AND p.department_id = @dept AND p.course_code = 'MATH 2205';

-- CSE 3812 requires CSE 2218
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3812'
  AND p.department_id = @dept AND p.course_code = 'CSE 2218';

-- PMG 4101 requires CSE 3411
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'PMG 4101'
  AND p.department_id = @dept AND p.course_code = 'CSE 3411';

-- CSE 3711 requires CSE 2217
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3711'
  AND p.department_id = @dept AND p.course_code = 'CSE 2217';

-- CSE 4889 requires CSE 3811
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4889'
  AND p.department_id = @dept AND p.course_code = 'CSE 3811';

-- CSE 4889 requires CSE 3812
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4889'
  AND p.department_id = @dept AND p.course_code = 'CSE 3812';

-- CSE 4889 requires MATH 2183
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4889'
  AND p.department_id = @dept AND p.course_code = 'MATH 2183';

-- CSE 4509 requires CSE 2217
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4509'
  AND p.department_id = @dept AND p.course_code = 'CSE 2217';

-- CSE 4509 requires CSE 3313
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4509'
  AND p.department_id = @dept AND p.course_code = 'CSE 3313';

-- CSE 4510 requires CSE 2218
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4510'
  AND p.department_id = @dept AND p.course_code = 'CSE 2218';

-- CSE 4531 requires CSE 3711
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4531'
  AND p.department_id = @dept AND p.course_code = 'CSE 3711';

-- CSE 4531 requires CSE 4509
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4531'
  AND p.department_id = @dept AND p.course_code = 'CSE 4509';

-- CSE 4000B requires CSE 4000A
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4000B'
  AND p.department_id = @dept AND p.course_code = 'CSE 4000A';

-- CSE 4000C requires CSE 4000A and CSE 4000B
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4000C'
  AND p.department_id = @dept AND p.course_code = 'CSE 4000A';

INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 4000C'
  AND p.department_id = @dept AND p.course_code = 'CSE 4000B';

-- =====================================================================
-- SPECIALIZATIONS
-- =====================================================================
INSERT INTO curriculum_specializations (department_id, name, min_courses, description) VALUES
(1, 'Network and Cyber Security', 4, 'Focus on network defense, cryptography, IoT security, and digital forensics.'),
(1, 'Software Engineering', 4, 'Focus on software architecture, mobile development, cloud computing, and testing.'),
(1, 'Embedded System and Robotics', 4, 'Focus on real-time systems, robotics, VLSI design, and IoT.'),
(1, 'Business System Engineering', 4, 'Focus on business intelligence, data mining, digital marketing, and enterprise systems.'),
(1, 'AI and Data Science', 4, 'Focus on NLP, deep learning, generative AI, image processing, and data analytics.');

-- =====================================================================
-- SPECIALIZATION-COURSE MAPPINGS
-- =====================================================================
-- Note: Some courses appear in multiple specializations (e.g., CSE 4949, CSE 3542)
-- We map based on the curriculum PDF exactly

-- Network and Cyber Security
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Network and Cyber Security'
  AND c.department_id = @dept AND c.course_code IN (
    'CSE 4121', 'CSE 4759', 'CSE 4123', 'CSE 4125', 'CSE 4127', 'CSE 4129',
    'CSE 4131', 'CSE 3715', 'CSE 4793', 'CSE 4783', 'CSE 4777', 'CSE 4943',
    'CSE 4949', 'CSE 3542'
);

-- Software Engineering
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Software Engineering'
  AND c.department_id = @dept AND c.course_code IN (
    'CSE 4435', 'CSE 4181', 'CSE 4495', 'CSE 4587', 'CSE 4567', 'CSE 4413',
    'CSE 4611', 'CSE 4123', 'CSE 4945', 'CSE 4871', 'CSE 4133', 'CSE 4451',
    'CSE 4485', 'CSE 4519', 'CSE 4523', 'CSE 4621', 'CSE 4601', 'CSE 4633',
    'CSE 4655', 'CSE 4547', 'CSE 4613', 'CSE 4949', 'CSE 3542'
);

-- Embedded System and Robotics
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Embedded System and Robotics'
  AND c.department_id = @dept AND c.course_code IN (
    'CSE 4379', 'CSE 4337', 'CSE 4399', 'CSE 4327', 'CSE 4853', 'CSE 4819',
    'CSE 4813', 'CSE 4815', 'CSE 4329', 'CSE 4397', 'CSE 3542'
);

-- Business System Engineering
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Business System Engineering'
  AND c.department_id = @dept AND c.course_code IN (
    'CSE 4133', 'CSE 4891', 'CSE 4871', 'CSE 4823', 'CSE 4817', 'CSE 4821',
    'CSE 4945', 'CSE 4451', 'CSE 4941', 'CSE 4765', 'CSE 4949', 'CSE 3542'
);

-- AI and Data Science
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'AI and Data Science'
  AND c.department_id = @dept AND c.course_code IN (
    'CSE 4811', 'CSE 4813', 'CSE 4815', 'CSE 4893', 'CSE 4883', 'CSE 4819',
    'CSE 4891', 'CSE 4871', 'CSE 4817', 'CSE 4825', 'CSE 4949', 'CSE 3542'
);
