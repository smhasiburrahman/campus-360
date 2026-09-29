-- =====================================================================
-- CAMPUS 360 — BloodHero Schema & Seed Data
-- =====================================================================
-- Intelligent Emergency Blood Matcher & Verified Donor Network
-- Run this script to add BloodHero tables without modifying existing tables.
-- =====================================================================

USE campus360;

-- 1. Student Blood Donors Registry
CREATE TABLE IF NOT EXISTS `blood_donors` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `blood_group` varchar(5) NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `last_donation_date` date NULL DEFAULT NULL,
  `contact_number` varchar(20) NOT NULL,
  `hall_or_area` varchar(255) NULL,
  `total_donations` int(11) NOT NULL DEFAULT 0,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_donor` (`student_id`),
  KEY `idx_blood_group` (`blood_group`),
  KEY `idx_availability` (`is_available`),
  CONSTRAINT `fk_donor_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Emergency Blood Requests / SOS Broadcasts
CREATE TABLE IF NOT EXISTS `blood_requests` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `requester_id` bigint(20) UNSIGNED NOT NULL,
  `patient_name` varchar(255) NOT NULL,
  `blood_group` varchar(5) NOT NULL,
  `units_needed` int(11) NOT NULL DEFAULT 1,
  `units_fulfilled` int(11) NOT NULL DEFAULT 0,
  `hospital_name` varchar(255) NOT NULL,
  `hospital_location` varchar(255) NOT NULL,
  `ward_bed` varchar(255) NULL,
  `urgency_level` varchar(20) NOT NULL DEFAULT 'SAME_DAY',
  `needed_date` datetime NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `patient_condition` varchar(500) NULL,
  `is_ai_verified` tinyint(1) NOT NULL DEFAULT 0,
  `ai_formatted_broadcast` text NULL,
  `status` varchar(20) NOT NULL DEFAULT 'OPEN',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_request_blood_group` (`blood_group`),
  KEY `idx_request_status` (`status`),
  CONSTRAINT `fk_request_requester` FOREIGN KEY (`requester_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Fulfillment & Donation History Log
CREATE TABLE IF NOT EXISTS `blood_donations` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` bigint(20) UNSIGNED NOT NULL,
  `donor_id` bigint(20) UNSIGNED NOT NULL,
  `donation_date` date NOT NULL,
  `notes` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_donation_request` FOREIGN KEY (`request_id`) REFERENCES `blood_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_donation_donor` FOREIGN KEY (`donor_id`) REFERENCES `blood_donors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- Sample Seed Data (For Demonstration & Immediate Testing)
-- =====================================================================

-- Register initial student donors
INSERT INTO `blood_donors` (`student_id`, `blood_group`, `is_available`, `last_donation_date`, `contact_number`, `hall_or_area`, `total_donations`, `notes`)
VALUES
  (1, 'O+', 1, '2026-05-15', '01711002233', 'Campus Student Hall, Madani Ave', 2, 'Available on campus weekdays. Can donate immediately.'),
  (2, 'A+', 1, '2026-01-10', '01822334455', 'Bashundhara R/A, Block C', 1, 'Universal red cell compatible for A and AB patients.'),
  (3, 'B+', 1, NULL, '01933445566', 'Notun Bazar, Vatara', 0, 'First time donor. Ready to help campus peers.')
ON DUPLICATE KEY UPDATE is_available = VALUES(is_available);

-- Post realistic emergency requests
INSERT INTO `blood_requests` (`requester_id`, `patient_name`, `blood_group`, `units_needed`, `units_fulfilled`, `hospital_name`, `hospital_location`, `ward_bed`, `urgency_level`, `needed_date`, `contact_number`, `patient_condition`, `is_ai_verified`, `ai_formatted_broadcast`, `status`)
VALUES
  (
    1, 
    'Tanvir Ahmed', 
    'O+', 
    2, 
    1, 
    'Square Hospital', 
    '18/F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath, Dhaka', 
    'ICU Bed 12', 
    'CRITICAL', 
    DATE_ADD(NOW(), INTERVAL 8 HOUR), 
    '01711998877', 
    'Emergency cardiac bypass surgery scheduled for this evening. 1 bag already arranged, 1 more urgently required.', 
    1, 
    '🚨 *URGENT BLOOD REQUIRED (CRITICAL)* 🚨\n🩸 *Blood Group:* O+\n🏥 *Hospital:* Square Hospital, Panthapath (ICU Bed 12)\n📦 *Units Required:* 2 Bags (1 Fulfilled, 1 Remaining)\n⏰ *Deadline:* Today evening\n📞 *Contact:* 01711998877\n🛡️ *Status:* Verified via Campus 360 BloodHero', 
    'OPEN'
  ),
  (
    2, 
    'Mrs. Selina Begum', 
    'A+', 
    1, 
    0, 
    'Evercare Hospital', 
    'Plot 81, Block E, Bashundhara R/A, Dhaka', 
    'Cabin 408 (Post-Operative)', 
    'SAME_DAY', 
    DATE_ADD(NOW(), INTERVAL 14 HOUR), 
    '01811223344', 
    'Orthopedic surgery recovery. Hemoglobin level dropped below 8.', 
    1, 
    '🚨 *URGENT BLOOD REQUIRED* 🚨\n🩸 *Blood Group:* A+\n🏥 *Hospital:* Evercare Hospital, Bashundhara R/A\n📦 *Units Required:* 1 Bag\n⏰ *Required:* Today before 8 PM\n📞 *Contact:* 01811223344\n🛡️ *Status:* Verified via Campus 360 BloodHero', 
    'OPEN'
  )
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- =====================================================================
-- Rollback snippet (Run below lines only if you want to remove BloodHero):
-- DROP TABLE IF EXISTS `blood_donations`;
-- DROP TABLE IF EXISTS `blood_requests`;
-- DROP TABLE IF EXISTS `blood_donors`;
-- =====================================================================
