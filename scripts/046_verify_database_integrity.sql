-- ============================================================================
-- PLAN DE CLASSE - VÉRIFICATION D'INTÉGRITÉ DE LA BASE DE DONNÉES
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-08
-- Description: Vérifie l'état et la cohérence de la base de données
-- Usage: Exécuter dans Supabase SQL Editor pour diagnostic
-- ============================================================================

-- ============================================================================
-- SECTION 1: VÉRIFICATION DES OBJETS DE BASE
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT := '';
    missing_functions TEXT := '';
    missing_enums TEXT := '';
    table_name TEXT;
    func_name TEXT;
    enum_name TEXT;
    required_tables TEXT[] := ARRAY[
        'establishments', 'profiles', 'classes', 'students', 'teachers',
        'teacher_classes', 'rooms', 'room_assignments', 'sub_rooms',
        'seating_assignments', 'action_logs'
    ];
    required_functions TEXT[] := ARRAY['hash_password', 'verify_password', 'update_updated_at_column'];
    required_enums TEXT[] := ARRAY['user_role', 'sub_room_type'];
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DIAGNOSTIC DE LA BASE DE DONNÉES';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    
    -- Vérifier les tables
    RAISE NOTICE '📋 VÉRIFICATION DES TABLES';
    RAISE NOTICE '-------------------------------------------';
    FOREACH table_name IN ARRAY required_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = table_name) THEN
            RAISE NOTICE '  ✅ %', table_name;
        ELSE
            RAISE NOTICE '  ❌ % (MANQUANTE)', table_name;
            missing_tables := missing_tables || table_name || ', ';
        END IF;
    END LOOP;
    RAISE NOTICE '';
    
    -- Vérifier les fonctions
    RAISE NOTICE '⚙️  VÉRIFICATION DES FONCTIONS';
    RAISE NOTICE '-------------------------------------------';
    FOREACH func_name IN ARRAY required_functions LOOP
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name) THEN
            RAISE NOTICE '  ✅ %()', func_name;
        ELSE
            RAISE NOTICE '  ❌ %() (MANQUANTE)', func_name;
            missing_functions := missing_functions || func_name || ', ';
        END IF;
    END LOOP;
    RAISE NOTICE '';
    
    -- Vérifier les enums
    RAISE NOTICE '🏷️  VÉRIFICATION DES TYPES ENUM';
    RAISE NOTICE '-------------------------------------------';
    FOREACH enum_name IN ARRAY required_enums LOOP
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name) THEN
            RAISE NOTICE '  ✅ %', enum_name;
        ELSE
            RAISE NOTICE '  ❌ % (MANQUANT)', enum_name;
            missing_enums := missing_enums || enum_name || ', ';
        END IF;
    END LOOP;
    RAISE NOTICE '';
    
    -- Résumé
    IF missing_tables = '' AND missing_functions = '' AND missing_enums = '' THEN
        RAISE NOTICE '✅ STRUCTURE DE BASE: OK';
    ELSE
        RAISE NOTICE '❌ STRUCTURE DE BASE: PROBLÈMES DÉTECTÉS';
        IF missing_tables != '' THEN
            RAISE NOTICE '   Tables manquantes: %', TRIM(TRAILING ', ' FROM missing_tables);
        END IF;
        IF missing_functions != '' THEN
            RAISE NOTICE '   Fonctions manquantes: %', TRIM(TRAILING ', ' FROM missing_functions);
        END IF;
        IF missing_enums != '' THEN
            RAISE NOTICE '   Enums manquants: %', TRIM(TRAILING ', ' FROM missing_enums);
        END IF;
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: VÉRIFICATION DES VALEURS ENUM
-- ============================================================================

