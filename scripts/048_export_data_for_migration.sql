-- ============================================================================
-- PLAN DE CLASSE - EXPORT DES DONNÉES POUR MIGRATION
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-08
-- Description: Génère des instructions INSERT pour migrer les données
--              vers une nouvelle instance Supabase
-- Usage: 
--   1. Exécuter ce script dans Supabase SQL Editor (ancienne instance)
--   2. Copier les résultats
--   3. Exécuter 000_complete_schema.sql sur nouvelle instance
--   4. Exécuter les INSERT copiés
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXPORT ÉTABLISSEMENTS
-- ============================================================================

SELECT '-- ÉTABLISSEMENTS' as "---";
SELECT format(
    'INSERT INTO establishments (id, name, code, created_at) VALUES (%L, %L, %L, %L) ON CONFLICT (code) DO NOTHING;',
    id, name, code, created_at
) as sql_statement
FROM establishments
ORDER BY created_at;

-- ============================================================================
-- SECTION 2: EXPORT CLASSES
-- ============================================================================

SELECT '' as "---";
SELECT '-- CLASSES' as "---";
SELECT format(
    'INSERT INTO classes (id, establishment_id, name, level, created_by, created_at) VALUES (%L, %L, %L, %L, %L, %L) ON CONFLICT (establishment_id, name) DO NOTHING;',
    id, establishment_id, name, level, created_by, created_at
) as sql_statement
FROM classes
ORDER BY establishment_id, name;

-- ============================================================================
-- SECTION 3: EXPORT PROFILS
-- ============================================================================

SELECT '' as "---";
SELECT '-- PROFILS (COMPTES UTILISATEURS)' as "---";
SELECT format(
    'INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, email, phone, can_create_subrooms, created_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L) ON CONFLICT (username) DO NOTHING;',
    id, establishment_id, role::text, username, password_hash, first_name, last_name, email, phone, can_create_subrooms, created_at
) as sql_statement
FROM profiles
ORDER BY establishment_id, role, username;

-- ============================================================================
-- SECTION 4: EXPORT PROFESSEURS
-- ============================================================================

SELECT '' as "---";
SELECT '-- PROFESSEURS' as "---";
SELECT format(
    'INSERT INTO teachers (id, profile_id, establishment_id, first_name, last_name, email, subject, username, password_hash, allow_delegate_subrooms, created_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L) ON CONFLICT DO NOTHING;',
    id, profile_id, establishment_id, first_name, last_name, email, subject, username, password_hash, COALESCE(allow_delegate_subrooms, true), created_at
) as sql_statement
FROM teachers
ORDER BY establishment_id, last_name;

-- ============================================================================
-- SECTION 5: EXPORT ÉLÈVES
-- ============================================================================

SELECT '' as "---";
SELECT '-- ÉLÈVES' as "---";
SELECT format(
    'INSERT INTO students (id, profile_id, establishment_id, class_id, first_name, last_name, email, phone, class_name, role, can_create_subrooms, username, password_hash, created_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L, %L, %L) ON CONFLICT DO NOTHING;',
    id, profile_id, establishment_id, class_id, first_name, last_name, email, phone, class_name, role::text, COALESCE(can_create_subrooms, false), username, password_hash, created_at
) as sql_statement
FROM students
ORDER BY establishment_id, class_name, last_name;

-- ============================================================================
-- SECTION 6: EXPORT ASSOCIATIONS PROFESSEURS-CLASSES
-- ============================================================================

SELECT '' as "---";
SELECT '-- ASSOCIATIONS PROFESSEURS-CLASSES' as "---";
SELECT format(
    'INSERT INTO teacher_classes (id, teacher_id, class_id, created_at) VALUES (%L, %L, %L, %L) ON CONFLICT (teacher_id, class_id) DO NOTHING;',
    id, teacher_id, class_id, created_at
) as sql_statement
FROM teacher_classes
ORDER BY teacher_id, class_id;

-- ============================================================================
-- SECTION 7: EXPORT SALLES
-- ============================================================================

