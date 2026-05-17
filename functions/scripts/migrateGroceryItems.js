/*
 * One-time grocery migration.
 *
 * Dry run:
 *   node scripts/migrateGroceryItems.js --dry-run
 *
 * Apply:
 *   node scripts/migrateGroceryItems.js --apply
 *
 * Before applying, export or back up Firestore. This script updates only
 * users/{uid}.currentMeals.groceries arrays that still contain string items.
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const {
  hasLegacyGroceryStrings,
  migrateMealPlanGroceries
} = require("../src/normalizers/groceryNormalizer");

const apply = process.argv.includes("--apply");
const dryRun = !apply;

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function run() {
  console.log(`Optimeal grocery migration starting in ${dryRun ? "dry-run" : "apply"} mode.`);
  console.log("Back up Firestore before running with --apply.");

  const usersSnap = await db.collection("users").get();
  let scanned = 0;
  let candidates = 0;
  let updated = 0;
  let batch = db.batch();
  let writesInBatch = 0;

  for (const docSnap of usersSnap.docs) {
    scanned += 1;
    const data = docSnap.data();

    if (!hasLegacyGroceryStrings(data.currentMeals)) {
      continue;
    }

    candidates += 1;
    const migratedPlan = migrateMealPlanGroceries(data.currentMeals, new Date().toISOString());
    console.log(`[${dryRun ? "dry-run" : "apply"}] ${docSnap.id}: legacy grocery strings found.`);

    if (dryRun) {
      continue;
    }

    batch.update(docSnap.ref, {
      currentMeals: migratedPlan,
      groceryItemsMigratedAt: FieldValue.serverTimestamp()
    });
    writesInBatch += 1;
    updated += 1;

    if (writesInBatch >= 450) {
      await batch.commit();
      batch = db.batch();
      writesInBatch = 0;
    }
  }

  if (!dryRun && writesInBatch > 0) {
    await batch.commit();
  }

  console.log(`Scanned users: ${scanned}`);
  console.log(`Users needing migration: ${candidates}`);
  console.log(`Users updated: ${updated}`);
  console.log("Migration complete.");
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
