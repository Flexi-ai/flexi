import { Database } from 'bun:sqlite';

async function migrate() {
  const db = new Database('data.sqlite');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS test_table (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database migrations completed successfully');
  db.close();
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