DO $$
DECLARE
    role_values TEXT;
    expected_roles TEXT[] := ARRAY['vie-scolaire', 'professeur', 'delegue', 'eco-delegue', 'eleve'];
    role TEXT;
    missing_roles TEXT := '';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔖 VALEURS ENUM user_role';
    RAISE NOTICE '-------------------------------------------';
    
    FOR role IN SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') ORDER BY enumsortorder LOOP
        RAISE NOTICE '  • %', role;
    END LOOP;
    
    -- Vérifier les valeurs attendues
    FOREACH role IN ARRAY expected_roles LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = role 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
            missing_roles := missing_roles || role || ', ';
        END IF;
    END LOOP;
    
    IF missing_roles != '' THEN
        RAISE NOTICE '  ⚠️  Valeurs manquantes: %', TRIM(TRAILING ', ' FROM missing_roles);
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: STATISTIQUES DES DONNÉES
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 STATISTIQUES DES DONNÉES';
    RAISE NOTICE '-------------------------------------------';
    
    FOR rec IN 
        SELECT 'establishments' as tbl, COUNT(*) as cnt FROM establishments
        UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
        UNION ALL SELECT 'classes', COUNT(*) FROM classes
        UNION ALL SELECT 'students', COUNT(*) FROM students
        UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
        UNION ALL SELECT 'teacher_classes', COUNT(*) FROM teacher_classes
        UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
        UNION ALL SELECT 'sub_rooms', COUNT(*) FROM sub_rooms
        UNION ALL SELECT 'seating_assignments', COUNT(*) FROM seating_assignments
        UNION ALL SELECT 'action_logs', COUNT(*) FROM action_logs
        ORDER BY 1
    LOOP
        RAISE NOTICE '  %-25s %s', rec.tbl || ':', rec.cnt;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 4: VÉRIFICATION DES RELATIONS (INTÉGRITÉ RÉFÉRENTIELLE)
-- ============================================================================

