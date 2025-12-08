-- ============================================================================
-- PLAN DE CLASSE - DONNÉES DE DÉMONSTRATION
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-08
-- Description: Crée un jeu de données complet pour test/démo
-- Prérequis: Exécuter 000_complete_schema.sql au préalable
-- ============================================================================

-- ============================================================================
-- SECTION 1: ÉTABLISSEMENTS
-- ============================================================================

INSERT INTO establishments (id, name, code) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Sainte-Marie Caen', 'stm001'),
    ('22222222-2222-2222-2222-222222222222', 'Victor Hugo Paris', 'vh001')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ============================================================================
-- SECTION 2: CLASSES
-- ============================================================================

-- Classes Sainte-Marie
INSERT INTO classes (id, establishment_id, name, level) VALUES
    ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '6ème A', '6ème'),
    ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '6ème B', '6ème'),
    ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '5ème A', '5ème'),
    ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '5ème B', '5ème'),
    ('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '4ème A', '4ème'),
    ('c6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '3ème A', '3ème')
ON CONFLICT (establishment_id, name) DO NOTHING;

-- Classes Victor Hugo
INSERT INTO classes (id, establishment_id, name, level) VALUES
    ('c7777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '6ème 1', '6ème'),
    ('c8888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', '5ème 1', '5ème'),
    ('c9999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '4ème 1', '4ème')
ON CONFLICT (establishment_id, name) DO NOTHING;

-- ============================================================================
-- SECTION 3: PROFILS VIE SCOLAIRE
-- ============================================================================

-- Vie scolaire Sainte-Marie
-- Mot de passe: VieScol2024!
INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms) VALUES
    ('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'vie-scolaire', 'vs.stmarie', 
     hash_password('VieScol2024!'), 'Admin', 'Vie Scolaire', 'vie.scolaire@stmarie.fr', true)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = hash_password('VieScol2024!'),
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Vie scolaire Victor Hugo
INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms) VALUES
    ('p2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'vie-scolaire', 'vs.vhugo',
     hash_password('VieScol2024!'), 'Admin', 'Vie Scolaire', 'vie.scolaire@vhugo.fr', true)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = hash_password('VieScol2024!');

-- ============================================================================
-- SECTION 4: PROFESSEURS
-- ============================================================================

-- Profils professeurs Sainte-Marie
-- Mot de passe: Prof2024!
INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms) VALUES
    ('p3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'professeur', 'j.martin.stm',
     hash_password('Prof2024!'), 'Jean', 'Martin', 'j.martin@stmarie.fr', true),
    ('p4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'professeur', 'm.dupont.stm',
     hash_password('Prof2024!'), 'Marie', 'Dupont', 'm.dupont@stmarie.fr', true),
    ('p5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'professeur', 'p.bernard.stm',
     hash_password('Prof2024!'), 'Pierre', 'Bernard', 'p.bernard@stmarie.fr', true)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = hash_password('Prof2024!'),
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Entrées table teachers
INSERT INTO teachers (id, profile_id, establishment_id, first_name, last_name, email, subject, username, password_hash) VALUES
    ('t1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
     'Jean', 'Martin', 'j.martin@stmarie.fr', 'Mathématiques', 'j.martin.stm', hash_password('Prof2024!')),
    ('t2222222-2222-2222-2222-222222222222', 'p4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
     'Marie', 'Dupont', 'm.dupont@stmarie.fr', 'Français', 'm.dupont.stm', hash_password('Prof2024!')),
    ('t3333333-3333-3333-3333-333333333333', 'p5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
     'Pierre', 'Bernard', 'p.bernard@stmarie.fr', 'Histoire-Géographie', 'p.bernard.stm', hash_password('Prof2024!'))
ON CONFLICT DO NOTHING;

-- Professeur Victor Hugo
INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, email, can_create_subrooms) VALUES
    ('p6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'professeur', 's.leroy.vh',
     hash_password('Prof2024!'), 'Sophie', 'Leroy', 's.leroy@vhugo.fr', true)
ON CONFLICT (username) DO UPDATE SET password_hash = hash_password('Prof2024!');

