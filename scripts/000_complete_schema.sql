-- ============================================================================
-- PLAN DE CLASSE - MIGRATION COMPLÈTE DE LA BASE DE DONNÉES
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-08
-- Description: Script autonome pour créer l'intégralité du schéma de base
--              Peut être exécuté sur une nouvelle instance Supabase
-- ============================================================================
-- ATTENTION: Ce script supprime et recrée toutes les tables !
--            Sauvegarder les données avant exécution si nécessaire.
-- ============================================================================

-- ============================================================================
-- SECTION 1: NETTOYAGE (Optionnel - décommenter si réinitialisation complète)
-- ============================================================================

-- Supprimer les politiques RLS existantes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
DROP TRIGGER IF EXISTS update_sub_rooms_updated_at ON sub_rooms;
DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS hash_password(text) CASCADE;
DROP FUNCTION IF EXISTS verify_password(text, text) CASCADE;

-- Supprimer les tables dans l'ordre des dépendances
DROP TABLE IF EXISTS seating_assignments CASCADE;
DROP TABLE IF EXISTS sub_rooms CASCADE;
DROP TABLE IF EXISTS room_assignments CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS teacher_classes CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS action_logs CASCADE;
DROP TABLE IF EXISTS establishments CASCADE;

-- Supprimer les types enum
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS sub_room_type CASCADE;

-- ============================================================================
-- SECTION 2: TYPES ENUM
-- ============================================================================

-- Type pour les rôles utilisateur
CREATE TYPE user_role AS ENUM (
    'vie-scolaire',
    'professeur', 
    'delegue',
    'eco-delegue',
    'eleve'
);

-- Type pour les sous-salles
CREATE TYPE sub_room_type AS ENUM (
    'temporary',
    'indeterminate'
);

-- ============================================================================
-- SECTION 3: FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour hasher un mot de passe (SHA256)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier un mot de passe
CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN encode(digest(password, 'sha256'), 'hex') = password_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 4: TABLES PRINCIPALES
-- ============================================================================

-- Table des établissements
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE establishments IS 'Établissements scolaires';
COMMENT ON COLUMN establishments.code IS 'Code unique de connexion (ex: stm001)';

-- Table des profils utilisateurs (table principale d'authentification)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    can_create_subrooms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Profils utilisateurs - table principale d''authentification';
COMMENT ON COLUMN profiles.username IS 'Identifiant de connexion unique';
COMMENT ON COLUMN profiles.password_hash IS 'Mot de passe hashé SHA256';

-- Table des classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(establishment_id, name)
);

COMMENT ON TABLE classes IS 'Classes de l''établissement';
COMMENT ON COLUMN classes.level IS 'Niveau scolaire (6ème, 5ème, etc.)';

-- Table des élèves
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    class_name TEXT,
    role user_role DEFAULT 'eleve',
    can_create_subrooms BOOLEAN DEFAULT FALSE,
    username TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE students IS 'Élèves de l''établissement';
COMMENT ON COLUMN students.profile_id IS 'Lien vers profiles si l''élève a un compte';
COMMENT ON COLUMN students.role IS 'delegue, eco-delegue ou eleve';

-- Table des professeurs
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    subject TEXT,
    username TEXT,
    password_hash TEXT,
    allow_delegate_subrooms BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE teachers IS 'Professeurs de l''établissement';
COMMENT ON COLUMN teachers.allow_delegate_subrooms IS 'Autoriser les délégués à créer des sous-salles';

-- Table de liaison professeurs-classes
CREATE TABLE teacher_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, class_id)
);

COMMENT ON TABLE teacher_classes IS 'Association professeurs-classes enseignées';

-- Table des salles
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    config JSONB DEFAULT '{"columns": []}',
    board_position TEXT DEFAULT 'top',
    width INTEGER DEFAULT 800,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    share_token TEXT,
    is_modifiable_by_delegates BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rooms IS 'Salles de classe avec configuration du plan';
COMMENT ON COLUMN rooms.config IS 'Configuration JSON des colonnes et tables';
COMMENT ON COLUMN rooms.board_position IS 'Position du tableau (top, bottom, left, right)';

-- Table des assignations de salles
CREATE TABLE room_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    class_name TEXT,
    seat_assignments JSONB DEFAULT '{}',
    is_modifiable_by_delegates BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE room_assignments IS 'Assignation des salles aux classes/professeurs';

-- Table des sous-salles (plans personnalisés)
CREATE TABLE sub_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_assignment_id UUID REFERENCES room_assignments(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    custom_name TEXT,
    type sub_room_type NOT NULL DEFAULT 'indeterminate',
    start_date DATE,
    end_date DATE,
    seat_assignments JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    is_modifiable_by_delegates BOOLEAN DEFAULT FALSE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_ids UUID[] DEFAULT '{}',
    is_multi_class BOOLEAN DEFAULT FALSE,
    share_token TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sub_rooms IS 'Sous-salles / plans de classe personnalisés';
COMMENT ON COLUMN sub_rooms.type IS 'temporary (durée limitée) ou indeterminate (permanent)';

-- Table des assignations de places
CREATE TABLE seating_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_room_id UUID NOT NULL REFERENCES sub_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    seat_position JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sub_room_id, student_id)
);

COMMENT ON TABLE seating_assignments IS 'Position des élèves dans les sous-salles';
COMMENT ON COLUMN seating_assignments.seat_position IS '{column, table, seat, seatNumber}';

-- Table des logs d'actions
CREATE TABLE action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE action_logs IS 'Journal des actions utilisateurs';

-- ============================================================================
-- SECTION 5: INDEXES
-- ============================================================================

-- Indexes pour performances
CREATE INDEX IF NOT EXISTS idx_profiles_establishment ON profiles(establishment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_students_establishment ON students(establishment_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_profile ON students(profile_id);

CREATE INDEX IF NOT EXISTS idx_teachers_establishment ON teachers(establishment_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile ON teachers(profile_id);

CREATE INDEX IF NOT EXISTS idx_classes_establishment ON classes(establishment_id);

CREATE INDEX IF NOT EXISTS idx_rooms_establishment ON rooms(establishment_id);

CREATE INDEX IF NOT EXISTS idx_sub_rooms_establishment ON sub_rooms(establishment_id);
CREATE INDEX IF NOT EXISTS idx_sub_rooms_room ON sub_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_sub_rooms_teacher ON sub_rooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sub_rooms_created_by ON sub_rooms(created_by);

CREATE INDEX IF NOT EXISTS idx_seating_assignments_sub_room ON seating_assignments(sub_room_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_student ON seating_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_establishment ON action_logs(establishment_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created ON action_logs(created_at DESC);

-- ============================================================================
-- SECTION 6: TRIGGERS
-- ============================================================================

-- Triggers pour updated_at automatique
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_rooms_updated_at
    BEFORE UPDATE ON sub_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- NOTE: RLS est désactivé pour les tables principales car l'application utilise
--       une authentification custom (pas Supabase Auth). La sécurité est gérée
--       au niveau applicatif.
-- ============================================================================

-- Désactiver RLS sur les tables principales (custom auth)
ALTER TABLE establishments DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 8: PERMISSIONS
-- ============================================================================

-- Accorder les permissions au rôle anon et authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SECTION 9: VÉRIFICATION FINALE
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Compter les tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- Compter les fonctions custom
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname IN ('hash_password', 'verify_password', 'update_updated_at_column');
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Tables créées: %', table_count;
    RAISE NOTICE 'Fonctions utilitaires: %', function_count;
    RAISE NOTICE '===========================================';
END $$;

-- Afficher les tables créées
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
