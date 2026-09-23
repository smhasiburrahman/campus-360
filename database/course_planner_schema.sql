-- =====================================================================
-- CAMPUS 360 — Course Planner Schema
-- =====================================================================
-- These tables store curriculum data and AI-generated course plans.
-- Run AFTER the main campus360_schema.sql
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- SECTION 1: CURRICULUM DATA (feeds the AI prompt)
-- =====================================================================

CREATE TABLE IF NOT EXISTS curriculum_courses (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_id   INT UNSIGNED NOT NULL,
    course_code     VARCHAR(20) NOT NULL,
    course_name     VARCHAR(200) NOT NULL,
    credits         DECIMAL(3,1) NOT NULL,
    category        VARCHAR(50) NOT NULL,           -- e.g., 'core', 'elective', 'gen_ed_compulsory', etc.
    sub_category    VARCHAR(100) NULL,              -- e.g., 'programming', 'hardware', 'AI & Data Science'
    description     TEXT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cc_department FOREIGN KEY (department_id) REFERENCES departments(id),
    UNIQUE KEY uq_cc_dept_code (department_id, course_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS curriculum_prerequisites (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id           INT UNSIGNED NOT NULL,
    prerequisite_id     INT UNSIGNED NOT NULL,
    CONSTRAINT fk_cp_course FOREIGN KEY (course_id) REFERENCES curriculum_courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_prereq FOREIGN KEY (prerequisite_id) REFERENCES curriculum_courses(id) ON DELETE CASCADE,
    UNIQUE KEY uq_cp_pair (course_id, prerequisite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS curriculum_specializations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_id   INT UNSIGNED NOT NULL,
    name            VARCHAR(150) NOT NULL,
    min_courses     TINYINT UNSIGNED NOT NULL DEFAULT 4,
    description     TEXT NULL,
    CONSTRAINT fk_cs_department FOREIGN KEY (department_id) REFERENCES departments(id),
    UNIQUE KEY uq_cs_dept_name (department_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS specialization_courses (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    specialization_id   INT UNSIGNED NOT NULL,
    course_id           INT UNSIGNED NOT NULL,
    CONSTRAINT fk_sc_spec FOREIGN KEY (specialization_id) REFERENCES curriculum_specializations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sc_course FOREIGN KEY (course_id) REFERENCES curriculum_courses(id) ON DELETE CASCADE,
    UNIQUE KEY uq_sc_pair (specialization_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 2: AI-GENERATED COURSE PLANS
-- =====================================================================

CREATE TABLE IF NOT EXISTS course_plans (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id          BIGINT UNSIGNED NOT NULL,
    department_id       INT UNSIGNED NOT NULL,
    specialization_id   INT UNSIGNED NULL,
    current_trimester   TINYINT UNSIGNED NOT NULL DEFAULT 1,
    workload_pref       ENUM('light','balanced','heavy') NOT NULL DEFAULT 'balanced',
    interest_text       TEXT NULL,
    total_credits       DECIMAL(4,1) NOT NULL,
    plan_summary        TEXT NULL,
    ai_model_used       VARCHAR(100) NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_department FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT fk_plan_spec FOREIGN KEY (specialization_id) REFERENCES curriculum_specializations(id) ON DELETE SET NULL,
    INDEX idx_plan_student (student_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_plan_trimesters (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_id             BIGINT UNSIGNED NOT NULL,
    trimester_number    TINYINT UNSIGNED NOT NULL,
    total_credits       DECIMAL(3,1) NOT NULL,
    reasoning           TEXT NULL,
    CONSTRAINT fk_cpt_plan FOREIGN KEY (plan_id) REFERENCES course_plans(id) ON DELETE CASCADE,
    UNIQUE KEY uq_cpt_plan_tri (plan_id, trimester_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS course_plan_items (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_trimester_id       BIGINT UNSIGNED NOT NULL,
    curriculum_course_id    INT UNSIGNED NOT NULL,
    course_code             VARCHAR(20) NOT NULL,
    course_name             VARCHAR(200) NOT NULL,
    credits                 DECIMAL(3,1) NOT NULL,
    category                VARCHAR(50) NOT NULL,
    CONSTRAINT fk_cpi_trimester FOREIGN KEY (plan_trimester_id) REFERENCES course_plan_trimesters(id) ON DELETE CASCADE,
    CONSTRAINT fk_cpi_course FOREIGN KEY (curriculum_course_id) REFERENCES curriculum_courses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF COURSE PLANNER SCHEMA
-- =====================================================================
