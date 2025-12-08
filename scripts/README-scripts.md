# 📚 Scripts Base de Données - Plan de Classe

Ce répertoire contient tous les scripts SQL et TypeScript nécessaires pour gérer la base de données de l'application Plan de Classe.

## 🎯 Vue d'ensemble

L'application utilise **Supabase** comme backend avec une **authentification custom** (pas Supabase Auth). Les scripts sont organisés par numéro pour garantir l'ordre d'exécution.

---

## 📁 Organisation des Scripts

### Scripts de Migration Complète (000-009)

| Script | Description | Quand l'utiliser |
|--------|-------------|------------------|
| `000_complete_schema.sql` | **Migration complète** - Crée tout le schéma (tables, types, fonctions, triggers) | Nouvelle instance Supabase |

### Scripts de Maintenance (010-039)

Ces scripts historiques ont été consolidés dans `000_complete_schema.sql`.

### Scripts de Correction Spécifiques (040-044)

| Script | Description |
|--------|-------------|
| `037-040_add_eleve_*.sql` | Ajout du rôle "eleve" à l'enum user_role |
| `042_update_sub_rooms_table.sql` | Mise à jour structure sub_rooms |
| `043_fix_seating_assignments_rls.sql` | Correction politiques RLS |
| `044_disable_rls_seating_assignments.sql` | Désactivation RLS (auth custom) |

### Scripts de Données et Diagnostic (045-049)

| Script | Description | Usage |
|--------|-------------|-------|
| `045_seed_demo_data.sql` | Données de démonstration complètes | Test / Démo |
| `046_verify_database_integrity.sql` | Diagnostic complet de la base | Maintenance |
| `047_reset_all_data.sql` | Supprime toutes les données (conserve schéma) | Reset |
| `048_export_data_for_migration.sql` | Génère les INSERT pour migration | Migration |
| `049_diagnostic_rls_policies.sql` | Diagnostique les RLS Policies en cas migration | Migration |

### Scripts TypeScript (utilitaires)

| Script | Description |
|--------|-------------|
| `create-vie-scolaire-profile.ts` | Crée un compte vie-scolaire |
| `test-resend.tsx` | Test configuration Resend (email) |
| `diagnostic-projet.ps1` | Diagnostic PowerShell du projet |

---

## 🚀 Guide de Migration Complète

### Scénario : Nouvelle Instance Supabase

```bash
# 1. Créer le schéma complet
# Exécuter dans SQL Editor de Supabase:
000_complete_schema.sql

# 2. (Optionnel) Ajouter des données de test
045_seed_demo_data.sql

# 3. Vérifier l'intégrité
046_verify_database_integrity.sql
```

### Scénario : Migration d'une Instance à une Autre

```bash
# Sur l'ANCIENNE instance:
# 1. Exporter les données
048_export_data_for_migration.sql
# 2. Copier les INSERT générés

# Sur la NOUVELLE instance:
# 3. Créer le schéma
000_complete_schema.sql

# 4. Exécuter les INSERT copiés

# 5. Vérifier
046_verify_database_integrity.sql
```

### Scénario : Reset pour Tests

```bash
# Supprimer toutes les données (garde le schéma)
047_reset_all_data.sql

# Recharger les données de test
045_seed_demo_data.sql
```

---

## 🗄️ Structure de la Base de Données

### Tables Principales

```
establishments          # Établissements scolaires
  └── profiles          # Comptes utilisateurs (auth)
  └── classes           # Classes
       └── students     # Élèves
  └── teachers          # Professeurs
       └── teacher_classes  # Associations prof-classe
  └── rooms             # Salles
       └── room_assignments  # Assignations salle-classe
       └── sub_rooms    # Plans personnalisés
            └── seating_assignments  # Places des élèves
  └── action_logs       # Journal d'audit
```

### Types Enum

- **user_role**: `vie-scolaire`, `professeur`, `delegue`, `eco-delegue`, `eleve`
- **sub_room_type**: `temporary`, `indeterminate`

### Fonctions Utilitaires

- `hash_password(text)` → Hache un mot de passe en SHA256
- `verify_password(text, text)` → Vérifie un mot de passe
- `update_updated_at_column()` → Trigger pour `updated_at`

---

## 🔑 Identifiants de Test

Après exécution de `045_seed_demo_data.sql`:

### Sainte-Marie (code: `stm001`)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Vie Scolaire | `vs.stmarie` | `VieScol2024!` |
| Professeur | `j.martin.stm` | `Prof2024!` |
| Professeur | `m.dupont.stm` | `Prof2024!` |
| Professeur | `p.bernard.stm` | `Prof2024!` |
| Délégué | `l.petit.del` | `Delegue2024!` |
| Éco-délégué | `e.moreau.eco` | `Delegue2024!` |

### Victor Hugo (code: `vh001`)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Vie Scolaire | `vs.vhugo` | `VieScol2024!` |
| Professeur | `s.leroy.vh` | `Prof2024!` |

---

## ⚠️ Notes Importantes

### Authentification Custom

L'application utilise une **authentification custom** (pas Supabase Auth) :
- Les mots de passe sont hashés en **SHA256** via `hash_password()`
- La vérification se fait via `verify_password()`
- Le **RLS est désactivé** - la sécurité est gérée au niveau applicatif

### Ordre d'Exécution

Les scripts numérotés doivent être exécutés dans l'ordre croissant. Le script `000_complete_schema.sql` est **autonome** et peut être exécuté seul pour créer tout le schéma.

### Sauvegarde

Avant toute opération destructive :
1. Exécuter `048_export_data_for_migration.sql`
2. Sauvegarder les INSERT générés
3. Tester la restauration sur une instance de test

---

## 🔧 Exécution des Scripts TypeScript

```bash
# Avec bun
bun run scripts/create-vie-scolaire-profile.ts

# Avec npx tsx
npx tsx scripts/create-vie-scolaire-profile.ts

# Variables d'environnement requises
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📞 Support

Pour tout problème :
1. Exécuter `046_verify_database_integrity.sql` pour diagnostic
2. Consulter les logs Supabase
3. Vérifier les variables d'environnement

---

*Dernière mise à jour: 2024-12-08*
