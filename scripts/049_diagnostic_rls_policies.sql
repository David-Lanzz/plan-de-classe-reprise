-- ============================================================================
-- SCRIPT DE DIAGNOSTIC RLS & POLICIES
-- Plan de Classe - Mission #IASK001-C8
-- Date: 08/12/2025
-- ============================================================================
-- Usage: Exécuter dans Supabase SQL Editor pour vérifier l'état de la sécurité
-- ============================================================================

-- ============================================================================
-- SECTION 1: ÉTAT DU RLS PAR TABLE
-- ============================================================================

SELECT '=== SECTION 1: ÉTAT RLS PAR TABLE ===' AS section;

SELECT 
    tablename AS "Table",
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END AS "RLS Status",
    CASE 
        WHEN rowsecurity THEN 'Politiques RLS actives'
        ELSE 'Accès direct via API (sécurité applicative)'
    END AS "Implication"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: COMPTAGE RLS ENABLED vs DISABLED
-- ============================================================================

SELECT '=== SECTION 2: SYNTHÈSE RLS ===' AS section;

SELECT 
    CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END AS "Statut",
    COUNT(*) AS "Nombre de tables",
    STRING_AGG(tablename, ', ' ORDER BY tablename) AS "Tables"
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY rowsecurity
ORDER BY rowsecurity DESC;

-- ============================================================================
-- SECTION 3: POLICIES EXISTANTES
-- ============================================================================

SELECT '=== SECTION 3: POLICIES EXISTANTES ===' AS section;

SELECT 
    schemaname AS "Schema",
    tablename AS "Table",
    policyname AS "Policy Name",
    permissive AS "Permissive",
    roles AS "Roles",
    cmd AS "Command",
    qual AS "USING (filter)",
    with_check AS "WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 4: COMPTAGE DES POLICIES PAR TABLE
-- ============================================================================

SELECT '=== SECTION 4: COMPTAGE POLICIES PAR TABLE ===' AS section;

SELECT 
    t.tablename AS "Table",
    CASE WHEN t.rowsecurity THEN '✅' ELSE '❌' END AS "RLS",
    COALESCE(p.policy_count, 0) AS "Nb Policies",
    CASE 
        WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS activé sans policy = BLOQUÉ'
        WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ Protégé par policies'
        WHEN NOT t.rowsecurity THEN '🔓 Accès ouvert (auth applicative)'
    END AS "État"
FROM pg_tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- ============================================================================
-- SECTION 5: FONCTIONS D'AUTHENTIFICATION
-- ============================================================================

SELECT '=== SECTION 5: FONCTIONS AUTH ===' AS section;

SELECT 
    proname AS "Fonction",
    CASE 
        WHEN proname = 'hash_password' THEN 'Hash SHA256 d''un mot de passe'
        WHEN proname = 'verify_password' THEN 'Vérifie mot de passe vs hash'
        WHEN proname = 'update_updated_at_column' THEN 'Trigger updated_at'
        ELSE 'Autre'
    END AS "Description",
    pg_get_function_arguments(oid) AS "Arguments",
    CASE 
        WHEN prosrc LIKE '%sha256%' THEN 'SHA256'
        WHEN prosrc LIKE '%bcrypt%' THEN 'BCRYPT'
        ELSE '-'
    END AS "Algo Hash"
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('hash_password', 'verify_password', 'update_updated_at_column')
ORDER BY proname;

-- ============================================================================
-- SECTION 6: TEST DES FONCTIONS DE HASH
-- ============================================================================

SELECT '=== SECTION 6: TEST FONCTIONS HASH ===' AS section;

-- Test hash_password
SELECT 
    'hash_password' AS "Fonction",
    hash_password('test123') AS "Résultat",
    LENGTH(hash_password('test123')) AS "Longueur",
    CASE 
        WHEN LENGTH(hash_password('test123')) = 64 THEN '✅ SHA256 (64 chars hex)'
        WHEN LENGTH(hash_password('test123')) = 60 THEN '✅ bcrypt (60 chars)'
        ELSE '⚠️ Format inconnu'
    END AS "Validation";

-- Test verify_password
SELECT 
    'verify_password' AS "Fonction",
    verify_password('test123', hash_password('test123')) AS "Test positif (doit être TRUE)",
    verify_password('wrong', hash_password('test123')) AS "Test négatif (doit être FALSE)";

-- ============================================================================
-- SECTION 7: VÉRIFICATION DES PARAMÈTRES DE FONCTION
-- ============================================================================

SELECT '=== SECTION 7: PARAMÈTRES VERIFY_PASSWORD ===' AS section;

