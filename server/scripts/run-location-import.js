/**
 * Import Rwanda administrative locations from SQL file into Neon database.
 * Uses Prisma $executeRawUnsafe to run the generated SQL.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
var { PrismaClient } = require('@prisma/client');
var fs = require('fs');
var path = require('path');

var prisma = new PrismaClient();

async function main() {
  var sqlFile = path.resolve(__dirname, 'import-locations.sql');
  console.log('Reading SQL file:', sqlFile);

  var sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('SQL file size:', (sql.length / 1024 / 1024).toFixed(2), 'MB');

  // Split into chunks by statement to avoid query size limits
  // Remove BEGIN/COMMIT wrapper and split by semicolons
  console.log('Importing locations into Neon database...');
  console.log('This may take a few minutes for 14,000+ villages...\n');

  // Execute in batches - split by INSERT statements
  var statements = sql.split(';').filter(function(s) {
    var trimmed = s.trim();
    return trimmed.length > 0 &&
           trimmed !== 'BEGIN' &&
           trimmed !== 'COMMIT' &&
           !trimmed.startsWith('--') &&
           trimmed.includes('INSERT INTO');
  });

  console.log('Total INSERT statements:', statements.length);

  var completed = 0;
  var errors = 0;

  // Execute sequentially to avoid connection pool issues
  for (var i = 0; i < statements.length; i++) {
    try {
      await prisma.$executeRawUnsafe(statements[i] + ';');
      completed++;
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error('Error:', err.message);
        console.error('Statement:', statements[i].substring(0, 100), '...');
      }
    }

    // Progress update every 500 statements
    if ((i + 1) % 500 === 0 || i === statements.length - 1) {
      var pct = (((i + 1) / statements.length) * 100).toFixed(1);
      console.log('Progress: ' + (i + 1) + '/' + statements.length + ' (' + pct + '%) | Success: ' + completed + ' | Errors: ' + errors);
    }
  }

  console.log('\n\nImport complete!');
  console.log('  Total statements:', statements.length);
  console.log('  Successful:', completed);
  console.log('  Errors:', errors);

  // Verify counts
  var provinces = await prisma.province.count();
  var districts = await prisma.district.count();
  var sectors = await prisma.sector.count();
  var cells = await prisma.cell.count();
  var villages = await prisma.village.count();

  console.log('\nDatabase counts:');
  console.log('  Provinces:', provinces);
  console.log('  Districts:', districts);
  console.log('  Sectors:', sectors);
  console.log('  Cells:', cells);
  console.log('  Villages:', villages);
}

main()
  .catch(function(err) {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(function() {
    return prisma.$disconnect();
  });
