-- =====================================================================
-- CAMPUS 360 — MySQL Schema
-- =====================================================================
-- Engine: InnoDB | Charset: utf8mb4
--
-- DESIGN NOTES (read before importing):
--
-- 1. ACCOUNT TYPES: students, clubs, university_authority, and drivers
--    are separate tables, each with their own login (email + password).
--    "admin" is a role inside university_authority (role='admin'),
--    since admins are university-authority staff with elevated rights
--    over post moderation (edit/delete any post, resolve reports,
--    manage complaints/lost&found/announcements).
--
-- 2. POST CONTENT TABLES are fully separate per type (lost_found_posts,
--    announcements, events, complaints, marketplace_listings,
--    study_sessions, material_shares) — matching your separate
--    frontend pages per type.
--
-- 3. SHARED BEHAVIOR (like/dislike, comments, bookmarks, reports,
--    images) is common to every post type per your spec, so instead
--    of duplicating those tables 7x, they live in shared "polymorphic"
--    tables keyed by (post_type, post_id):
--        post_images, post_likes, post_comments, post_bookmarks,
--        post_reports
--    TRADE-OFF: MySQL cannot enforce a real FOREIGN KEY across a
--    polymorphic (post_type, post_id) pair, since post_id could point
--    to any one of 7 different tables depending on post_type. Referential
--    integrity for these must be enforced at the application layer
--    (or via triggers — a starter trigger is included for complaints).
--    If you'd rather have hard FK guarantees, the alternative is
--    fully separate like/comment/bookmark/report tables per post type
--    (7x more tables) — happy to generate that variant if you prefer it.
--
-- 4. OWNER fields on content tables that can be posted by more than one
--    account type (e.g. announcements/events by club OR authority) use
--    the same (owner_type, owner_id) polymorphic pattern, for the same
--    reason as #3.
--
-- 5. SOFT DELETE: all post/content tables use is_deleted + deleted_at
--    rather than hard deletes, so bookmarks/reports/comments referencing
--    a deleted post remain intact and auditable. Adjust to hard deletes
--    if you don't need that history.
--
-- 6. COMPLAINTS: "upvote" / "downvote" reuses the shared post_likes
--    table (reaction = 'like' acts as upvote, 'dislike' as downvote).
--    A trigger auto-transitions a complaint from 'not_approved' to
--    'pending' once its upvote count crosses app_settings.complaint_upvote_threshold.
--
-- 7. SHUTTLE TRACKING: shuttle_trips stores the *latest* known location
--    for fast "where's my shuttle" lookups; shuttle_locations stores the
--    full location history/log (high write volume, indexed by trip+time).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- SECTION 1: REFERENCE / LOOKUP TABLES
-- =====================================================================

