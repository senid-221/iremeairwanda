/**
 * IREME Rwanda - Comprehensive Curriculum Seed Script
 *
 * Seeds missing primary subjects, lower/upper secondary subjects,
 * S4-S6 subject combinations, TTC programmes, and TVET trades.
 *
 * Safe to run multiple times (idempotent via upsert patterns).
 *
 * Usage:  node seed-curriculum.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REVIEWED_AT = new Date('2026-10-15');
const REB_PRIMARY = 'REB Primary Curriculum Framework';
const REB_ORDINARY = 'REB Ordinary Level Curriculum';
const REB_ADVANCED = 'REB Advanced Level Curriculum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up education levels by their codes and return a map of code -> record.
 */
async function loadLevelsByCodes(codes) {
  const map = {};
  for (const code of codes) {
    const level = await prisma.educationLevel.findUnique({ where: { code } });
    if (level) {
      map[code] = level;
    } else {
      console.warn(`  [WARN] Education level not found: ${code}`);
    }
  }
  return map;
}

/**
 * Look up subjects by their codes and return a map of code -> record.
 */
async function loadSubjectsByCodes(codes) {
  const map = {};
  for (const code of codes) {
    const subject = await prisma.subject.findUnique({ where: { code } });
    if (subject) {
      map[code] = subject;
    } else {
      console.warn(`  [WARN] Subject not found: ${code}`);
    }
  }
  return map;
}

/**
 * Upsert a subject and then link it to the requested education levels via
 * LevelSubject rows (idempotent).
 */
async function upsertSubjectWithLevels(subjectDef, levelMap) {
  const saved = await prisma.subject.upsert({
    where: { code: subjectDef.code },
    update: {
      name: subjectDef.name,
      nameEn: subjectDef.nameEn,
      nameRw: subjectDef.nameRw,
      subjectType: subjectDef.subjectType,
      sourceName: subjectDef.sourceName,
      verificationStatus: subjectDef.verificationStatus || 'verified',
      lastReviewedAt: REVIEWED_AT,
      isActive: true,
    },
    create: {
      code: subjectDef.code,
      name: subjectDef.name,
      nameEn: subjectDef.nameEn,
      nameRw: subjectDef.nameRw,
      subjectType: subjectDef.subjectType,
      sourceName: subjectDef.sourceName,
      verificationStatus: subjectDef.verificationStatus || 'verified',
      lastReviewedAt: REVIEWED_AT,
    },
  });

  let displayOrder = 0;
  for (const levelCode of subjectDef.levels) {
    displayOrder++;
    const level = levelMap[levelCode];
    if (!level) continue;

    const isCore = (subjectDef.coreLevels || []).includes(levelCode);

    const existing = await prisma.levelSubject.findFirst({
      where: { educationLevelId: level.id, subjectId: saved.id, academicYearId: null },
    });

    if (existing) {
      await prisma.levelSubject.update({
        where: { id: existing.id },
        data: { isCore, displayOrder },
      });
    } else {
      await prisma.levelSubject.create({
        data: {
          educationLevelId: level.id,
          subjectId: saved.id,
          isCore,
          displayOrder,
        },
      });
    }
  }

  return saved;
}

// ---------------------------------------------------------------------------
// 1. Missing Primary subjects (P1-P3)
// ---------------------------------------------------------------------------
async function seedMissingPrimarySubjects(levelMap) {
  console.log('\n--- 1. Seeding missing Primary subjects (P1-P3) ---');

  const subjects = [
    {
      code: 'SET',
      name: 'Science and Elementary Technology',
      nameEn: 'Science and Elementary Technology',
      nameRw: "Ubumenyi n'Ikoranabuhanga",
      subjectType: 'science',
      sourceName: REB_PRIMARY,
      verificationStatus: 'verified',
      levels: ['P1', 'P2', 'P3'],
      coreLevels: ['P1', 'P2', 'P3'],
    },
    {
      code: 'SRS',
      name: 'Social and Religious Studies',
      nameEn: 'Social and Religious Studies',
      nameRw: "Imibereho Y'abantu n'Uburezi Bukomoka Ku Myemerere",
      subjectType: 'social',
      sourceName: REB_PRIMARY,
      verificationStatus: 'verified',
      levels: ['P1', 'P2', 'P3'],
      coreLevels: ['P1', 'P2', 'P3'],
    },
  ];

  for (const s of subjects) {
    await upsertSubjectWithLevels(s, levelMap);
    console.log(`  [OK] Subject ${s.code} - ${s.name}`);
  }

  // Also ensure existing primary subjects are marked core for P1-P6.
  // The existing seed already handles this, but we re-assert it here for
  // subjects that the original seed linked to P1-P6.
  const existingPrimaryCodes = [
    'MAT', 'ENG', 'KIN', 'RED', 'PED', 'ART',
  ];
  const primaryLevelCodes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

  for (const code of existingPrimaryCodes) {
    const subject = await prisma.subject.findUnique({ where: { code } });
    if (!subject) continue;
    for (const lc of primaryLevelCodes) {
      const level = levelMap[lc];
      if (!level) continue;
      const ls = await prisma.levelSubject.findFirst({
        where: { educationLevelId: level.id, subjectId: subject.id, academicYearId: null },
      });
      if (ls && !ls.isCore) {
        await prisma.levelSubject.update({
          where: { id: ls.id },
          data: { isCore: true },
        });
      }
    }
  }
  console.log('  [OK] Verified core flags for existing P1-P6 subjects');
}

