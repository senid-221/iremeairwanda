/**
 * Seed Rwanda administrative locations into the database.
 * Reads data from data/rwanda-admin/Rwanda-master/data.json (nested JSON).
 * Uses upsert so this script is safely rerunnable.
 *
 * JSON structure: { Province: { District: { Sector: { Cell: [Village, ...] } } } }
 */
require('dotenv').config();
var { PrismaClient } = require('@prisma/client');
var fs = require('fs');
var path = require('path');

var prisma = new PrismaClient();

/* ------------------------------------------------------------------ */
/*  Load the Rwanda admin data from the JSON file                      */
/* ------------------------------------------------------------------ */
function loadRwandaData() {
  var filePath = path.resolve(__dirname, '../../data/rwanda-admin/Rwanda-master/data.json');
  var raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Province name normalization: JSON uses short names, frontend uses full */
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

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
async function main() {
  console.log('Seeding Rwanda administrative locations...');
  var data = loadRwandaData();

  var provinceNames = Object.keys(data);
  console.log('Provinces found:', provinceNames.length);

  var provinceRecords = {};
  var districtRecords = {};
  var sectorRecords = {};
  var cellRecords = {};
  var totals = { provinces: 0, districts: 0, sectors: 0, cells: 0, villages: 0 };

  for (var pi = 0; pi < provinceNames.length; pi++) {
    var pShort = provinceNames[pi];
    var pName = fullProvinceName(pShort);
    var pCode = slug(pName);
    var pDistricts = data[pShort];

    var pRec = await prisma.province.upsert({
      where: { code: pCode },
      update: { name: pName, nameEn: pName, displayOrder: pi },
      create: {
        code: pCode,
        name: pName,
        nameEn: pName,
        nameRw: pName,
        displayOrder: pi,
        isActive: true,
      },
    });
    provinceRecords[pShort] = pRec;
    totals.provinces++;
    console.log('  Province:', pName, '->', pRec.id);

    var districtNames = Object.keys(pDistricts);
    for (var di = 0; di < districtNames.length; di++) {
      var dName = districtNames[di];
      var dCode = pCode + '-' + slug(dName);
      var dSectors = pDistricts[dName];

      var dRec = await prisma.district.upsert({
        where: { code: dCode },
        update: { name: dName, nameEn: dName, provinceId: pRec.id, displayOrder: di },
        create: {
          code: dCode,
          name: dName,
          nameEn: dName,
          nameRw: dName,
          provinceId: pRec.id,
          displayOrder: di,
          isActive: true,
        },
      });
      districtRecords[pShort + '|' + dName] = dRec;
      totals.districts++;

      var sectorNames = Object.keys(dSectors);
      for (var si = 0; si < sectorNames.length; si++) {
        var sName = sectorNames[si];
        var sCode = dCode + '-' + slug(sName);
        var sCells = dSectors[sName];

        var sRec = await prisma.sector.upsert({
          where: { code: sCode },
          update: { name: sName, nameEn: sName, districtId: dRec.id, displayOrder: si },
          create: {
            code: sCode,
            name: sName,
            nameEn: sName,
            nameRw: sName,
            districtId: dRec.id,
            displayOrder: si,
            isActive: true,
          },
        });
        sectorRecords[pShort + '|' + dName + '|' + sName] = sRec;
        totals.sectors++;

        var cellNames = Object.keys(sCells);
        for (var ci = 0; ci < cellNames.length; ci++) {
          var cName = cellNames[ci];
          var cCode = sCode + '-' + slug(cName);
          if (cCode.length > 200) cCode = cCode.substring(0, 200);
          var cVillages = sCells[cName];

          var cRec = await prisma.cell.upsert({
            where: { code: cCode },
            update: { name: cName, nameEn: cName, sectorId: sRec.id, displayOrder: ci },
            create: {
              code: cCode,
              name: cName,
              nameEn: cName,
              nameRw: cName,
              sectorId: sRec.id,
              displayOrder: ci,
              isActive: true,
            },
          });
          cellRecords[pShort + '|' + dName + '|' + sName + '|' + cName] = cRec;
          totals.cells++;

          for (var vi = 0; vi < cVillages.length; vi++) {
            var vName = cVillages[vi];
            var vCode = cCode + '-' + slug(vName);
            if (vCode.length > 200) vCode = vCode.substring(0, 200);

            await prisma.village.upsert({
              where: { code: vCode },
              update: { name: vName, nameEn: vName, cellId: cRec.id, displayOrder: vi },
              create: {
                code: vCode,
                name: vName,
                nameEn: vName,
                nameRw: vName,
                cellId: cRec.id,
                displayOrder: vi,
                isActive: true,
              },
            });
            totals.villages++;
          }
        }
      }
    }
  }

  console.log('Rwanda location seed complete.');
  console.log('Totals:', JSON.stringify(totals));
}

main()
  .catch(function (err) {
    console.error('Location seed error:', err);
    process.exit(1);
  })
  .finally(function () {
    prisma.$disconnect();
  });