SELECT '' as "---";
SELECT '-- SALLES' as "---";
SELECT format(
    'INSERT INTO rooms (id, establishment_id, name, code, config, board_position, width, created_by, share_token, is_modifiable_by_delegates, created_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L) ON CONFLICT DO NOTHING;',
    id, establishment_id, name, code, config::text, board_position, COALESCE(width, 800), created_by, share_token, COALESCE(is_modifiable_by_delegates, false), created_at
) as sql_statement
FROM rooms
ORDER BY establishment_id, name;

-- ============================================================================
-- SECTION 8: EXPORT ASSIGNATIONS DE SALLES
-- ============================================================================

SELECT '' as "---";
SELECT '-- ASSIGNATIONS DE SALLES' as "---";
SELECT format(
    'INSERT INTO room_assignments (id, room_id, teacher_id, class_id, class_name, seat_assignments, is_modifiable_by_delegates, created_at) VALUES (%L, %L, %L, %L, %L, %L, %s, %L) ON CONFLICT DO NOTHING;',
    id, room_id, teacher_id, class_id, class_name, seat_assignments::text, COALESCE(is_modifiable_by_delegates, false), created_at
) as sql_statement
FROM room_assignments
ORDER BY room_id;

-- ============================================================================
-- SECTION 9: EXPORT SOUS-SALLES
-- ============================================================================

SELECT '' as "---";
SELECT '-- SOUS-SALLES' as "---";
SELECT format(
    'INSERT INTO sub_rooms (id, room_assignment_id, establishment_id, room_id, name, custom_name, type, start_date, end_date, seat_assignments, config, is_modifiable_by_delegates, teacher_id, class_ids, is_multi_class, share_token, created_by, created_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L, %L, %s, %L, %L, %L) ON CONFLICT DO NOTHING;',
    id, room_assignment_id, establishment_id, room_id, name, custom_name, type::text, start_date, end_date, seat_assignments::text, config::text, COALESCE(is_modifiable_by_delegates, false), teacher_id, class_ids::text, COALESCE(is_multi_class, false), share_token, created_by, created_at
) as sql_statement
FROM sub_rooms
ORDER BY establishment_id, created_at;

-- ============================================================================
-- SECTION 10: EXPORT ASSIGNATIONS DE PLACES
-- ============================================================================

SELECT '' as "---";
SELECT '-- ASSIGNATIONS DE PLACES' as "---";
SELECT format(
    'INSERT INTO seating_assignments (id, sub_room_id, student_id, seat_position, created_at) VALUES (%L, %L, %L, %L, %L) ON CONFLICT (sub_room_id, student_id) DO NOTHING;',
    id, sub_room_id, student_id, seat_position::text, created_at
) as sql_statement
FROM seating_assignments
ORDER BY sub_room_id, student_id;

-- ============================================================================
-- RÉSUMÉ DE L'EXPORT
-- ============================================================================

SELECT '' as "---";
SELECT '-- RÉSUMÉ DE L''EXPORT' as "---";

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'EXPORT TERMINÉ';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Données exportées:';
    
    FOR rec IN 
        SELECT 'establishments' as tbl, COUNT(*) as cnt FROM establishments
        UNION ALL SELECT 'classes', COUNT(*) FROM classes
        UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
        UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
        UNION ALL SELECT 'students', COUNT(*) FROM students
        UNION ALL SELECT 'teacher_classes', COUNT(*) FROM teacher_classes
        UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
        UNION ALL SELECT 'room_assignments', COUNT(*) FROM room_assignments
        UNION ALL SELECT 'sub_rooms', COUNT(*) FROM sub_rooms
        UNION ALL SELECT 'seating_assignments', COUNT(*) FROM seating_assignments
        ORDER BY 1
    LOOP
        RAISE NOTICE '  %-25s %s lignes', rec.tbl || ':', rec.cnt;
    END LOOP;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Instructions de migration:';
    RAISE NOTICE '  1. Copier toutes les instructions INSERT générées';
    RAISE NOTICE '  2. Sur la nouvelle instance, exécuter:';
    RAISE NOTICE '     - 000_complete_schema.sql (créer le schéma)';
    RAISE NOTICE '     - Les INSERT copiés (restaurer les données)';
    RAISE NOTICE '  3. Exécuter 046_verify_database_integrity.sql';
    RAISE NOTICE '============================================';
END $$;