DO $$
DECLARE
    orphan_count INTEGER;
    issues_found BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔗 VÉRIFICATION DES RELATIONS';
    RAISE NOTICE '-------------------------------------------';
    
    -- Profils sans établissement valide
    SELECT COUNT(*) INTO orphan_count
    FROM profiles p
    WHERE NOT EXISTS (SELECT 1 FROM establishments e WHERE e.id = p.establishment_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Profils orphelins (sans établissement): %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Profils → Établissements: OK';
    END IF;
    
    -- Élèves sans établissement valide
    SELECT COUNT(*) INTO orphan_count
    FROM students s
    WHERE NOT EXISTS (SELECT 1 FROM establishments e WHERE e.id = s.establishment_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Élèves orphelins (sans établissement): %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Élèves → Établissements: OK';
    END IF;
    
    -- Élèves avec profile_id invalide
    SELECT COUNT(*) INTO orphan_count
    FROM students s
    WHERE s.profile_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.profile_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Élèves avec profile_id invalide: %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Élèves → Profils: OK';
    END IF;
    
    -- Professeurs sans établissement
    SELECT COUNT(*) INTO orphan_count
    FROM teachers t
    WHERE NOT EXISTS (SELECT 1 FROM establishments e WHERE e.id = t.establishment_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Professeurs orphelins (sans établissement): %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Professeurs → Établissements: OK';
    END IF;
    
    -- Professeurs avec profile_id invalide
    SELECT COUNT(*) INTO orphan_count
    FROM teachers t
    WHERE t.profile_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.profile_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Professeurs avec profile_id invalide: %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Professeurs → Profils: OK';
    END IF;
    
    -- Classes sans établissement
    SELECT COUNT(*) INTO orphan_count
    FROM classes c
    WHERE NOT EXISTS (SELECT 1 FROM establishments e WHERE e.id = c.establishment_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Classes orphelines (sans établissement): %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Classes → Établissements: OK';
    END IF;
    
    -- Élèves avec classe invalide
    SELECT COUNT(*) INTO orphan_count
    FROM students s
    WHERE s.class_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Élèves avec classe invalide: %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Élèves → Classes: OK';
    END IF;
    
    -- Sub_rooms sans établissement
    SELECT COUNT(*) INTO orphan_count
    FROM sub_rooms sr
    WHERE NOT EXISTS (SELECT 1 FROM establishments e WHERE e.id = sr.establishment_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE '  ❌ Sub_rooms orphelines: %', orphan_count;
        issues_found := TRUE;
    ELSE
        RAISE NOTICE '  ✅ Sub_rooms → Établissements: OK';
    END IF;
    
    IF NOT issues_found THEN
        RAISE NOTICE '';
        RAISE NOTICE '  ✅ INTÉGRITÉ RÉFÉRENTIELLE: OK';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: VÉRIFICATION DES INDEX
-- ============================================================================

DO $$
DECLARE
    idx RECORD;
    idx_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📇 INDEX PRÉSENTS';
    RAISE NOTICE '-------------------------------------------';
    
    FOR idx IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '  • % (sur %)', idx.indexname, idx.tablename;
        idx_count := idx_count + 1;
    END LOOP;
    
    RAISE NOTICE '  Total: % index custom', idx_count;
END $$;

-- ============================================================================
-- SECTION 6: VÉRIFICATION DES TRIGGERS
-- ============================================================================

DO $$
DECLARE
    trg RECORD;
    trg_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ TRIGGERS ACTIFS';
    RAISE NOTICE '-------------------------------------------';
    
    FOR trg IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
    LOOP
        RAISE NOTICE '  • % (sur %)', trg.trigger_name, trg.event_object_table;
        trg_count := trg_count + 1;
    END LOOP;
    
    IF trg_count = 0 THEN
        RAISE NOTICE '  (aucun trigger trouvé)';
    ELSE
        RAISE NOTICE '  Total: % triggers', trg_count;
    END IF;
END $$;

-- ============================================================================
-- SECTION 7: VÉRIFICATION RLS (Row Level Security)
-- ============================================================================

DO $$
DECLARE
    tbl RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ÉTAT RLS PAR TABLE';
    RAISE NOTICE '-------------------------------------------';
    
    FOR tbl IN 
        SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relkind = 'r'
        AND c.relname NOT LIKE 'pg_%'
        ORDER BY c.relname
    LOOP
        IF tbl.rls_enabled THEN
            RAISE NOTICE '  🔐 % (RLS ACTIVÉ)', tbl.table_name;
        ELSE
            RAISE NOTICE '  🔓 % (RLS désactivé)', tbl.table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '  ℹ️  Note: RLS désactivé car authentification custom';
END $$;

-- ============================================================================
-- SECTION 8: TEST DES FONCTIONS D'AUTHENTIFICATION
-- ============================================================================

DO $$
DECLARE
    test_hash TEXT;
    verify_result BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔑 TEST DES FONCTIONS D''AUTHENTIFICATION';
    RAISE NOTICE '-------------------------------------------';
    
    -- Test hash_password
    BEGIN
        SELECT hash_password('TestPassword123!') INTO test_hash;
        IF test_hash IS NOT NULL AND LENGTH(test_hash) = 64 THEN
            RAISE NOTICE '  ✅ hash_password(): OK (SHA256 64 chars)';
        ELSE
            RAISE NOTICE '  ❌ hash_password(): Résultat inattendu';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ hash_password(): ERREUR - %', SQLERRM;
    END;
    
    -- Test verify_password
    BEGIN
        SELECT verify_password('TestPassword123!', test_hash) INTO verify_result;
        IF verify_result = TRUE THEN
            RAISE NOTICE '  ✅ verify_password(): OK (validation correcte)';
        ELSE
            RAISE NOTICE '  ❌ verify_password(): Échec validation';
        END IF;
        
        -- Test mot de passe incorrect
        SELECT verify_password('WrongPassword', test_hash) INTO verify_result;
        IF verify_result = FALSE THEN
            RAISE NOTICE '  ✅ verify_password(): OK (rejet mdp incorrect)';
        ELSE
            RAISE NOTICE '  ❌ verify_password(): Accepte mdp incorrect!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ❌ verify_password(): ERREUR - %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- SECTION 9: RÉSUMÉ FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FIN DU DIAGNOSTIC';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Actions recommandées si problèmes détectés:';
    RAISE NOTICE '  1. Tables manquantes → Exécuter 000_complete_schema.sql';
    RAISE NOTICE '  2. Données orphelines → Supprimer ou corriger manuellement';
    RAISE NOTICE '  3. Fonctions manquantes → Exécuter 000_complete_schema.sql';
    RAISE NOTICE '  4. Valeurs enum manquantes → ALTER TYPE ... ADD VALUE';
    RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- REQUÊTES DE DIAGNOSTIC DÉTAILLÉ (optionnel)
-- ============================================================================

-- Comptes par établissement et rôle
SELECT 
    e.name as etablissement,
    e.code,
    p.role,
    COUNT(*) as nombre
FROM profiles p
JOIN establishments e ON p.establishment_id = e.id
GROUP BY e.name, e.code, p.role
ORDER BY e.name, p.role;

-- Élèves par classe
SELECT 
    e.name as etablissement,
    c.name as classe,
    COUNT(s.id) as nb_eleves,
    SUM(CASE WHEN s.role IN ('delegue', 'eco-delegue') THEN 1 ELSE 0 END) as nb_delegues
FROM classes c
JOIN establishments e ON c.establishment_id = e.id
LEFT JOIN students s ON s.class_id = c.id
GROUP BY e.name, c.name
ORDER BY e.name, c.name;

-- Professeurs et leurs classes
SELECT 
    e.name as etablissement,
    t.first_name || ' ' || t.last_name as professeur,
    t.subject as matiere,
    STRING_AGG(c.name, ', ' ORDER BY c.name) as classes
FROM teachers t
JOIN establishments e ON t.establishment_id = e.id
LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
LEFT JOIN classes c ON tc.class_id = c.id
GROUP BY e.name, t.first_name, t.last_name, t.subject
ORDER BY e.name, t.last_name;
