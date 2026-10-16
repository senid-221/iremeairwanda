var { PrismaClient } = require('@prisma/client');
var fs = require('fs');
var path = require('path');

var prisma = new PrismaClient();

var OSM_LEVEL_MAP = {
  'school': 'secondary',
  'university': 'tertiary',
  'kindergarten': 'primary',
  'college': 'tertiary',
  'pre_primary': 'primary'
};

async function importSchools() {
  console.log('=== IREME School Import Pipeline ===\n');

  var dataPath = path.join(__dirname, '..', '..', 'data', 'schools-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('School data file not found:', dataPath);
    process.exit(1);
  }

  var rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log('Source:', rawData.source);
  console.log('License:', rawData.license);
  console.log('Snapshot:', rawData.snapshot);
  console.log('Total features:', rawData.totalFeatures);
  console.log('Named schools:', rawData.namedSchools);
  console.log('Schools to import:', rawData.schools.length);

  var provinces = await prisma.province.findMany({ select: { id: true, name: true, nameEn: true } });
  var districts = await prisma.district.findMany({ select: { id: true, name: true, nameEn: true, provinceId: true } });
  var sectors = await prisma.sector.findMany({ select: { id: true, name: true, nameEn: true, districtId: true } });

  var provinceMap = {};
  provinces.forEach(function(p) {
    provinceMap[p.name.toLowerCase()] = p;
    provinceMap[p.nameEn.toLowerCase()] = p;
  });

  var districtMap = {};
  districts.forEach(function(d) {
    districtMap[d.name.toLowerCase()] = d;
    districtMap[d.nameEn.toLowerCase()] = d;
  });

  var sectorMap = {};
  sectors.forEach(function(s) {
    sectorMap[s.name.toLowerCase()] = s;
    sectorMap[s.nameEn.toLowerCase()] = s;
  });

  console.log('\nLocation references loaded:');
  console.log('  Provinces:', provinces.length);
  console.log('  Districts:', districts.length);
  console.log('  Sectors:', sectors.length);

  var stats = {
    total: rawData.schools.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    noLocation: 0,
    noName: 0
  };

  console.log('\nImporting schools...');

  for (var i = 0; i < rawData.schools.length; i++) {
    var school = rawData.schools[i];

    if ((i + 1) % 100 === 0) {
      console.log('  Progress:', (i + 1), '/', rawData.schools.length);
    }

    if (!school.name || school.name.trim() === '') {
      stats.noName++;
      stats.skipped++;
      continue;
    }

    try {
      var provinceId = null;
      var districtId = null;
      var sectorId = null;

      if (school.province) {
        var prov = provinceMap[school.province.toLowerCase()];
        if (prov) provinceId = prov.id;
      }

      if (school.district) {
        var dist = districtMap[school.district.toLowerCase()];
        if (dist) {
          districtId = dist.id;
          if (!provinceId) provinceId = dist.provinceId;
        }
      }

      if (school.sector) {
        var sect = sectorMap[school.sector.toLowerCase()];
        if (sect) {
          sectorId = sect.id;
          if (!districtId) {
            var parentDist = districts.find(function(d) { return d.id === sect.districtId; });
            if (parentDist) {
              districtId = parentDist.id;
              if (!provinceId) provinceId = parentDist.provinceId;
            }
          }
        }
      }

      if (!provinceId && !districtId) {
        stats.noLocation++;
      }

      var schoolCode = 'OSM-' + school.id.replace(/[^a-zA-Z0-9]/g, '');
      var schoolType = OSM_LEVEL_MAP[school.level] || 'secondary';
      var ownership = school.ownership || 'private';

      var existingSchool = await prisma.school.findFirst({
        where: {
          OR: [
            { code: schoolCode },
            { name: school.name }
          ]
        }
      });

      if (existingSchool) {
        await prisma.school.update({
          where: { id: existingSchool.id },
          data: {
            name: school.name,
            nameEn: school.name_en || school.name,
            nameRw: school.name_rw || null,
            schoolType: schoolType,
            ownership: ownership,
            isVerified: true,
            verifiedAt: new Date(),
            status: 'active',
            registrationStatus: 'approved'
          }
        });

        var existingLocation = await prisma.schoolLocation.findUnique({
          where: { schoolId: existingSchool.id }
        });

        if (existingLocation) {
          await prisma.schoolLocation.update({
            where: { schoolId: existingSchool.id },
            data: {
              province: school.province || null,
              district: school.district || null,
              sector: school.sector || null,
              provinceId: provinceId,
              districtId: districtId,
              sectorId: sectorId
            }
          });
        } else {
          await prisma.schoolLocation.create({
            data: {
              schoolId: existingSchool.id,
              province: school.province || null,
              district: school.district || null,
              sector: school.sector || null,
              provinceId: provinceId,
              districtId: districtId,
              sectorId: sectorId
            }
          });
        }

        stats.updated++;
      } else {
        var newSchool = await prisma.school.create({
          data: {
            code: schoolCode,
            name: school.name,
            nameEn: school.name_en || school.name,
            nameRw: school.name_rw || null,
            schoolType: schoolType,
            ownership: ownership,
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: 'osm-import',
            status: 'active',
            registrationStatus: 'approved',
            registeredAt: new Date(),
            registeredBy: 'osm-import'
          }
        });

        await prisma.schoolLocation.create({
          data: {
            schoolId: newSchool.id,
            province: school.province || null,
            district: school.district || null,
            sector: school.sector || null,
            provinceId: provinceId,
            districtId: districtId,
            sectorId: sectorId
          }
        });

        stats.imported++;
      }
    } catch (err) {
      console.error('  Failed to import school:', school.name, err.message);
      stats.failed++;
    }
  }

  console.log('\n=== Import Complete ===');
  console.log('Total processed:', stats.total);
  console.log('Newly imported:', stats.imported);
  console.log('Updated:', stats.updated);
  console.log('Skipped (no name):', stats.noName);
  console.log('No location match:', stats.noLocation);
  console.log('Failed:', stats.failed);

  var totalSchools = await prisma.school.count();
  var verifiedSchools = await prisma.school.count({ where: { isVerified: true } });
  console.log('\nDatabase totals:');
  console.log('  Total schools:', totalSchools);
  console.log('  Verified schools:', verifiedSchools);

  await prisma.$disconnect();
}

importSchools().catch(function(err) {
  console.error('Import failed:', err);
  process.exit(1);
});
