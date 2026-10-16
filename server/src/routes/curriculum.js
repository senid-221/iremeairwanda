/**
 * Curriculum endpoints — read-only reference data + admin CRUD.
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// ─── READ ENDPOINTS (any authenticated user) ───────────────────────────

router.get('/levels', requireAuth, async (req, res) => {
  try {
    var levels = await prisma.educationLevel.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, levelType: true, gradeRange: true, displayOrder: true },
    });
    res.json({ levels: levels });
  } catch (err) {
    console.error('curriculum levels error:', err);
    res.status(500).json({ error: 'Could not load education levels' });
  }
});

router.get('/subjects', requireAuth, async (req, res) => {
  try {
    var levelId = String(req.query.levelId || '');
    var where = { isActive: true };
    if (levelId) {
      var links = await prisma.levelSubject.findMany({
        where: { educationLevelId: levelId },
        select: { subjectId: true, isCore: true, displayOrder: true },
        orderBy: { displayOrder: 'asc' },
      });
      var subjectIds = links.map(function (l) { return l.subjectId; });
      if (subjectIds.length === 0) return res.json({ subjects: [] });
      where.id = { in: subjectIds };
    }
    var subjects = await prisma.subject.findMany({
      where: where,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, subjectType: true, verificationStatus: true, sourceName: true },
    });
    if (levelId) {
      var linkMap = {};
      links.forEach(function (l) { linkMap[l.subjectId] = l; });
      subjects = subjects.map(function (s) {
        var link = linkMap[s.id] || {};
        return Object.assign({}, s, { isCore: !!link.isCore, displayOrder: link.displayOrder || 0 });
      }).sort(function (a, b) { return a.displayOrder - b.displayOrder; });
    }
    res.json({ subjects: subjects });
  } catch (err) {
    console.error('curriculum subjects error:', err);
    res.status(500).json({ error: 'Could not load subjects' });
  }
});

router.get('/combinations', requireAuth, async (req, res) => {
  try {
    var levelId = String(req.query.levelId || '');
    var where = { isActive: true };
    if (levelId) where.educationLevelId = levelId;

    var combinations = await prisma.subjectCombination.findMany({
      where: where,
      include: {
        combinationSubjects: {
          include: { subject: { select: { id: true, code: true, name: true, nameEn: true, nameRw: true } } },
          orderBy: { displayOrder: 'asc' },
        },
        educationLevel: { select: { id: true, code: true, name: true, nameEn: true } },
      },
      orderBy: { code: 'asc' },
    });

    res.json({
      combinations: combinations.map(function (c) {
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          nameEn: c.nameEn,
          nameRw: c.nameRw,
          description: c.description,
          combinationType: c.combinationType,
          verificationStatus: c.verificationStatus,
          level: c.educationLevel,
          subjects: c.combinationSubjects.map(function (cs) {
            return {
              subject: cs.subject,
              isRequired: cs.isRequired,
              displayOrder: cs.displayOrder,
            };
          }),
        };
      }),
    });
  } catch (err) {
    console.error('curriculum combinations error:', err);
    res.status(500).json({ error: 'Could not load subject combinations' });
  }
});

router.get('/programmes', requireAuth, async (req, res) => {
  try {
    var levelId = String(req.query.levelId || '');
    var type = String(req.query.type || '');
    var where = { isActive: true };
    if (levelId) where.educationLevelId = levelId;
    if (type) where.programmeType = type;

    var programmes = await prisma.curriculumProgramme.findMany({
      where: where,
      include: {
        educationLevel: { select: { id: true, code: true, name: true, nameEn: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      programmes: programmes.map(function (p) {
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          nameEn: p.nameEn,
          nameRw: p.nameRw,
          description: p.description,
          programmeType: p.programmeType,
          qualificationLevel: p.qualificationLevel,
          tradeCategory: p.tradeCategory,
          durationYears: p.durationYears,
          awardingAuthority: p.awardingAuthority,
          verificationStatus: p.verificationStatus,
          level: p.educationLevel,
        };
      }),
    });
  } catch (err) {
    console.error('curriculum programmes error:', err);
    res.status(500).json({ error: 'Could not load programmes' });
  }
});

// ─── ADMIN CRUD ENDPOINTS ───────────────────────────────────────────────

// Create or update a subject
router.post('/subjects', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    var data = req.body || {};
    if (!data.code || !data.name || !data.nameEn || !data.subjectType) {
      return res.status(400).json({ error: 'code, name, nameEn, and subjectType are required' });
    }

    var subject = await prisma.subject.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        subjectType: data.subjectType,
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        lastReviewedAt: data.verificationStatus === 'verified' ? new Date() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      create: {
        code: data.code,
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        subjectType: data.subjectType,
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    res.json({ subject: subject });
  } catch (err) {
    console.error('curriculum subject create error:', err);
    res.status(500).json({ error: 'Failed to save subject' });
  }
});

// Link a subject to an education level
router.post('/subjects/link', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    var data = req.body || {};
    if (!data.subjectId || !data.educationLevelId) {
      return res.status(400).json({ error: 'subjectId and educationLevelId are required' });
    }

    var existing = await prisma.levelSubject.findFirst({
      where: { educationLevelId: data.educationLevelId, subjectId: data.subjectId, academicYearId: null },
    });

    var link;
    if (existing) {
      link = await prisma.levelSubject.update({
        where: { id: existing.id },
        data: {
          isCore: data.isCore !== undefined ? data.isCore : existing.isCore,
          displayOrder: data.displayOrder !== undefined ? data.displayOrder : existing.displayOrder,
        },
      });
    } else {
      link = await prisma.levelSubject.create({
        data: {
          educationLevelId: data.educationLevelId,
          subjectId: data.subjectId,
          isCore: data.isCore || false,
          displayOrder: data.displayOrder || 0,
        },
      });
    }

    res.json({ link: link });
  } catch (err) {
    console.error('curriculum subject link error:', err);
    res.status(500).json({ error: 'Failed to link subject to level' });
  }
});

// Unlink a subject from an education level
router.delete('/subjects/link', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    var subjectId = String(req.query.subjectId || '');
    var educationLevelId = String(req.query.educationLevelId || '');
    if (!subjectId || !educationLevelId) {
      return res.status(400).json({ error: 'subjectId and educationLevelId are required' });
    }

    await prisma.levelSubject.deleteMany({
      where: { educationLevelId: educationLevelId, subjectId: subjectId, academicYearId: null },
    });

    res.json({ message: 'Subject unlinked from level' });
  } catch (err) {
    console.error('curriculum subject unlink error:', err);
    res.status(500).json({ error: 'Failed to unlink subject' });
  }
});

// Create or update a subject combination
router.post('/combinations', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    var data = req.body || {};
    if (!data.code || !data.name || !data.nameEn || !data.educationLevelId) {
      return res.status(400).json({ error: 'code, name, nameEn, and educationLevelId are required' });
    }

    var combination = await prisma.subjectCombination.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        educationLevelId: data.educationLevelId,
        combinationType: data.combinationType || 'general',
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      create: {
        code: data.code,
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        educationLevelId: data.educationLevelId,
        combinationType: data.combinationType || 'general',
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    if (data.subjects && Array.isArray(data.subjects)) {
      await prisma.combinationSubject.deleteMany({ where: { combinationId: combination.id } });
      for (var i = 0; i < data.subjects.length; i++) {
        var s = data.subjects[i];
        await prisma.combinationSubject.create({
          data: {
            combinationId: combination.id,
            subjectId: s.subjectId,
            isRequired: s.isRequired !== undefined ? s.isRequired : true,
            displayOrder: s.displayOrder !== undefined ? s.displayOrder : i,
          },
        });
      }
    }

    res.json({ combination: combination });
  } catch (err) {
    console.error('curriculum combination create error:', err);
    res.status(500).json({ error: 'Failed to save combination' });
  }
});

// Create or update a programme (TTC/TVET)
router.post('/programmes', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    var data = req.body || {};
    if (!data.code || !data.name || !data.nameEn || !data.educationLevelId || !data.programmeType) {
      return res.status(400).json({ error: 'code, name, nameEn, educationLevelId, and programmeType are required' });
    }

    var programme = await prisma.curriculumProgramme.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        educationLevelId: data.educationLevelId,
        programmeType: data.programmeType,
        qualificationLevel: data.qualificationLevel || null,
        tradeCategory: data.tradeCategory || null,
        durationYears: data.durationYears || null,
        awardingAuthority: data.awardingAuthority || null,
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      create: {
        code: data.code,
        name: data.name,
        nameEn: data.nameEn,
        nameRw: data.nameRw || null,
        description: data.description || null,
        educationLevelId: data.educationLevelId,
        programmeType: data.programmeType,
        qualificationLevel: data.qualificationLevel || null,
        tradeCategory: data.tradeCategory || null,
        durationYears: data.durationYears || null,
        awardingAuthority: data.awardingAuthority || null,
        sourceName: data.sourceName || null,
        verificationStatus: data.verificationStatus || 'pending',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    res.json({ programme: programme });
  } catch (err) {
    console.error('curriculum programme create error:', err);
    res.status(500).json({ error: 'Failed to save programme' });
  }
});

// Get curriculum statistics for admin dashboard
router.get('/stats', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN', 'CURRICULUM_MANAGER'), async (req, res) => {
  try {
    var totalLevels = await prisma.educationLevel.count({ where: { isActive: true } });
    var totalSubjects = await prisma.subject.count({ where: { isActive: true } });
    var verifiedSubjects = await prisma.subject.count({ where: { isActive: true, verificationStatus: 'verified' } });
    var pendingSubjects = await prisma.subject.count({ where: { isActive: true, verificationStatus: 'pending' } });
    var totalCombinations = await prisma.subjectCombination.count({ where: { isActive: true } });
    var totalProgrammes = await prisma.curriculumProgramme.count({ where: { isActive: true } });
    var ttcProgrammes = await prisma.curriculumProgramme.count({ where: { isActive: true, programmeType: 'ttc' } });
    var tvetProgrammes = await prisma.curriculumProgramme.count({ where: { isActive: true, programmeType: 'tvet' } });
    var levelSubjectCount = await prisma.levelSubject.count();

    res.json({
      stats: {
        totalLevels: totalLevels,
        totalSubjects: totalSubjects,
        verifiedSubjects: verifiedSubjects,
        pendingSubjects: pendingSubjects,
        totalCombinations: totalCombinations,
        totalProgrammes: totalProgrammes,
        ttcProgrammes: ttcProgrammes,
        tvetProgrammes: tvetProgrammes,
        levelSubjectLinks: levelSubjectCount,
      },
    });
  } catch (err) {
    console.error('curriculum stats error:', err);
    res.status(500).json({ error: 'Failed to load curriculum statistics' });
  }
});

module.exports = router;
