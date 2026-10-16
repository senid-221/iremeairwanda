/**
 * Curriculum reference data endpoints (read-only).
 * Powers dropdowns (levels, subjects) across student features.
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();

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
        select: { subjectId: true },
      });
      where.id = { in: links.map(function (l) { return l.subjectId; }) };
    }
    var subjects = await prisma.subject.findMany({
      where: where,
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, subjectType: true, verificationStatus: true },
    });
    res.json({ subjects: subjects });
  } catch (err) {
    console.error('curriculum subjects error:', err);
    res.status(500).json({ error: 'Could not load subjects' });
  }
});

module.exports = router;
