require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { getPool } = require('../src/config/database');

async function runMigrations() {
  try {
    const pool = await getPool();
    console.log('Connected to Azure SQL Database.');

    const sqlFile = fs.readFileSync(
      path.join(__dirname, '001_create_tables.sql'),
      'utf8'
    );

    // Split by GO statements and execute each batch
    const batches = sqlFile.split(/\bGO\b/i).filter((b) => b.trim());

    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