SELECT 
    p.proname AS "Fonction",
    pg_get_function_identity_arguments(p.oid) AS "Signature",
    CASE 
        WHEN pg_get_function_identity_arguments(p.oid) LIKE '%password%text%password_hash%text%' 
        THEN '✅ Paramètres corrects (password, password_hash)'
        WHEN pg_get_function_identity_arguments(p.oid) LIKE '%input_password%stored_hash%'
        THEN '⚠️ Anciens paramètres (input_password, stored_hash) - À corriger!'
        ELSE '❓ Vérifier manuellement'
    END AS "Compatibilité code"
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
AND p.proname = 'verify_password';

-- ============================================================================
-- SECTION 8: COMPTES UTILISATEURS
-- ============================================================================

SELECT '=== SECTION 8: COMPTES AVEC MOT DE PASSE ===' AS section;

-- Profiles (vie-scolaire)
SELECT 
    'profiles' AS "Table",
    COUNT(*) AS "Total",
    COUNT(*) FILTER (WHERE password_hash IS NOT NULL AND password_hash != '') AS "Avec password",
    COUNT(*) FILTER (WHERE password_hash IS NULL OR password_hash = '') AS "Sans password"
FROM profiles;

-- Teachers
SELECT 
    'teachers' AS "Table",
    COUNT(*) AS "Total",
    COUNT(*) FILTER (WHERE password_hash IS NOT NULL AND password_hash != '') AS "Avec password",
    COUNT(*) FILTER (WHERE password_hash IS NULL OR password_hash = '') AS "Sans password"
FROM teachers;

-- Students (délégués)
SELECT 
    'students' AS "Table",
    COUNT(*) AS "Total",
    COUNT(*) FILTER (WHERE password_hash IS NOT NULL AND password_hash != '') AS "Avec password (délégués)",
    COUNT(*) FILTER (WHERE password_hash IS NULL OR password_hash = '') AS "Sans password (élèves)"
FROM students;

-- ============================================================================
-- SECTION 9: PERMISSIONS SUPABASE
-- ============================================================================

SELECT '=== SECTION 9: PERMISSIONS ROLES ===' AS section;

SELECT 
    grantee AS "Rôle",
    table_name AS "Table",
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) AS "Permissions"
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

-- ============================================================================
-- SECTION 10: RÉSUMÉ ET RECOMMANDATIONS
-- ============================================================================

SELECT '=== SECTION 10: RÉSUMÉ ===' AS section;

DO $$
DECLARE
    rls_enabled_count INTEGER;
    rls_disabled_count INTEGER;
    policies_count INTEGER;
    hash_func_exists BOOLEAN;
    verify_func_exists BOOLEAN;
BEGIN
    -- Compter RLS
    SELECT COUNT(*) INTO rls_enabled_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
    SELECT COUNT(*) INTO rls_disabled_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
    SELECT COUNT(*) INTO policies_count FROM pg_policies WHERE schemaname = 'public';
    
    -- Vérifier fonctions
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'hash_password' AND pronamespace = 'public'::regnamespace) INTO hash_func_exists;
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'verify_password' AND pronamespace = 'public'::regnamespace) INTO verify_func_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '           RÉSUMÉ DU DIAGNOSTIC';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS ENABLED:  % tables', rls_enabled_count;
    RAISE NOTICE 'RLS DISABLED: % tables', rls_disabled_count;
    RAISE NOTICE 'Policies:     % définies', policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'hash_password():   %', CASE WHEN hash_func_exists THEN '✅ OK' ELSE '❌ MANQUANTE' END;
    RAISE NOTICE 'verify_password(): %', CASE WHEN verify_func_exists THEN '✅ OK' ELSE '❌ MANQUANTE' END;
    RAISE NOTICE '';
    
    IF rls_disabled_count > 10 AND policies_count = 0 THEN
        RAISE NOTICE '📋 CONFIGURATION: Auth Custom (RLS désactivé)';
        RAISE NOTICE '   → Sécurité gérée au niveau applicatif (custom-auth.ts)';
        RAISE NOTICE '   → Comportement ATTENDU pour Plan de Classe';
    ELSIF rls_enabled_count > 10 AND policies_count > 0 THEN
        RAISE NOTICE '📋 CONFIGURATION: Auth Supabase (RLS activé)';
        RAISE NOTICE '   → Sécurité gérée par les policies RLS';
        RAISE NOTICE '   → Vérifier que les policies sont correctes';
    ELSE
        RAISE NOTICE '⚠️ CONFIGURATION MIXTE';
        RAISE NOTICE '   → Certaines tables ont RLS activé, d''autres non';
        RAISE NOTICE '   → Vérifier la cohérence';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- FIN DU DIAGNOSTIC
-- ============================================================================
SELECT '=== DIAGNOSTIC TERMINÉ ===' AS status, NOW() AS "Date/Heure";
