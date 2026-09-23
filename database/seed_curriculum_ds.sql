-- =====================================================================
-- CAMPUS 360 — Data Science Curriculum Seed Data
-- =====================================================================
-- Source: Data_Science_Curriculum-233.pdf
-- Total Credits: 138.0
-- Run AFTER course_planner_schema.sql and seed_curriculum_cse.sql
-- =====================================================================

USE campus360;

-- Ensure Data Science department exists
INSERT INTO departments (id, name, code)
VALUES (2, 'Data Science', 'DS')
ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code);

SET @dept = 2;

-- =====================================================================
-- I. General Education
-- =====================================================================

-- A. Language (6 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'ENG 1011', 'English I', 3.0, 'language', NULL),
(@dept, 'ENG 1013', 'English II', 3.0, 'language', NULL);

-- B. Sciences (7 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'PHY 2105', 'Physics', 3.0, 'basic_science', NULL),
(@dept, 'PHY 2106', 'Physics Laboratory', 1.0, 'basic_science', NULL),
(@dept, 'BIO 3107', 'Biology', 3.0, 'basic_science', NULL);

-- C. Humanities Compulsory (2 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'BDS 1201', 'History of the Emergence of Bangladesh', 2.0, 'gen_ed_compulsory', NULL);

-- D. Humanities Optional (any 3 = 9 credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'SOC 2102', 'Society, Environment and Computing Ethics', 3.0, 'gen_ed_optional', NULL),
(@dept, 'TEC 2499', 'Technology Entrepreneurship', 3.0, 'gen_ed_optional', NULL),
(@dept, 'ECO 4101', 'Economics', 3.0, 'gen_ed_optional', NULL),
(@dept, 'PMG 4101', 'Project Management', 3.0, 'gen_ed_optional', NULL),
(@dept, 'ACT 2111', 'Financial and Managerial Accounting', 3.0, 'gen_ed_optional', NULL),
(@dept, 'SOC 4101', 'Introduction to Sociology', 3.0, 'gen_ed_optional', NULL),
(@dept, 'IPE 3401', 'Industrial and Operational Management', 3.0, 'gen_ed_optional', NULL),
(@dept, 'BAN 2501', 'Bangla', 3.0, 'gen_ed_optional', NULL),
(@dept, 'URC 1101', 'Life Skills for Success', 3.0, 'gen_ed_optional', NULL),
(@dept, 'SOC 4301', 'Introduction to Anthropology', 3.0, 'gen_ed_optional', NULL),
(@dept, 'FLN 1101', 'Introduction to a Foreign Language', 3.0, 'gen_ed_optional', NULL),
(@dept, 'SWL 4101', 'Software and Law', 3.0, 'gen_ed_optional', NULL),
(@dept, 'BHV 2101', 'Introduction to Behavioral Science', 3.0, 'gen_ed_optional', NULL),
(@dept, 'MKT 4313', 'Digital Marketing', 3.0, 'gen_ed_optional', NULL),
(@dept, 'PSY 2101', 'Psychology', 3.0, 'gen_ed_optional', NULL);

-- =====================================================================
-- II. Mathematics (12 Credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'MATH 1151', 'Fundamental Calculus', 3.0, 'mathematics', NULL),
(@dept, 'MATH 1153', 'Advanced Calculus', 3.0, 'mathematics', NULL),
(@dept, 'MATH 2107', 'Linear Algebra', 3.0, 'mathematics', NULL),
(@dept, 'MATH 2205', 'Probability and Statistics', 3.0, 'mathematics', NULL);

-- =====================================================================
-- III. Core Courses
-- =====================================================================

