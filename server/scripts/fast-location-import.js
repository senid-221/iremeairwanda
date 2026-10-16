/**
 * Fast location import using pg directly with batch inserts
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
var { Client } = require('pg');
var fs = require('fs');
var path = require('path');

async function main() {
  console.log('Starting fast location import...');
  
  var client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  console.log('Connected to database');

  // Read the SQL file
  var sqlFile = path.resolve(__dirname, 'import-locations.sql');
  var sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('SQL file loaded:', (sql.length / 1024 / 1024).toFixed(2), 'MB');

  // Split into individual statements
  var statements = sql.split(';')
    .map(function(s) { return s.trim(); })
    .filter(function(s) { 
      return s.length > 0 && 
             s !== 'BEGIN' && 
             s !== 'COMMIT' && 
             !s.startsWith('--') &&
             s.includes('INSERT INTO');
    });

  console.log('Total statements:', statements.length);
  console.log('Importing in batches...\n');

  var completed = 0;
  var errors = 0;
  var batchSize = 50;

  // Process in batches using transactions
  for (var i = 0; i < statements.length; i += batchSize) {
    var batch = statements.slice(i, i + batchSize);
    
    await client.query('BEGIN');
    
    for (var j = 0; j < batch.length; j++) {
      try {
        await client.query(batch[j]);
        completed++;
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.error('Error:', err.message);
        }
      }
    }
    
    await client.query('COMMIT');

    // Progress update
    var progress = Math.min(i + batchSize, statements.length);
    var pct = ((progress / statements.length) * 100).toFixed(1);
    if (progress % 500 === 0 || progress === statements.length) {
      console.log('Progress: ' + progress + '/' + statements.length + ' (' + pct + '%) | Success: ' + completed + ' | Errors: ' + errors);
    }
  }

  console.log('\nImport complete!');
  console.log('  Total:', statements.length);
  console.log('  Success:', completed);
  console.log('  Errors:', errors);

  // Verify counts
  var counts = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM "Province") as provinces,
      (SELECT COUNT(*) FROM "District") as districts,
      (SELECT COUNT(*) FROM "Sector") as sectors,
      (SELECT COUNT(*) FROM "Cell") as cells,
      (SELECT COUNT(*) FROM "Village") as villages
  `);

  console.log('\nDatabase counts:');
  console.log('  Provinces:', counts.rows[0].provinces);
  console.log('  Districts:', counts.rows[0].districts);
  console.log('  Sectors:', counts.rows[0].sectors);
  console.log('  Cells:', counts.rows[0].cells);
  console.log('  Villages:', counts.rows[0].villages);

  await client.end();
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
