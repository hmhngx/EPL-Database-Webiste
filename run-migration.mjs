// Database Migration Runner
// Usage: node run-migration.mjs <migration-file-path>

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config();

const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ ERROR: Please provide a migration file path');
    console.error('Usage: node run-migration.mjs <migration-file-path>');
    process.exit(1);
}

const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
    console.error('❌ ERROR: SUPABASE_CONNECTION_STRING not found in .env');
    process.exit(1);
}

console.log('========================================');
console.log('Database Migration Runner');
console.log('========================================\n');

console.log(`✅ Migration file: ${migrationFile}`);

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database\n');
        
        console.log('Reading migration file...');
        const filePath = resolve(migrationFile);
        const sql = readFileSync(filePath, 'utf8');
        console.log(`✅ Read ${sql.length} characters\n`);
        
        console.log('Executing migration...');
        await client.query(sql);
        
        console.log('\n✅ Migration executed successfully!');
        console.log('========================================\n');
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nDetails:', error);
        console.error('========================================\n');
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