-- A. Programming (8 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 1501', 'Programming for Data Science', 3.0, 'core', 'programming'),
(@dept, 'DS 1502', 'Programming for Data Science Laboratory', 1.0, 'core', 'programming'),
(@dept, 'DS 1115', 'Object Oriented Programming for Data Science', 3.0, 'core', 'programming'),
(@dept, 'DS 1116', 'Object Oriented Programming for Data Science Laboratory', 1.0, 'core', 'programming');

-- B. Foundations in Statistics (9 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 3101', 'Advanced Probability and Statistics', 3.0, 'core', 'statistics'),
(@dept, 'DS 4523', 'Simulation and Modelling', 3.0, 'core', 'statistics'),
(@dept, 'DS 2251', 'Bayesian Statistics', 3.0, 'core', 'statistics');

-- C. Foundations in Computing (15 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'CSE 2213', 'Discrete Mathematics', 3.0, 'core', 'computing'),
(@dept, 'CSE 2215', 'Data Structures and Algorithms I', 3.0, 'core', 'computing'),
(@dept, 'CSE 2216', 'Data Structures and Algorithms I Laboratory', 1.0, 'core', 'computing'),
(@dept, 'CSE 2217', 'Data Structures and Algorithms II', 3.0, 'core', 'computing'),
(@dept, 'CSE 2218', 'Data Structures and Algorithms II Laboratory', 1.0, 'core', 'computing'),
(@dept, 'CSE 3521', 'Database Management Systems', 3.0, 'core', 'computing'),
(@dept, 'CSE 3522', 'Database Management Systems Laboratory', 1.0, 'core', 'computing');

-- D. Systems Optional (any 2 = 6 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'CSE 4511', 'Operating Systems and Scripting', 3.0, 'ds_systems_optional', NULL),
(@dept, 'CSE 3411', 'System Analysis and Design', 3.0, 'ds_systems_optional', NULL),
(@dept, 'CSE 3421', 'Software Engineering', 3.0, 'ds_systems_optional', NULL),
(@dept, 'CSE 4197', 'Introduction to Internet of Things (IoT)', 3.0, 'ds_systems_optional', NULL),
(@dept, 'CSE 4587', 'Cloud Computing', 3.0, 'ds_systems_optional', NULL),
(@dept, 'CSE 4531', 'Computer Security', 3.0, 'ds_systems_optional', NULL);

-- E. Data Science and Analytics (34 Credits)
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 1101', 'Fundamentals of Data Science', 3.0, 'core', 'data_science'),
(@dept, 'DS 3885', 'Data Wrangling', 3.0, 'core', 'data_science'),
(@dept, 'DS 4217', 'Data Privacy and Ethics', 3.0, 'core', 'data_science'),
(@dept, 'DS 3521', 'Data Visualization', 3.0, 'core', 'data_science'),
(@dept, 'DS 3522', 'Data Visualization Laboratory', 1.0, 'core', 'data_science'),
(@dept, 'DS 4891', 'Data Analytics', 3.0, 'core', 'data_science'),
(@dept, 'DS 4892', 'Data Analytics Laboratory', 1.0, 'core', 'data_science'),
(@dept, 'DS 4889', 'Machine Learning', 3.0, 'core', 'data_science'),
(@dept, 'DS 4817', 'Big Data', 3.0, 'core', 'data_science'),
(@dept, 'DS 4211', 'Deep Learning', 3.0, 'core', 'data_science'),
(@dept, 'DS 4491', 'Machine Learning Systems Design', 3.0, 'core', 'data_science'),
(@dept, 'DS 3881', 'Regression and Time Series Analysis', 3.0, 'core', 'data_science'),
(@dept, 'DS 3120', 'Technical Report Writing and Presentation', 2.0, 'core', 'data_science');

-- =====================================================================
-- IV. Option-I: Advanced Data Science and Computing (pick any 4 = 12 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 4213', 'Natural Language Processing', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4215', 'Social Media Analytics', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4219', 'Game Theory', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4221', 'Complex Systems', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4223', 'Recommender Systems', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4225', 'Probabilistic Graphical Models', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4227', 'Mathematical Optimization', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4229', 'Data Warehousing', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'CSE 4337', 'Robotics', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'CSE 3811', 'Artificial Intelligence', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4821', 'Generative Machine Learning', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4823', 'Reinforcement Learning', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4825', 'Deep Learning for Computer Vision', 3.0, 'ds_option_i', 'Advanced Data Science'),
(@dept, 'DS 4921', 'Special Topic I', 3.0, 'ds_option_i', 'Advanced Data Science');

-- =====================================================================
-- V. Option-II: Application Area (pick any 4 = 12 credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 4111', 'Genomic Data Analysis', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4113', 'Spatial Analytics', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4115', 'Marketing Analytics', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4117', 'Computational Finance', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4119', 'Health Informatics', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4121', 'Introduction to Actuarial Science', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4123', 'Human Computer Interaction', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4125', 'Medical Image and Signal Processing', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4127', 'Computational Epidemiology', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4129', 'Remote Sensing of Environment', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4131', 'Precision Agriculture', 3.0, 'ds_option_ii', 'Application Area'),
(@dept, 'DS 4923', 'Special Topic II', 3.0, 'ds_option_ii', 'Application Area');

-- =====================================================================
-- VI. Capstone Project (6 Credits)
-- =====================================================================
INSERT INTO curriculum_courses (department_id, course_code, course_name, credits, category, sub_category) VALUES
(@dept, 'DS 4000A', 'Capstone Project I', 2.0, 'capstone', NULL),
(@dept, 'DS 4000B', 'Capstone Project II', 2.0, 'capstone', NULL),
(@dept, 'DS 4000C', 'Capstone Project III', 2.0, 'capstone', NULL);

-- =====================================================================
-- PREREQUISITES (from trimester-wise distribution in curriculum)
-- =====================================================================

-- DS 1115 after DS 1501 (OOP after Programming)
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 1115'
  AND p.department_id = @dept AND p.course_code = 'DS 1501';

-- DS 1116 after DS 1502
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 1116'
  AND p.department_id = @dept AND p.course_code = 'DS 1502';

-- ENG 1013 after ENG 1011
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'ENG 1013'
  AND p.department_id = @dept AND p.course_code = 'ENG 1011';

-- MATH 1153 after MATH 1151
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'MATH 1153'
  AND p.department_id = @dept AND p.course_code = 'MATH 1151';

-- CSE 2215 after DS 1115
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2215'
  AND p.department_id = @dept AND p.course_code = 'DS 1115';

-- CSE 2216 after DS 1116
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2216'
  AND p.department_id = @dept AND p.course_code = 'DS 1116';

-- CSE 2217 after CSE 2215
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2217'
  AND p.department_id = @dept AND p.course_code = 'CSE 2215';

-- CSE 2218 after CSE 2216
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 2218'
  AND p.department_id = @dept AND p.course_code = 'CSE 2216';

-- DS 3885 after CSE 2217 (Data Wrangling after DSA II)
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 3885'
  AND p.department_id = @dept AND p.course_code = 'CSE 2217';

-- MATH 2205 after MATH 1151
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'MATH 2205'
  AND p.department_id = @dept AND p.course_code = 'MATH 1151';

-- CSE 3521 after CSE 2215
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3521'
  AND p.department_id = @dept AND p.course_code = 'CSE 2215';

-- CSE 3522 after CSE 2216
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'CSE 3522'
  AND p.department_id = @dept AND p.course_code = 'CSE 2216';

-- DS 3101 after MATH 2205
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 3101'
  AND p.department_id = @dept AND p.course_code = 'MATH 2205';

-- DS 4889 (ML) after DS 3101
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 4889'
  AND p.department_id = @dept AND p.course_code = 'DS 3101';

-- DS 4211 (Deep Learning) after DS 4889
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 4211'
  AND p.department_id = @dept AND p.course_code = 'DS 4889';

-- DS 4000B after DS 4000A
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 4000B'
  AND p.department_id = @dept AND p.course_code = 'DS 4000A';

-- DS 4000C after DS 4000B
INSERT INTO curriculum_prerequisites (course_id, prerequisite_id)
SELECT c.id, p.id FROM curriculum_courses c, curriculum_courses p
WHERE c.department_id = @dept AND c.course_code = 'DS 4000C'
  AND p.department_id = @dept AND p.course_code = 'DS 4000B';

-- =====================================================================
-- SPECIALIZATIONS (DS has option tracks, not named specializations)
-- =====================================================================
INSERT INTO curriculum_specializations (department_id, name, min_courses, description) VALUES
(@dept, 'Advanced Data Science and Computing', 4, 'Option-I track: NLP, recommender systems, reinforcement learning, generative ML, and more.'),
(@dept, 'Application Area', 4, 'Option-II track: Genomics, finance, health informatics, spatial analytics, precision agriculture, and more.');

-- Option-I course mapping
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Advanced Data Science and Computing'
  AND c.department_id = @dept AND c.course_code IN (
    'DS 4213', 'DS 4215', 'DS 4219', 'DS 4221', 'DS 4223', 'DS 4225',
    'DS 4227', 'DS 4229', 'CSE 4337', 'CSE 3811', 'DS 4821', 'DS 4823',
    'DS 4825', 'DS 4921'
);

-- Option-II course mapping
INSERT INTO specialization_courses (specialization_id, course_id)
SELECT s.id, c.id FROM curriculum_specializations s, curriculum_courses c
WHERE s.department_id = @dept AND s.name = 'Application Area'
  AND c.department_id = @dept AND c.course_code IN (
    'DS 4111', 'DS 4113', 'DS 4115', 'DS 4117', 'DS 4119', 'DS 4121',
    'DS 4123', 'DS 4125', 'DS 4127', 'DS 4129', 'DS 4131', 'DS 4923'
);