CREATE TABLE departments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(20)  NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE courses (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_id   INT UNSIGNED NOT NULL,
    course_code     VARCHAR(20)  NOT NULL,
    course_name     VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_courses_dept_code (department_id, course_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE trimesters (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,          -- e.g. 'Spring 2026'
    start_date      DATE NULL,
    end_date        DATE NULL,
    UNIQUE KEY uq_trimesters_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE app_settings (
    setting_key     VARCHAR(100) PRIMARY KEY,
    setting_value   VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('complaint_upvote_threshold', '10');

-- =====================================================================
-- SECTION 2: ACCOUNTS (each with its own login)
-- =====================================================================

CREATE TABLE students (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    university_id       VARCHAR(50)  NOT NULL,      -- provided during onboarding
    full_name           VARCHAR(150) NOT NULL,
    department_id       INT UNSIGNED NULL,
    gender              ENUM('male','female','other','prefer_not_to_say') NULL,
    profile_picture_url VARCHAR(500) NULL,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    UNIQUE KEY uq_students_email (email),
    UNIQUE KEY uq_students_university_id (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clubs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    club_name       VARCHAR(150) NOT NULL,
    description     TEXT NULL,
    logo_url        VARCHAR(500) NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_clubs_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE university_authority (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    designation     VARCHAR(150) NULL,
    role            ENUM('staff','admin') NOT NULL DEFAULT 'staff',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_authority_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE drivers (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(30) NULL,
    license_no      VARCHAR(50) NULL,
    -- registered by university authority:
    registered_by   BIGINT UNSIGNED NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_drivers_registered_by FOREIGN KEY (registered_by) REFERENCES university_authority(id) ON DELETE SET NULL,
    UNIQUE KEY uq_drivers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 3: POST TYPE 1 — LOST & FOUND
-- =====================================================================

CREATE TABLE lost_found_posts (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id              BIGINT UNSIGNED NOT NULL,       -- post owner
    post_kind               ENUM('lost','found') NOT NULL,
    description             TEXT NOT NULL,
    status                  ENUM('found','not_found') NOT NULL DEFAULT 'not_found',
    -- who last changed status: post owner (student) or authority
    status_updated_by_type  ENUM('student','authority') NULL,
    status_updated_by_id    BIGINT UNSIGNED NULL,
    status_updated_at       TIMESTAMP NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_lf_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_lf_feed (is_deleted, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 4: POST TYPE 2 — ANNOUNCEMENTS (by club OR authority)
-- =====================================================================

CREATE TABLE announcements (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_type      ENUM('club','authority') NOT NULL,
    owner_id        BIGINT UNSIGNED NOT NULL,
    description     TEXT NOT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_announcements_feed (is_deleted, created_at),
    INDEX idx_announcements_owner (owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 5: POST TYPE 3 — EVENTS (by club OR authority)
-- =====================================================================

CREATE TABLE events (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_type          ENUM('club','authority') NOT NULL,
    owner_id            BIGINT UNSIGNED NOT NULL,
    description         TEXT NOT NULL,
    registration_link   VARCHAR(500) NULL,
    event_date          DATETIME NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_events_feed (is_deleted, created_at),
    INDEX idx_events_owner (owner_type, owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 6: POST TYPE 4 — COMPLAINTS
-- =====================================================================

CREATE TABLE complaints (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id              BIGINT UNSIGNED NOT NULL,        -- post owner
    description             TEXT NOT NULL,
    status                  ENUM('not_approved','pending','processing','handled','denied')
                             NOT NULL DEFAULT 'not_approved',
    handled_by              BIGINT UNSIGNED NULL,             -- university_authority.id
    status_updated_at       TIMESTAMP NULL,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at              TIMESTAMP NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaints_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_complaints_handled_by FOREIGN KEY (handled_by) REFERENCES university_authority(id) ON DELETE SET NULL,
    INDEX idx_complaints_feed (is_deleted, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 7: POST TYPE 5 — MARKETPLACE
-- =====================================================================

CREATE TABLE vendor_profiles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,          -- one vendor profile per student
    vendor_name     VARCHAR(150) NOT NULL,
    bio             TEXT NULL,
    avg_rating      DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- cached, recompute on review insert/delete
    rating_count    INT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vendor_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_vendor_one_per_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE marketplace_listings (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_id           BIGINT UNSIGNED NOT NULL,
    description         TEXT NOT NULL,
    price               DECIMAL(12,2) NOT NULL,
    status              ENUM('sold','unsold') NULL,      -- optional per spec
    show_status         BOOLEAN NOT NULL DEFAULT FALSE,   -- owner opts in to showing status
    contact_enabled     BOOLEAN NOT NULL DEFAULT TRUE,    -- placeholder "message option"
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at          TIMESTAMP NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_listing_vendor FOREIGN KEY (vendor_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    INDEX idx_listings_feed (is_deleted, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendor_reviews (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_id       BIGINT UNSIGNED NOT NULL,
    reviewer_id     BIGINT UNSIGNED NOT NULL,        -- students.id (buyer)
    rating          TINYINT UNSIGNED NOT NULL,        -- 1-5
    review_text     TEXT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_vendor FOREIGN KEY (vendor_id) REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_review_one_per_buyer (vendor_id, reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 8: POST TYPE 6 — STUDY ZONE
-- =====================================================================

CREATE TABLE study_sessions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,          -- post owner
    course_id       INT UNSIGNED NULL,                 -- optional link to courses table
    subject_text    VARCHAR(200) NOT NULL,              -- free text subject/course name
    study_time      DATETIME NOT NULL,                  -- when they want to study
    peer_limit      SMALLINT UNSIGNED NOT NULL,
    tutor_needed    BOOLEAN NOT NULL DEFAULT FALSE,
    mode            ENUM('online','offline') NOT NULL,
    description     TEXT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- "post time"
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_study_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_study_feed (is_deleted, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE study_session_participants (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id      BIGINT UNSIGNED NOT NULL,
    student_id      BIGINT UNSIGNED NOT NULL,
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_participant_session FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_participant_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_participant_once (session_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 9: POST TYPE 7 — MATERIAL SHARING
-- =====================================================================

CREATE TABLE material_shares (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,          -- post owner
    department_id   INT UNSIGNED NOT NULL,
    course_id       INT UNSIGNED NOT NULL,
    trimester_id    INT UNSIGNED NOT NULL,
    description     TEXT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_material_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_material_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_material_trimester FOREIGN KEY (trimester_id) REFERENCES trimesters(id) ON DELETE RESTRICT,
    INDEX idx_material_feed (is_deleted, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE material_files (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    material_share_id   BIGINT UNSIGNED NOT NULL,
    file_url            VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(255) NULL,
    file_type           ENUM('note','slide','recorded_class','other') NOT NULL DEFAULT 'other',
    uploaded_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_file_share FOREIGN KEY (material_share_id) REFERENCES material_shares(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 10: SHARED POLYMORPHIC ENGAGEMENT TABLES
-- (post_type + post_id identify which content table's row this refers to)
-- =====================================================================

-- Reusable enum values across all shared tables below:
--   'lost_found' -> lost_found_posts.id
--   'announcement' -> announcements.id
--   'event' -> events.id
--   'complaint' -> complaints.id
--   'marketplace' -> marketplace_listings.id
--   'study_session' -> study_sessions.id
--   'material_share' -> material_shares.id

CREATE TABLE post_images (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_type       ENUM('lost_found','announcement','event','complaint','marketplace') NOT NULL,
    post_id         BIGINT UNSIGNED NOT NULL,
    image_url       VARCHAR(500) NOT NULL,
    sort_order      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_images_lookup (post_type, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_likes (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_type       ENUM('lost_found','announcement','event','complaint','marketplace','study_session','material_share') NOT NULL,
    post_id         BIGINT UNSIGNED NOT NULL,
    student_id      BIGINT UNSIGNED NOT NULL,
    reaction        ENUM('like','dislike') NOT NULL,   -- also used as upvote/downvote for complaints
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_likes_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_one_reaction_per_user (post_type, post_id, student_id),
    INDEX idx_post_likes_lookup (post_type, post_id, reaction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_comments (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_type           ENUM('lost_found','announcement','event','complaint','marketplace','study_session','material_share') NOT NULL,
    post_id             BIGINT UNSIGNED NOT NULL,
    commenter_type      ENUM('student','club','authority') NOT NULL,
    commenter_id        BIGINT UNSIGNED NOT NULL,
    parent_comment_id   BIGINT UNSIGNED NULL,           -- for threaded replies
    comment_text        TEXT NOT NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
    INDEX idx_post_comments_lookup (post_type, post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_bookmarks (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,
    post_type       ENUM('lost_found','announcement','event','complaint','marketplace','study_session','material_share') NOT NULL,
    post_id         BIGINT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookmark_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_bookmark_once (student_id, post_type, post_id),
    INDEX idx_bookmarks_by_student (student_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_reports (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_type           ENUM('lost_found','announcement','event','complaint','marketplace','study_session','material_share') NOT NULL,
    post_id             BIGINT UNSIGNED NOT NULL,
    reporter_id         BIGINT UNSIGNED NOT NULL,        -- students.id
    reason              VARCHAR(150) NOT NULL,
    details             TEXT NULL,
    status              ENUM('pending','reviewed','dismissed','action_taken') NOT NULL DEFAULT 'pending',
    reviewed_by         BIGINT UNSIGNED NULL,             -- university_authority.id
    reviewed_at         TIMESTAMP NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES university_authority(id) ON DELETE SET NULL,
    INDEX idx_reports_lookup (post_type, post_id),
    INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SECTION 11: SHUTTLE TRACKING
-- =====================================================================

CREATE TABLE shuttle_routes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     TEXT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE route_stops (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    route_id        INT UNSIGNED NOT NULL,
    stop_name       VARCHAR(150) NOT NULL,
    sequence_no     SMALLINT UNSIGNED NOT NULL,        -- order of stop along the route
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    CONSTRAINT fk_stop_route FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE CASCADE,
    UNIQUE KEY uq_stop_sequence (route_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE shuttles (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_no      VARCHAR(50) NOT NULL,
    capacity        SMALLINT UNSIGNED NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_shuttle_vehicle_no (vehicle_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A "trip" = driver picks a route, turns on tracking; this row is the
-- live/authoritative record for "where is this shuttle right now".
CREATE TABLE shuttle_trips (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    driver_id           BIGINT UNSIGNED NOT NULL,
    route_id            INT UNSIGNED NOT NULL,
    shuttle_id          INT UNSIGNED NULL,
    status              ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
    -- latest known location, cached here for fast "current position" reads:
    current_latitude    DECIMAL(10,7) NULL,
    current_longitude   DECIMAL(10,7) NULL,
    current_heading     DECIMAL(5,2) NULL,              -- degrees, 0-360
    current_speed_kmh    DECIMAL(5,2) NULL,
    location_updated_at TIMESTAMP NULL,
    started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at             TIMESTAMP NULL,
    CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES shuttle_routes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trip_shuttle FOREIGN KEY (shuttle_id) REFERENCES shuttles(id) ON DELETE SET NULL,
    INDEX idx_trips_active (status, route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Full location history/log, written on each GPS ping from the driver's phone.
CREATE TABLE shuttle_locations (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id         BIGINT UNSIGNED NOT NULL,
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    heading         DECIMAL(5,2) NULL,
    speed_kmh       DECIMAL(5,2) NULL,
    recorded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_location_trip FOREIGN KEY (trip_id) REFERENCES shuttle_trips(id) ON DELETE CASCADE,
    INDEX idx_locations_trip_time (trip_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SECTION 12: TRIGGERS
-- =====================================================================

DELIMITER $$

-- Auto-transition a complaint from 'not_approved' to 'pending' once its
-- upvote ('like') count reaches the configured threshold.
CREATE TRIGGER trg_complaint_upvote_threshold
AFTER INSERT ON post_likes
FOR EACH ROW
BEGIN
    DECLARE v_threshold INT;
    DECLARE v_upvotes INT;

    IF NEW.post_type = 'complaint' AND NEW.reaction = 'like' THEN
        SELECT CAST(setting_value AS UNSIGNED) INTO v_threshold
        FROM app_settings WHERE setting_key = 'complaint_upvote_threshold';

        SELECT COUNT(*) INTO v_upvotes
        FROM post_likes
        WHERE post_type = 'complaint' AND post_id = NEW.post_id AND reaction = 'like';

        IF v_upvotes >= v_threshold THEN
            UPDATE complaints
            SET status = 'pending', status_updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id AND status = 'not_approved';
        END IF;
    END IF;
END$$

-- Keep vendor_profiles.avg_rating / rating_count in sync on new review.
CREATE TRIGGER trg_vendor_review_insert
AFTER INSERT ON vendor_reviews
FOR EACH ROW
BEGIN
    UPDATE vendor_profiles
    SET rating_count = rating_count + 1,
        avg_rating = (
            SELECT AVG(rating) FROM vendor_reviews WHERE vendor_id = NEW.vendor_id
        )
    WHERE id = NEW.vendor_id;
END$$

-- Keep vendor_profiles.avg_rating / rating_count in sync on review delete.
CREATE TRIGGER trg_vendor_review_delete
AFTER DELETE ON vendor_reviews
FOR EACH ROW
BEGIN
    UPDATE vendor_profiles
    SET rating_count = GREATEST(rating_count - 1, 0),
        avg_rating = COALESCE((
            SELECT AVG(rating) FROM vendor_reviews WHERE vendor_id = OLD.vendor_id
        ), 0.00)
    WHERE id = OLD.vendor_id;
END$$

DELIMITER ;

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