// ---------------------------------------------------------------------------
// 2. Lower Secondary subjects (S1-S3)
// ---------------------------------------------------------------------------
async function seedLowerSecondarySubjects(levelMap) {
  console.log('\n--- 2. Seeding Lower Secondary subjects (S1-S3) ---');

  const subjects = [
    {
      code: 'PHY1',
      name: 'Physics I',
      nameEn: 'Physics I',
      nameRw: 'Fiziki I',
      subjectType: 'science',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'CHE1',
      name: 'Chemistry I',
      nameEn: 'Chemistry I',
      nameRw: 'Shimi I',
      subjectType: 'science',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'BIO1',
      name: 'Biology I',
      nameEn: 'Biology I',
      nameRw: 'Biyoloji I',
      subjectType: 'science',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'HSC',
      name: 'History and Citizenship',
      nameEn: 'History and Citizenship',
      nameRw: "Amateka n'Ubwenegihugu",
      subjectType: 'social',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'GEO1',
      name: 'Geography and Environment',
      nameEn: 'Geography and Environment',
      nameRw: "Geografi n'Ibidukikije",
      subjectType: 'social',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'ENT1',
      name: 'Entrepreneurship I',
      nameEn: 'Entrepreneurship I',
      nameRw: 'Ubucuruzi I',
      subjectType: 'commerce',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'KIS',
      name: 'Kiswahili',
      nameEn: 'Kiswahili',
      nameRw: 'Igiswahili',
      subjectType: 'language',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'ICT1',
      name: 'ICT',
      nameEn: 'ICT',
      nameRw: 'Ikoranabuhanga',
      subjectType: 'vocational',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'LIT',
      name: 'Literature in English',
      nameEn: 'Literature in English',
      nameRw: 'Literature mu Icyongereza',
      subjectType: 'language',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'MDD',
      name: 'Music, Dance and Drama',
      nameEn: 'Music, Dance and Drama',
      nameRw: "Umuziki, Imbyino n'Amakinamico",
      subjectType: 'arts',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
    {
      code: 'RES',
      name: 'Religion and Ethics',
      nameEn: 'Religion and Ethics',
      nameRw: "Imyemerere n'Indangagaciro",
      subjectType: 'social',
      sourceName: REB_ORDINARY,
      verificationStatus: 'verified',
      levels: ['S1', 'S2', 'S3'],
      coreLevels: [],
    },
  ];

  for (const s of subjects) {
    await upsertSubjectWithLevels(s, levelMap);
    console.log(`  [OK] Subject ${s.code} - ${s.name}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Upper Secondary subjects (S4-S6)
// ---------------------------------------------------------------------------
async function seedUpperSecondarySubjects(levelMap) {
  console.log('\n--- 3. Seeding Upper Secondary subjects (S4-S6) ---');

  const subjects = [
    {
      code: 'LIT2',
      name: 'Literature in English',
      nameEn: 'Literature in English',
      nameRw: 'Literature mu Icyongereza',
      subjectType: 'language',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'PSY',
      name: 'Psychology',
      nameEn: 'Psychology',
      nameRw: 'Sikoloji',
      subjectType: 'social',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'PED2',
      name: 'Physical Education and Sports',
      nameEn: 'Physical Education and Sports',
      nameRw: "Imyitozo Ngororamubiri n'Imikino",
      subjectType: 'arts',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'GSC',
      name: 'General Studies and Communication Skills',
      nameEn: 'General Studies and Communication Skills',
      nameRw: "Amasomo Rusange n'Ubumenyi bwo Gushikiriza",
      subjectType: 'core',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'KIN2',
      name: 'Kinyarwanda',
      nameEn: 'Kinyarwanda',
      nameRw: 'Ikinyarwanda',
      subjectType: 'language',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'FRE2',
      name: 'French',
      nameEn: 'French',
      nameRw: 'Igifaransa',
      subjectType: 'language',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
    {
      code: 'KIS2',
      name: 'Kiswahili',
      nameEn: 'Kiswahili',
      nameRw: 'Igiswahili',
      subjectType: 'language',
      sourceName: REB_ADVANCED,
      verificationStatus: 'verified',
      levels: ['S4', 'S5', 'S6'],
      coreLevels: [],
    },
  ];

  for (const s of subjects) {
    await upsertSubjectWithLevels(s, levelMap);
    console.log(`  [OK] Subject ${s.code} - ${s.name}`);
  }
}

// ---------------------------------------------------------------------------
// 4. S4-S6 Subject Combinations
// ---------------------------------------------------------------------------
async function seedSubjectCombinations(levelMap) {
  console.log('\n--- 4. Seeding S4-S6 Subject Combinations ---');

  // We need to resolve subject IDs for combination-specific and core subjects.
  // Core subjects that apply to ALL combinations:
  const coreSubjectCodes = ['MAT', 'ENG', 'ICT1', 'ENT1', 'GSC'];

  // For S4-S6, ICT may also be referenced as COM (Computer Science at A-level).
  // We use ICT1 (the O-level ICT subject) as the core ICT for combinations,
  // but also fall back to COM if ICT1 is not found.
  const subjectMap = await loadSubjectsByCodes([
    ...coreSubjectCodes,
    'COM',
    // Combination-specific subjects
    'CHE', 'BIO', 'PHY', 'ECO', 'GEO', 'HIS', 'LIT2', 'KIN2', 'FRE2',
  ]);

  // Determine which core subjects are actually available
  const resolvedCoreCodes = coreSubjectCodes.filter((c) => subjectMap[c]);
  // If ICT1 is missing but COM exists, use COM as the ICT core subject
  if (!subjectMap['ICT1'] && subjectMap['COM']) {
    resolvedCoreCodes.push('COM');
  }

  const combinations = [
    {
      code: 'MCB',
      name: 'Mathematics-Chemistry-Biology',
      nameEn: 'Mathematics-Chemistry-Biology',
      nameRw: 'Imibare-Shimi-Biyoloji',
      description: 'Science combination focusing Mathematics, Chemistry and Biology',
      combinationType: 'science',
      specificSubjects: ['CHE', 'BIO'],
    },
    {
      code: 'PCB',
      name: 'Physics-Chemistry-Biology',
      nameEn: 'Physics-Chemistry-Biology',
      nameRw: 'Fiziki-Shimi-Biyoloji',
      description: 'Pure science combination with Physics, Chemistry and Biology',
      combinationType: 'science',
      specificSubjects: ['PHY', 'CHE', 'BIO'],
    },
    {
      code: 'MEG',
      name: 'Mathematics-Economics-Geography',
      nameEn: 'Mathematics-Economics-Geography',
      nameRw: 'Imibare-Ubukungu-Geografi',
      description: 'Commerce combination focusing Mathematics, Economics and Geography',
      combinationType: 'commerce',
      specificSubjects: ['ECO', 'GEO'],
    },
    {
      code: 'MEG_H',
      name: 'Mathematics-Economics-Geography with History',
      nameEn: 'Mathematics-Economics-Geography with History',
      nameRw: "Imibare-Ubukungu-Geografi n'Amateka",
      description: 'Commerce combination with added History',
      combinationType: 'commerce',
      specificSubjects: ['ECO', 'GEO', 'HIS'],
    },
    {
      code: 'MPC',
      name: 'Mathematics-Physics-Computer Science',
      nameEn: 'Mathematics-Physics-Computer Science',
      nameRw: "Imibare-Fiziki-Ikoranabuhanga",
      description: 'Technology-oriented combination with Mathematics, Physics and Computer Science',
      combinationType: 'science',
      specificSubjects: ['PHY', 'COM'],
    },
    {
      code: 'MEP',
      name: 'Mathematics-Economics-Entrepreneurship',
      nameEn: 'Mathematics-Economics-Entrepreneurship',
      nameRw: "Imibare-Ubukungu-Ubucuruzi",
      description: 'Business combination focusing Mathematics, Economics and Entrepreneurship',
      combinationType: 'commerce',
      specificSubjects: ['ECO'],
    },
    {
      code: 'HLG',
      name: 'History-Literature-Geography',
      nameEn: 'History-Literature-Geography',
      nameRw: "Amateka-Literature-Geografi",
      description: 'Arts combination with History, Literature and Geography',
      combinationType: 'arts',
      specificSubjects: ['HIS', 'LIT2', 'GEO'],
    },
    {
      code: 'PKM',
      name: 'Physics-Kinyarwanda-Mathematics',
      nameEn: 'Physics-Kinyarwanda-Mathematics',
      nameRw: "Fiziki-Ikinyarwanda-Imibare",
      description: 'Mixed combination with Physics, Kinyarwanda and Mathematics',
      combinationType: 'mixed',
      specificSubjects: ['PHY', 'KIN2'],
    },
  ];

  // Create combinations for each of S4, S5, S6
  const seniorCodes = ['S4', 'S5', 'S6'];

  for (const levelCode of seniorCodes) {
    const level = levelMap[levelCode];
    if (!level) {
      console.warn(`  [WARN] Level ${levelCode} not found, skipping combinations`);
      continue;
    }

    for (const combo of combinations) {
      // Use a composite code that includes the level to keep each level distinct,
      // but the SubjectCombination model has a unique `code` field, so we
      // namespace: e.g. "MCB_S4", "MCB_S5", "MCB_S6".
      const comboCode = `${combo.code}_${levelCode}`;

      const savedCombo = await prisma.subjectCombination.upsert({
        where: { code: comboCode },
        update: {
          name: `${combo.name} (${levelCode})`,
          nameEn: `${combo.nameEn} (${levelCode})`,
          nameRw: `${combo.nameRw} (${levelCode})`,
          description: combo.description,
          combinationType: combo.combinationType,
          sourceName: REB_ADVANCED,
          verificationStatus: 'verified',
          educationLevelId: level.id,
          isActive: true,
        },
        create: {
          code: comboCode,
          name: `${combo.name} (${levelCode})`,
          nameEn: `${combo.nameEn} (${levelCode})`,
          nameRw: `${combo.nameRw} (${levelCode})`,
          description: combo.description,
          combinationType: combo.combinationType,
          sourceName: REB_ADVANCED,
          verificationStatus: 'verified',
          educationLevelId: level.id,
        },
      });

      // Build the full list of subjects for this combination:
      // core subjects + combination-specific subjects (deduplicated)
      const allSubjectCodes = [...new Set([...resolvedCoreCodes, ...combo.specificSubjects])];

      let displayOrder = 0;
      for (const subjCode of allSubjectCodes) {
        displayOrder++;
        const subject = subjectMap[subjCode];
        if (!subject) {
          console.warn(`    [WARN] Subject ${subjCode} not found for combination ${comboCode}`);
          continue;
        }

        const isRequired = true;

        // Use findFirst to avoid unique-constraint errors
        const existing = await prisma.combinationSubject.findFirst({
          where: { combinationId: savedCombo.id, subjectId: subject.id },
        });

        if (existing) {
          await prisma.combinationSubject.update({
            where: { id: existing.id },
            data: { isRequired, displayOrder },
          });
        } else {
          await prisma.combinationSubject.create({
            data: {
              combinationId: savedCombo.id,
              subjectId: subject.id,
              isRequired,
              displayOrder,
            },
          });
        }
      }

      console.log(`  [OK] Combination ${comboCode} - ${combo.name} (${allSubjectCodes.length} subjects)`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. TTC Programmes
// ---------------------------------------------------------------------------
async function seedTTCProgrammes(levelMap) {
  console.log('\n--- 5. Seeding TTC Programmes ---');

  const ttcLevel = levelMap['TTC'];
  if (!ttcLevel) {
    console.warn('  [WARN] TTC education level not found, skipping');
    return;
  }

  const programmes = [
    {
      code: 'ECLPE',
      name: 'Early Childhood and Lower Primary Education',
      nameEn: 'Early Childhood and Lower Primary Education',
      nameRw: "Uburezi Bw'Imfura N'Amashuri Abanza Yo Haso",
      description: 'Training teachers for early childhood and lower primary education',
      programmeType: 'ttc',
      durationYears: 3,
      awardingAuthority: 'Rwanda Education Board (REB)',
      verificationStatus: 'pending',
    },
    {
      code: 'SME',
      name: 'Science and Mathematics Education',
      nameEn: 'Science and Mathematics Education',
      nameRw: "Uburezi Bw'Ubumenyi n'Imibare",
      description: 'Training teachers specialised in Science and Mathematics',
      programmeType: 'ttc',
      durationYears: 3,
      awardingAuthority: 'Rwanda Education Board (REB)',
      verificationStatus: 'pending',
    },
    {
      code: 'SSE',
      name: 'Social Studies Education',
      nameEn: 'Social Studies Education',
      nameRw: "Uburezi Bw'Imibereho Y'abantu",
      description: 'Training teachers specialised in Social Studies',
      programmeType: 'ttc',
      durationYears: 3,
      awardingAuthority: 'Rwanda Education Board (REB)',
      verificationStatus: 'pending',
    },
    {
      code: 'SNIE',
      name: 'Special Needs and Inclusive Education',
      nameEn: 'Special Needs and Inclusive Education',
      nameRw: "Uburezi Bw'Abafite Ubumuga n'Uburezi Bukwiye Bose",
      description: 'Training teachers for special needs and inclusive education',
      programmeType: 'ttc',
      durationYears: 3,
      awardingAuthority: 'Rwanda Education Board (REB)',
      verificationStatus: 'pending',
    },
  ];

  for (const p of programmes) {
    await prisma.curriculumProgramme.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        nameEn: p.nameEn,
        nameRw: p.nameRw,
        description: p.description,
        programmeType: p.programmeType,
        durationYears: p.durationYears,
        awardingAuthority: p.awardingAuthority,
        sourceName: REB_PRIMARY,
        verificationStatus: p.verificationStatus,
        educationLevelId: ttcLevel.id,
        isActive: true,
      },
      create: {
        educationLevelId: ttcLevel.id,
        code: p.code,
        name: p.name,
        nameEn: p.nameEn,
        nameRw: p.nameRw,
        description: p.description,
        programmeType: p.programmeType,
        durationYears: p.durationYears,
        awardingAuthority: p.awardingAuthority,
        sourceName: REB_PRIMARY,
        verificationStatus: p.verificationStatus,
      },
    });
    console.log(`  [OK] TTC Programme ${p.code} - ${p.name}`);
  }
}

// ---------------------------------------------------------------------------
// 6. TVET Trades
// ---------------------------------------------------------------------------
async function seedTVETTrades(levelMap) {
  console.log('\n--- 6. Seeding TVET Trades ---');

  const tvetLevel = levelMap['TVET'];
  if (!tvetLevel) {
    console.warn('  [WARN] TVET education level not found, skipping');
    return;
  }

  // New TVET programmes
  const newTrades = [
    {
      code: 'SFT',
      name: 'Software Development',
      nameEn: 'Software Development',
      nameRw: "Gukora Porogaramu Z'Ikomeputa",
      description: 'Training in software development, programming and application design',
      tradeCategory: 'technology',
      qualificationLevel: 'L4',
      durationYears: 2,
    },
    {
      code: 'CUL',
      name: 'Culinary Arts',
      nameEn: 'Culinary Arts',
      nameRw: "Ubuhanzi Bw'Guteka",
      description: 'Training in professional cooking, food preparation and kitchen management',
      tradeCategory: 'hospitality',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'AUT',
      name: 'Automotive Technology',
      nameEn: 'Automotive Technology',
      nameRw: "Ikoranabuhanga Ry'Ibinyabiziga",
      description: 'Training in vehicle mechanics, diagnostics and automotive systems',
      tradeCategory: 'engineering',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'ELE2',
      name: 'Electrical and Electronics',
      nameEn: 'Electrical and Electronics',
      nameRw: "Amashanyarazi n'Ibikoresho By'amashanyarazi",
      description: 'Training in electrical installation, electronics and power systems',
      tradeCategory: 'engineering',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'HSP',
      name: 'Hospitality and Tourism',
      nameEn: 'Hospitality and Tourism',
      nameRw: "Ubukerarugendo n'Amahoteli",
      description: 'Training in hospitality management, tourism and customer service',
      tradeCategory: 'hospitality',
      qualificationLevel: 'L2',
      durationYears: 2,
    },
    {
      code: 'CIV',
      name: 'Civil Engineering and Building Technology',
      nameEn: 'Civil Engineering and Building Technology',
      nameRw: "Ubwubatsi n'Ikoranabuhanga Ry'Inyubako",
      description: 'Training in civil engineering, construction and building technology',
      tradeCategory: 'engineering',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'AGR2',
      name: 'Agriculture and Agribusiness',
      nameEn: 'Agriculture and Agribusiness',
      nameRw: "Ubuhinzi n'Ubucuruzi Bw'Ubuhinzi",
      description: 'Training in modern agriculture, agribusiness management and value chains',
      tradeCategory: 'agriculture',
      qualificationLevel: 'L2',
      durationYears: 2,
    },
    {
      code: 'ECE_TTC',
      name: 'Early Childhood Education (TTC)',
      nameEn: 'Early Childhood Education (TTC)',
      nameRw: "Uburezi Bw'Imfura (TTC)",
      description: 'Training in early childhood development and education at TVET level',
      tradeCategory: 'education',
      qualificationLevel: 'L4',
      durationYears: 3,
    },
  ];

  for (const t of newTrades) {
    await prisma.curriculumProgramme.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        nameEn: t.nameEn,
        nameRw: t.nameRw,
        description: t.description,
        programmeType: 'tvet',
        tradeCategory: t.tradeCategory,
        qualificationLevel: t.qualificationLevel,
        durationYears: t.durationYears,
        sourceName: REB_ADVANCED,
        verificationStatus: 'pending',
        educationLevelId: tvetLevel.id,
        isActive: true,
      },
      create: {
        educationLevelId: tvetLevel.id,
        code: t.code,
        name: t.name,
        nameEn: t.nameEn,
        nameRw: t.nameRw,
        description: t.description,
        programmeType: 'tvet',
        tradeCategory: t.tradeCategory,
        qualificationLevel: t.qualificationLevel,
        durationYears: t.durationYears,
        sourceName: REB_ADVANCED,
        verificationStatus: 'pending',
      },
    });
    console.log(`  [OK] TVET ${t.code} - ${t.name} (${t.tradeCategory}, ${t.qualificationLevel})`);
  }

  // Update existing TVET programmes (CON, ELE, AGR) with tradeCategory and
  // qualificationLevel fields that were missing in the original seed.
  const existingUpdates = [
    {
      code: 'CON',
      tradeCategory: 'engineering',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'ELE',
      tradeCategory: 'engineering',
      qualificationLevel: 'L3',
      durationYears: 2,
    },
    {
      code: 'AGR',
      tradeCategory: 'agriculture',
      qualificationLevel: 'L2',
      durationYears: 2,
    },
  ];

  for (const u of existingUpdates) {
    const existing = await prisma.curriculumProgramme.findUnique({ where: { code: u.code } });
    if (!existing) {
      console.warn(`  [WARN] Existing TVET programme ${u.code} not found, skipping update`);
      continue;
    }
    await prisma.curriculumProgramme.update({
      where: { code: u.code },
      data: {
        tradeCategory: u.tradeCategory,
        qualificationLevel: u.qualificationLevel,
        durationYears: u.durationYears,
      },
    });
    console.log(`  [OK] Updated existing TVET ${u.code} (tradeCategory=${u.tradeCategory}, level=${u.qualificationLevel})`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== IREME Rwanda - Curriculum Seed Script ===');
  console.log(`Started at ${new Date().toISOString()}\n`);

  try {
    // Load all education levels we need
    const allLevelCodes = [
      'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
      'S1', 'S2', 'S3',
      'S4', 'S5', 'S6',
      'TTC', 'TVET',
    ];
    const levelMap = await loadLevelsByCodes(allLevelCodes);
    const loadedCount = Object.keys(levelMap).length;
    console.log(`Loaded ${loadedCount}/${allLevelCodes.length} education levels`);

    if (loadedCount < allLevelCodes.length) {
      console.error('ERROR: Not all education levels found. Run the main seed first.');
      process.exit(1);
    }

    // Step 1: Missing primary subjects
    await seedMissingPrimarySubjects(levelMap);

    // Step 2: Lower secondary subjects
    await seedLowerSecondarySubjects(levelMap);

    // Step 3: Upper secondary subjects
    await seedUpperSecondarySubjects(levelMap);

    // Step 4: S4-S6 subject combinations
    await seedSubjectCombinations(levelMap);

    // Step 5: TTC programmes
    await seedTTCProgrammes(levelMap);

    // Step 6: TVET trades
    await seedTVETTrades(levelMap);

    console.log('\n=== Curriculum seed completed successfully! ===');
    console.log(`Finished at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\n[FATAL] Curriculum seed failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Unhandled error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
