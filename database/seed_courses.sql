-- Seed department and initial courses for Campus360
USE campus360;

-- 1. Insert Department
INSERT INTO departments (id, name, code)
VALUES (1, 'Computer Science and Engineering', 'CSE')
ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code);

-- 2. Insert Courses
INSERT INTO courses (id, department_id, course_code, course_name)
VALUES 
    (1, 1, 'CSE 1111', 'Structured Programming Language'),
    (2, 1, 'CSE 2215', 'Data Structures and Algorithms')
ON DUPLICATE KEY UPDATE 
    department_id = VALUES(department_id),
    course_code = VALUES(course_code),
    course_name = VALUES(course_name);