INSERT INTO teachers (id, profile_id, establishment_id, first_name, last_name, email, subject, username, password_hash) VALUES
    ('t4444444-4444-4444-4444-444444444444', 'p6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222',
     'Sophie', 'Leroy', 's.leroy@vhugo.fr', 'Sciences', 's.leroy.vh', hash_password('Prof2024!'))
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 5: ASSOCIATIONS PROFESSEURS-CLASSES
-- ============================================================================

INSERT INTO teacher_classes (teacher_id, class_id) VALUES
    -- Jean Martin: 6ème A, 6ème B, 5ème A
    ('t1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
    ('t1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222'),
    ('t1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333'),
    -- Marie Dupont: 5ème B, 4ème A, 3ème A
    ('t2222222-2222-2222-2222-222222222222', 'c4444444-4444-4444-4444-444444444444'),
    ('t2222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555'),
    ('t2222222-2222-2222-2222-222222222222', 'c6666666-6666-6666-6666-666666666666'),
    -- Pierre Bernard: 6ème A, 4ème A
    ('t3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111'),
    ('t3333333-3333-3333-3333-333333333333', 'c5555555-5555-5555-5555-555555555555'),
    -- Sophie Leroy VH: 6ème 1, 5ème 1
    ('t4444444-4444-4444-4444-444444444444', 'c7777777-7777-7777-7777-777777777777'),
    ('t4444444-4444-4444-4444-444444444444', 'c8888888-8888-8888-8888-888888888888')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 6: ÉLÈVES (SANS COMPTE)
-- ============================================================================

-- Élèves 6ème A Sainte-Marie
INSERT INTO students (establishment_id, class_id, first_name, last_name, class_name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Lucas', 'Petit', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Emma', 'Moreau', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Hugo', 'Laurent', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Chloé', 'Simon', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Nathan', 'Michel', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Léa', 'Garcia', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Louis', 'David', '6ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Manon', 'Bertrand', '6ème A', 'eleve');

-- Élèves 6ème B Sainte-Marie
INSERT INTO students (establishment_id, class_id, first_name, last_name, class_name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Antoine', 'Roux', '6ème B', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Camille', 'Vincent', '6ème B', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Mathis', 'Fournier', '6ème B', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Sarah', 'Morel', '6ème B', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Théo', 'Girard', '6ème B', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Jade', 'Andre', '6ème B', 'eleve');

-- Élèves 5ème A Sainte-Marie
INSERT INTO students (establishment_id, class_id, first_name, last_name, class_name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Raphaël', 'Lefebvre', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Inès', 'Mercier', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Gabriel', 'Dupuis', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Lina', 'Lambert', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Adam', 'Bonnet', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Louise', 'Francois', '5ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Arthur', 'Martinez', '5ème A', 'eleve');

-- Élèves 4ème A Sainte-Marie
INSERT INTO students (establishment_id, class_id, first_name, last_name, class_name, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Maxime', 'Legrand', '4ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Clara', 'Garnier', '4ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Enzo', 'Faure', '4ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Zoé', 'Rousseau', '4ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Tom', 'Blanc', '4ème A', 'eleve'),
    ('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Eva', 'Guerin', '4ème A', 'eleve');

-- ============================================================================
-- SECTION 7: DÉLÉGUÉS (AVEC COMPTE)
-- ============================================================================

-- Profils délégués Sainte-Marie
-- Mot de passe: Delegue2024!
INSERT INTO profiles (id, establishment_id, role, username, password_hash, first_name, last_name, can_create_subrooms) VALUES
    ('p7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'delegue', 'l.petit.del',
     hash_password('Delegue2024!'), 'Lucas', 'Petit', true),
    ('p8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'eco-delegue', 'e.moreau.eco',
     hash_password('Delegue2024!'), 'Emma', 'Moreau', false)
ON CONFLICT (username) DO UPDATE SET password_hash = hash_password('Delegue2024!');

-- Mettre à jour les élèves existants comme délégués
UPDATE students SET 
    profile_id = 'p7777777-7777-7777-7777-777777777777',
    role = 'delegue',
    can_create_subrooms = true,
    username = 'l.petit.del',
    password_hash = hash_password('Delegue2024!')
WHERE first_name = 'Lucas' AND last_name = 'Petit' AND establishment_id = '11111111-1111-1111-1111-111111111111';

UPDATE students SET 
    profile_id = 'p8888888-8888-8888-8888-888888888888',
    role = 'eco-delegue',
    can_create_subrooms = false,
    username = 'e.moreau.eco',
    password_hash = hash_password('Delegue2024!')
WHERE first_name = 'Emma' AND last_name = 'Moreau' AND establishment_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- SECTION 8: SALLES
-- ============================================================================

-- Salles Sainte-Marie
INSERT INTO rooms (id, establishment_id, name, code, config, board_position, created_by) VALUES
    ('r1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Salle B23', 'B23',
     '{"columns": [{"id": "col1", "tables": 4, "seatsPerTable": 2}, {"id": "col2", "tables": 4, "seatsPerTable": 2}, {"id": "col3", "tables": 4, "seatsPerTable": 2}]}',
     'top', 'p1111111-1111-1111-1111-111111111111'),
    ('r2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Salle A12', 'A12',
     '{"columns": [{"id": "col1", "tables": 5, "seatsPerTable": 2}, {"id": "col2", "tables": 5, "seatsPerTable": 2}]}',
     'top', 'p1111111-1111-1111-1111-111111111111'),
    ('r3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Salle C05', 'C05',
     '{"columns": [{"id": "col1", "tables": 3, "seatsPerTable": 3}, {"id": "col2", "tables": 3, "seatsPerTable": 3}, {"id": "col3", "tables": 3, "seatsPerTable": 3}]}',
     'left', 'p1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Salles Victor Hugo
INSERT INTO rooms (id, establishment_id, name, code, config, board_position, created_by) VALUES
    ('r4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Salle 101', '101',
     '{"columns": [{"id": "col1", "tables": 4, "seatsPerTable": 2}, {"id": "col2", "tables": 4, "seatsPerTable": 2}]}',
     'top', 'p2222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 9: VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
    est_count INTEGER;
    class_count INTEGER;
    profile_count INTEGER;
    student_count INTEGER;
    teacher_count INTEGER;
    room_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO est_count FROM establishments;
    SELECT COUNT(*) INTO class_count FROM classes;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO student_count FROM students;
    SELECT COUNT(*) INTO teacher_count FROM teachers;
    SELECT COUNT(*) INTO room_count FROM rooms;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'DONNÉES DE DÉMONSTRATION CRÉÉES';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Établissements: %', est_count;
    RAISE NOTICE 'Classes: %', class_count;
    RAISE NOTICE 'Profils (comptes): %', profile_count;
    RAISE NOTICE 'Élèves: %', student_count;
    RAISE NOTICE 'Professeurs: %', teacher_count;
    RAISE NOTICE 'Salles: %', room_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'IDENTIFIANTS DE TEST:';
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'SAINTE-MARIE (code: stm001)';
    RAISE NOTICE '  Vie scolaire: vs.stmarie / VieScol2024!';
    RAISE NOTICE '  Professeur 1: j.martin.stm / Prof2024!';
    RAISE NOTICE '  Professeur 2: m.dupont.stm / Prof2024!';
    RAISE NOTICE '  Professeur 3: p.bernard.stm / Prof2024!';
    RAISE NOTICE '  Délégué: l.petit.del / Delegue2024!';
    RAISE NOTICE '  Éco-délégué: e.moreau.eco / Delegue2024!';
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'VICTOR HUGO (code: vh001)';
    RAISE NOTICE '  Vie scolaire: vs.vhugo / VieScol2024!';
    RAISE NOTICE '  Professeur: s.leroy.vh / Prof2024!';
    RAISE NOTICE '===========================================';
END $$;

-- Liste des comptes créés
SELECT 
    e.code as etablissement,
    p.role,
    p.username as identifiant,
    p.first_name || ' ' || p.last_name as nom_complet
FROM profiles p
JOIN establishments e ON p.establishment_id = e.id
ORDER BY e.code, p.role, p.username;
