var fs = require('fs');
var path = require('path');

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

var provinceNameMap = {
  'East': 'Eastern Province',
  'Kigali': 'Kigali City',
  'North': 'Northern Province',
  'South': 'Southern Province',
  'West': 'Western Province'
};

function fullProvinceName(shortName) {
  return provinceNameMap[shortName] || shortName;
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

var dataPath = path.join(__dirname, '..', '..', 'data', 'rwanda-admin', 'Rwanda-master', 'data.json');
var data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

var sql = [];
sql.push('-- Rwanda Administrative Locations SQL Import');
sql.push('-- Generated: ' + new Date().toISOString());
sql.push('-- Run this on Neon PostgreSQL database');
sql.push('');
sql.push('BEGIN;');
sql.push('');

var provinceIdx = 0;
var provinceNames = Object.keys(data);

sql.push('-- ============================================');
sql.push('-- PROVINCES (5)');
sql.push('-- ============================================');
sql.push('');

for (var pi = 0; pi < provinceNames.length; pi++) {
  var pShort = provinceNames[pi];
  var pName = fullProvinceName(pShort);
  var pCode = slug(pName);
  
  sql.push("INSERT INTO \"Province\" (id, code, name, \"nameEn\", \"nameRw\", \"displayOrder\", \"isActive\")");
  sql.push("VALUES (gen_random_uuid(), '" + escapeSql(pCode) + "', '" + escapeSql(pName) + "', '" + escapeSql(pName) + "', '" + escapeSql(pName) + "', " + pi + ", true)");
  sql.push("ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, \"nameEn\" = EXCLUDED.\"nameEn\", \"nameRw\" = EXCLUDED.\"nameRw\", \"displayOrder\" = EXCLUDED.\"displayOrder\";");
  sql.push('');
}

sql.push('-- ============================================');
sql.push('-- DISTRICTS');
sql.push('-- ============================================');
sql.push('');

for (var pi = 0; pi < provinceNames.length; pi++) {
  var pShort = provinceNames[pi];
  var pName = fullProvinceName(pShort);
  var pCode = slug(pName);
  var pDistricts = data[pShort];
  var districtNames = Object.keys(pDistricts);
  
  for (var di = 0; di < districtNames.length; di++) {
    var dName = districtNames[di];
    var dCode = pCode + '-' + slug(dName);
    
    sql.push("INSERT INTO \"District\" (id, code, name, \"nameEn\", \"nameRw\", \"provinceId\", \"displayOrder\", \"isActive\")");
    sql.push("VALUES (gen_random_uuid(), '" + escapeSql(dCode) + "', '" + escapeSql(dName) + "', '" + escapeSql(dName) + "', '" + escapeSql(dName) + "',");
    sql.push("  (SELECT id FROM \"Province\" WHERE code = '" + escapeSql(pCode) + "'), " + di + ", true)");
    sql.push("ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, \"nameEn\" = EXCLUDED.\"nameEn\", \"provinceId\" = EXCLUDED.\"provinceId\";");
    sql.push('');
  }
}

sql.push('-- ============================================');
sql.push('-- SECTORS');
sql.push('-- ============================================');
sql.push('');

for (var pi = 0; pi < provinceNames.length; pi++) {
  var pShort = provinceNames[pi];
  var pName = fullProvinceName(pShort);
  var pCode = slug(pName);
  var pDistricts = data[pShort];
  var districtNames = Object.keys(pDistricts);
  
  for (var di = 0; di < districtNames.length; di++) {
    var dName = districtNames[di];
    var dCode = pCode + '-' + slug(dName);
    var dSectors = pDistricts[dName];
    var sectorNames = Object.keys(dSectors);
    
    for (var si = 0; si < sectorNames.length; si++) {
      var sName = sectorNames[si];
      var sCode = dCode + '-' + slug(sName);
      
      sql.push("INSERT INTO \"Sector\" (id, code, name, \"nameEn\", \"nameRw\", \"districtId\", \"displayOrder\", \"isActive\")");
      sql.push("VALUES (gen_random_uuid(), '" + escapeSql(sCode) + "', '" + escapeSql(sName) + "', '" + escapeSql(sName) + "', '" + escapeSql(sName) + "',");
      sql.push("  (SELECT id FROM \"District\" WHERE code = '" + escapeSql(dCode) + "'), " + si + ", true)");
      sql.push("ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, \"nameEn\" = EXCLUDED.\"nameEn\", \"districtId\" = EXCLUDED.\"districtId\";");
      sql.push('');
    }
  }
}

sql.push('-- ============================================');
sql.push('-- CELLS');
sql.push('-- ============================================');
sql.push('');

for (var pi = 0; pi < provinceNames.length; pi++) {
  var pShort = provinceNames[pi];
  var pName = fullProvinceName(pShort);
  var pCode = slug(pName);
  var pDistricts = data[pShort];
  var districtNames = Object.keys(pDistricts);
  
  for (var di = 0; di < districtNames.length; di++) {
    var dName = districtNames[di];
    var dCode = pCode + '-' + slug(dName);
    var dSectors = pDistricts[dName];
    var sectorNames = Object.keys(dSectors);
    
    for (var si = 0; si < sectorNames.length; si++) {
      var sName = sectorNames[si];
      var sCode = dCode + '-' + slug(sName);
      var sCells = dSectors[sName];
      var cellNames = Object.keys(sCells);
      
      for (var ci = 0; ci < cellNames.length; ci++) {
        var cName = cellNames[ci];
        var cCode = sCode + '-' + slug(cName);
        
        sql.push("INSERT INTO \"Cell\" (id, code, name, \"nameEn\", \"nameRw\", \"sectorId\", \"displayOrder\", \"isActive\")");
        sql.push("VALUES (gen_random_uuid(), '" + escapeSql(cCode) + "', '" + escapeSql(cName) + "', '" + escapeSql(cName) + "', '" + escapeSql(cName) + "',");
        sql.push("  (SELECT id FROM \"Sector\" WHERE code = '" + escapeSql(sCode) + "'), " + ci + ", true)");
        sql.push("ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, \"nameEn\" = EXCLUDED.\"nameEn\", \"sectorId\" = EXCLUDED.\"sectorId\";");
        sql.push('');
      }
    }
  }
}

sql.push('-- ============================================');
sql.push('-- VILLAGES');
sql.push('-- ============================================');
sql.push('');

for (var pi = 0; pi < provinceNames.length; pi++) {
  var pShort = provinceNames[pi];
  var pName = fullProvinceName(pShort);
  var pCode = slug(pName);
  var pDistricts = data[pShort];
  var districtNames = Object.keys(pDistricts);
  
  for (var di = 0; di < districtNames.length; di++) {
    var dName = districtNames[di];
    var dCode = pCode + '-' + slug(dName);
    var dSectors = pDistricts[dName];
    var sectorNames = Object.keys(dSectors);
    
    for (var si = 0; si < sectorNames.length; si++) {
      var sName = sectorNames[si];
      var sCode = dCode + '-' + slug(sName);
      var sCells = dSectors[sName];
      var cellNames = Object.keys(sCells);
      
      for (var ci = 0; ci < cellNames.length; ci++) {
        var cName = cellNames[ci];
        var cCode = sCode + '-' + slug(cName);
        var villages = sCells[cName];
        
        for (var vi = 0; vi < villages.length; vi++) {
          var vName = villages[vi];
          var vCode = cCode + '-' + slug(vName);
          
          sql.push("INSERT INTO \"Village\" (id, code, name, \"nameEn\", \"nameRw\", \"cellId\", \"displayOrder\", \"isActive\")");
          sql.push("VALUES (gen_random_uuid(), '" + escapeSql(vCode) + "', '" + escapeSql(vName) + "', '" + escapeSql(vName) + "', '" + escapeSql(vName) + "',");
          sql.push("  (SELECT id FROM \"Cell\" WHERE code = '" + escapeSql(cCode) + "'), " + vi + ", true)");
          sql.push("ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, \"nameEn\" = EXCLUDED.\"nameEn\", \"cellId\" = EXCLUDED.\"cellId\";");
          sql.push('');
        }
      }
    }
  }
}

sql.push('COMMIT;');
sql.push('');
sql.push('-- Import complete!');

var outputPath = path.join(__dirname, 'import-locations.sql');
fs.writeFileSync(outputPath, sql.join('\n'), 'utf8');

console.log('SQL generated successfully!');
console.log('Output file:', outputPath);
console.log('File size:', (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2), 'MB');
console.log('');
console.log('To run on Neon:');
console.log('1. Open Neon SQL Editor: https://console.neon.tech');
console.log('2. Copy the contents of import-locations.sql');
console.log('3. Paste and execute');
console.log('');
console.log('Or use psql:');
console.log('psql -h <neon-host> -U <username> -d <database> -f import-locations.sql');
