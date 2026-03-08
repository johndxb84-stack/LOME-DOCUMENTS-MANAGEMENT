require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../src/config/database');

async function seed() {
  try {
    const pool = await getPool();
    console.log('Connected to Azure SQL Database.');

    // Create default admin user
    const passwordHash = await bcrypt.hash('Admin@2024!', 12);

    await pool
      .request()
      .input('email', sql.NVarChar, 'admin@loreal-lome.com')
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('full_name', sql.NVarChar, 'System Administrator')
      .input('role', sql.NVarChar, 'admin')
      .input('company', sql.NVarChar, "L'Oreal Middle East")
      .input('country', sql.NVarChar, 'UAE')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Users WHERE email = @email)
        INSERT INTO Users (email, password_hash, full_name, role, company, country)
        VALUES (@email, @password_hash, @full_name, @role, @company, @country)
      `);

    console.log('Seed completed. Default admin: admin@loreal-lome.com');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
