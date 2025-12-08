/**
 * Script de vérification post-migration
 * Vérifie que la base de données est correctement configurée
 * 
 * Usage:
 *   bun run scripts/verify-migration.ts
 *   npx tsx scripts/verify-migration.ts
 * 
 * Variables d'environnement requises:
 *   SUPABASE_URL ou SUPABASE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Configuration
const supabaseUrl = process.env.SUPABASE_SUPABASE_URL || process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables d'environnement Supabase manquantes")
  console.error("   Requis: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey)

interface CheckResult {
  name: string
  status: "ok" | "warning" | "error"
  message: string
  details?: any
}

const results: CheckResult[] = []

// Couleurs pour la console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function addResult(result: CheckResult) {
  results.push(result)
  const icon = result.status === "ok" ? "✅" : result.status === "warning" ? "⚠️" : "❌"
  const color = result.status === "ok" ? colors.green : result.status === "warning" ? colors.yellow : colors.red
  log(`  ${icon} ${result.name}: ${result.message}`, color)
}

// ============================================================================
// VÉRIFICATIONS
// ============================================================================

async function checkTables() {
  log("\n📋 Vérification des tables...", colors.blue)
  
  const requiredTables = [
    "establishments",
    "profiles", 
    "classes",
    "students",
    "teachers",
    "teacher_classes",
    "rooms",
    "room_assignments",
    "sub_rooms",
    "seating_assignments",
    "action_logs"
  ]

  for (const table of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
      
      if (error) {
        addResult({
          name: table,
          status: "error",
          message: `Table non accessible: ${error.message}`
        })
      } else {
        addResult({
          name: table,
          status: "ok",
          message: `${count ?? 0} enregistrements`
        })
      }
    } catch (err) {
      addResult({
        name: table,
        status: "error",
        message: `Erreur: ${err}`
      })
    }
  }
}

async function checkFunctions() {
  log("\n⚙️  Vérification des fonctions...", colors.blue)
  
  // Test hash_password
  try {
    const { data, error } = await supabase.rpc("hash_password", { 
      password: "TestPassword123!" 
    })
    
    if (error) {
      addResult({
        name: "hash_password()",
        status: "error",
        message: `Fonction non disponible: ${error.message}`
      })
    } else if (data && typeof data === "string" && data.length === 64) {
      addResult({
        name: "hash_password()",
        status: "ok",
        message: "Fonction opérationnelle (SHA256)"
      })
    } else {
      addResult({
        name: "hash_password()",
        status: "warning",
        message: `Résultat inattendu: ${data}`
      })
    }
  } catch (err) {
    addResult({
      name: "hash_password()",
      status: "error",
      message: `Erreur: ${err}`
    })
  }

  // Test verify_password
  try {
    const testHash = await supabase.rpc("hash_password", { password: "Test123" })
    if (testHash.data) {
      const { data, error } = await supabase.rpc("verify_password", {
        password: "Test123",
        password_hash: testHash.data
      })
      
      if (error) {
        addResult({
          name: "verify_password()",
          status: "error",
          message: `Fonction non disponible: ${error.message}`
        })
      } else if (data === true) {
        addResult({
          name: "verify_password()",
          status: "ok",
          message: "Fonction opérationnelle"
        })
      } else {
        addResult({
          name: "verify_password()",
          status: "warning",
          message: `Résultat inattendu: ${data}`
        })
      }
    }
  } catch (err) {
    addResult({
      name: "verify_password()",
      status: "error",
      message: `Erreur: ${err}`
    })
  }
}

async function checkRelations() {
  log("\n🔗 Vérification des relations...", colors.blue)
  
  // Vérifier profils orphelins
  const { data: orphanProfiles, error: err1 } = await supabase
    .from("profiles")
    .select("id, username, establishment_id")
    .is("establishment_id", null)
  
  if (err1) {
    addResult({
      name: "Profils → Établissements",
      status: "error",
      message: `Erreur de vérification: ${err1.message}`
    })
  } else if (orphanProfiles && orphanProfiles.length > 0) {
    addResult({
      name: "Profils → Établissements",
      status: "warning",
      message: `${orphanProfiles.length} profils sans établissement`,
      details: orphanProfiles
    })
  } else {
    addResult({
      name: "Profils → Établissements",
      status: "ok",
      message: "Toutes les relations valides"
    })
  }

  // Vérifier élèves orphelins
  const { data: orphanStudents, error: err2 } = await supabase
    .from("students")
    .select("id, first_name, last_name, establishment_id")
    .is("establishment_id", null)
  
  if (err2) {
    addResult({
      name: "Élèves → Établissements",
      status: "error",
      message: `Erreur de vérification: ${err2.message}`
    })
  } else if (orphanStudents && orphanStudents.length > 0) {
    addResult({
      name: "Élèves → Établissements",
      status: "warning",
      message: `${orphanStudents.length} élèves sans établissement`,
      details: orphanStudents
    })
  } else {
    addResult({
      name: "Élèves → Établissements",
      status: "ok",
      message: "Toutes les relations valides"
    })
  }
}

async function checkTestAccounts() {
  log("\n🔑 Vérification des comptes de test...", colors.blue)
  
  const testAccounts = [
    { username: "vs.stmarie", role: "vie-scolaire", password: "VieScol2024!" },
    { username: "j.martin.stm", role: "professeur", password: "Prof2024!" },
    { username: "l.petit.del", role: "delegue", password: "Delegue2024!" },
  ]

  for (const account of testAccounts) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, role, password_hash")
      .eq("username", account.username)
      .single()

    if (error || !profile) {
      addResult({
        name: account.username,
        status: "warning",
        message: "Compte non trouvé (exécuter 045_seed_demo_data.sql)"
      })
    } else {
      // Vérifier le mot de passe
      const { data: isValid } = await supabase.rpc("verify_password", {
        password: account.password,
        password_hash: profile.password_hash
      })

      if (isValid) {
        addResult({
          name: account.username,
          status: "ok",
          message: `${account.role} - authentification OK`
        })
      } else {
        addResult({
          name: account.username,
          status: "warning",
          message: `${account.role} - mot de passe différent`
        })
      }
    }
  }
}

async function printSummary() {
  log("\n" + "=".repeat(50), colors.blue)
  log("RÉSUMÉ DE LA VÉRIFICATION", colors.blue)
  log("=".repeat(50), colors.blue)
  
  const okCount = results.filter(r => r.status === "ok").length
  const warningCount = results.filter(r => r.status === "warning").length
  const errorCount = results.filter(r => r.status === "error").length
  
  log(`\n  ✅ Succès:       ${okCount}`, colors.green)
  log(`  ⚠️  Avertissements: ${warningCount}`, colors.yellow)
  log(`  ❌ Erreurs:       ${errorCount}`, colors.red)
  
  if (errorCount > 0) {
    log("\n❌ Des erreurs ont été détectées.", colors.red)
    log("   Actions recommandées:", colors.dim)
    log("   1. Exécuter 000_complete_schema.sql", colors.dim)
    log("   2. Exécuter 045_seed_demo_data.sql", colors.dim)
    log("   3. Relancer cette vérification", colors.dim)
  } else if (warningCount > 0) {
    log("\n⚠️  Avertissements détectés mais base fonctionnelle.", colors.yellow)
  } else {
    log("\n✅ Base de données correctement configurée !", colors.green)
  }
  
  log("\n" + "=".repeat(50), colors.blue)
}

// ============================================================================
// EXÉCUTION
// ============================================================================

async function main() {
  log("=".repeat(50), colors.blue)
  log("🔍 VÉRIFICATION POST-MIGRATION", colors.blue)
  log("=".repeat(50), colors.blue)
  log(`\nURL Supabase: ${supabaseUrl}`, colors.dim)
  log(`Date: ${new Date().toISOString()}`, colors.dim)
  
  await checkTables()
  await checkFunctions()
  await checkRelations()
  await checkTestAccounts()
  await printSummary()
}

main().catch(console.error)
