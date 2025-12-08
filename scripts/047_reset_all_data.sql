-- ============================================================================
-- PLAN DE CLASSE - RESET COMPLET DES DONNÉES
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-08
-- Description: Supprime toutes les données tout en conservant le schéma
-- Usage: Exécuter dans Supabase SQL Editor
-- ============================================================================
-- ⚠️  ATTENTION: CE SCRIPT SUPPRIME TOUTES LES DONNÉES !
--     Le schéma (tables, fonctions, triggers) est conservé.
--     Pour recréer le schéma, utiliser 000_complete_schema.sql
-- ============================================================================

-- Confirmation de sécurité (décommenter pour exécuter)
-- SET session_replication_role = 'replica'; -- Désactive temporairement les FK

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '⚠️  SUPPRESSION DE TOUTES LES DONNÉES';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables qui seront vidées:';
    RAISE NOTICE '  • seating_assignments';
    RAISE NOTICE '  • sub_rooms';
    RAISE NOTICE '  • room_assignments';
    RAISE NOTICE '  • rooms';
    RAISE NOTICE '  • teacher_classes';
    RAISE NOTICE '  • teachers';
    RAISE NOTICE '  • students';
    RAISE NOTICE '  • classes';
    RAISE NOTICE '  • profiles';
    RAISE NOTICE '  • action_logs';
    RAISE NOTICE '  • establishments';
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- SUPPRESSION DES DONNÉES (dans l'ordre des dépendances)
-- ============================================================================

-- 1. Tables dépendantes niveau 3
TRUNCATE TABLE seating_assignments CASCADE;
TRUNCATE TABLE action_logs CASCADE;

-- 2. Tables dépendantes niveau 2
TRUNCATE TABLE sub_rooms CASCADE;
TRUNCATE TABLE room_assignments CASCADE;
TRUNCATE TABLE teacher_classes CASCADE;

-- 3. Tables dépendantes niveau 1
TRUNCATE TABLE rooms CASCADE;
TRUNCATE TABLE teachers CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE classes CASCADE;

-- 4. Tables principales
TRUNCATE TABLE profiles CASCADE;

-- 5. Table racine
TRUNCATE TABLE establishments CASCADE;

-- Réactiver les FK si nécessaire
-- SET session_replication_role = 'origin';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    total INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUPPRESSION TERMINÉE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Vérification des tables:';
    
    FOR rec IN 
        SELECT 'establishments' as tbl, COUNT(*) as cnt FROM establishments
        UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
        UNION ALL SELECT 'classes', COUNT(*) FROM classes
        UNION ALL SELECT 'students', COUNT(*) FROM students
        UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
        UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
        UNION ALL SELECT 'sub_rooms', COUNT(*) FROM sub_rooms
        ORDER BY 1
    LOOP
        RAISE NOTICE '  %-20s %s lignes', rec.tbl || ':', rec.cnt;
        total := total + rec.cnt;
    END LOOP;
    
    IF total = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Base de données vide - Prête pour nouvelles données';
        RAISE NOTICE '';
        RAISE NOTICE 'Prochaines étapes suggérées:';
        RAISE NOTICE '  1. Exécuter 045_seed_demo_data.sql pour données de test';
        RAISE NOTICE '  OU';
        RAISE NOTICE '  2. Créer vos propres données via l''interface';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  % lignes restantes - vérifier les erreurs', total;
    END IF;
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- RESET DES SÉQUENCES (optionnel, si utilisation de SERIAL au lieu de UUID)
-- ============================================================================

-- Les tables utilisent UUID donc pas de séquences à reset
-- Si vous avez des séquences custom:
-- ALTER SEQUENCE nom_sequence RESTART WITH 1;
