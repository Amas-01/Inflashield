#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * Creates the PostgreSQL database if it doesn't exist
 * Checks PostgreSQL connectivity
 * Prepares database for migrations
 */

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set in .env file');
  console.error('   Please configure DATABASE_URL in .env\n');
  process.exit(1);
}

async function setupDatabase() {
  console.log('\n🔧 Setting up database...\n');

  // Parse connection string
  let url;
  try {
    url = new URL(DATABASE_URL);
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error.message);
    process.exit(1);
  }

  const dbName = url.pathname.slice(1); // Remove leading slash
  const masterUrl = DATABASE_URL.replace(`/${dbName}`, '/postgres');

  // Connect to postgres database (always exists)
  const masterClient = new Client({ 
    connectionString: masterUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('📡 Connecting to PostgreSQL server...');
    await masterClient.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check if database exists
    const result = await masterClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rowCount === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await masterClient.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Database created successfully\n');
    } else {
      console.log(`✅ Database "${dbName}" already exists\n`);
    }

    await masterClient.end();

    // Test connection to the app database
    console.log('🔌 Testing connection to application database...');
    const appClient = new Client({ 
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    
    await appClient.connect();
    const versionResult = await appClient.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ').slice(0, 2).join(' ');
    console.log(`✅ Connected! Running ${version}\n`);
    await appClient.end();

    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run db:push     (creates tables)');
    console.log('  2. Run: npm run dev         (starts development server)\n');

  } catch (error) {
    console.error('\n❌ Database setup failed:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   PostgreSQL server is not running or not accessible');
      console.error('\n   How to fix:');
      console.error('   • Start PostgreSQL: sudo systemctl start postgresql');
      console.error('   • Or install: sudo apt-get install postgresql\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ENETUNREACH') {
      console.error('   Cannot reach database server');
      console.error('   • Check your DATABASE_URL in .env');
      console.error('   • Ensure PostgreSQL is running');
      console.error('   • Check firewall settings\n');
    } else if (error.message.includes('password authentication failed')) {
      console.error('   Authentication failed');
      console.error('   • Check username/password in DATABASE_URL');
      console.error('   • Default is: postgres:postgres@localhost\n');
    } else {
      console.error(`   ${error.message}\n`);
    }
    
    process.exit(1);
  }
}

setupDatabase();
