/**
 * Student progress, mastery tracking, learning paths, revision plans,
 * gap detection, recommendations, and AI learning preferences for the
 * IREME Rwanda education platform.
 */
var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth, requireRole } = require('../middleware/auth');

var prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the StudentProfile for a given userId.
 * Returns null when no profile exists.
 */
async function getStudentProfile(userId) {
  return prisma.studentProfile.findUnique({ where: { userId: userId } });
}

/**
 * Determine whether the user has a staff role (teacher / admin / super-admin).
 */
function isStaff(user) {
  return ['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

/**
 * Map a numeric mastery level (Decimal 0-1) to a human-readable label.
 */
function masteryLabel(value) {
  var n = Number(value);
  if (n >= 0.8) return 'advanced';
  if (n >= 0.6) return 'proficient';
  if (n >= 0.4) return 'developing';
  return 'beginning';
}

/**
 * Verify that a teacher has access to a specific student (same school or
 * assigned class).  Returns true when access is allowed.
 */
async function teacherHasStudentAccess(teacherUser, studentUserId) {
  // Admins always have access
  if (['ADMIN', 'SUPER_ADMIN'].includes(teacherUser.role)) return true;

  // Find teacher's staff profile
  var staffProfile = await prisma.schoolStaffProfile.findUnique({
    where: { userId: teacherUser.id },
    include: {
      teacherAssignments: {
        where: { isActive: true },
        select: { schoolId: true, classId: true },
      },
    },
  });
  if (!staffProfile) return false;

  var assignmentSchoolIds = [];
  var assignmentClassIds = [];
  staffProfile.teacherAssignments.forEach(function (a) {
    if (a.schoolId) assignmentSchoolIds.push(a.schoolId);
    if (a.classId) assignmentClassIds.push(a.classId);
  });

  // Check if student is enrolled at one of the teacher's schools
  var enrollmentMatch = await prisma.studentEnrollment.findFirst({
    where: {
      studentProfile: { userId: studentUserId },
      status: 'active',
      OR: [
        { schoolId: { in: assignmentSchoolIds } },
        { classId: { in: assignmentClassIds } },
      ],
    },
  });

  return !!enrollmentMatch;
}

/**
 * Verify that a teacher has access to a specific class.
 * Returns true when access is allowed.
 */
async function teacherHasClassAccess(teacherUser, classId) {
  // Admins always have access
  if (['ADMIN', 'SUPER_ADMIN'].includes(teacherUser.role)) return true;

  var staffProfile = await prisma.schoolStaffProfile.findUnique({
    where: { userId: teacherUser.id },
    include: {
      teacherAssignments: {
        where: { isActive: true },
        select: { classId: true, schoolId: true },
      },
    },
  });
  if (!staffProfile) return false;

  // Direct class assignment
  var hasClassAssignment = staffProfile.teacherAssignments.some(function (a) {
    return a.classId === classId;
  });
  if (hasClassAssignment) return true;

  // Check if class belongs to one of the teacher's schools
  var assignmentSchoolIds = staffProfile.teacherAssignments.map(function (a) {
    return a.schoolId;
  });
  var cls = await prisma.class.findUnique({ where: { id: classId } });
  if (cls && assignmentSchoolIds.indexOf(cls.schoolId) !== -1) return true;

  return false;
}

/**
 * Build a recommendation object.
 */
function makeRecommendation(type, title, subjectId, topicId, reason, priority) {
  return {
    type: type,
    title: title,
    subjectId: subjectId || null,
    topicId: topicId || null,
    reason: reason,
    priority: priority || 'medium',
  };
}

// ===========================================================================
// STUDENT ENDPOINTS (requireAuth)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. GET /overview — Get student's overall progress summary
// ---------------------------------------------------------------------------
router.get('/overview', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Fetch all progress records for this student
    var progressRecords = await prisma.studentProgress.findMany({
      where: { userId: userId },
      include: {
        levelSubject: {
          include: {
            subject: { select: { id: true, code: true, name: true, nameEn: true } },
            educationLevel: { select: { id: true, name: true, nameEn: true } },
          },
        },
      },
    });

    // Aggregate totals across all progress records
    var totalXp = 0;
    var totalQuestions = 0;
    var totalCorrect = 0;
    var bestStreak = 0;
    var currentStreak = 0;
    var totalMatchesPlayed = 0;
    var totalMatchesWon = 0;
    var subjectSet = {};

    progressRecords.forEach(function (p) {
      totalXp += p.totalXp;
      totalQuestions += p.totalQuestionsAnswered;
      totalCorrect += p.correctAnswers;
      totalMatchesPlayed += p.matchesPlayed;
      totalMatchesWon += p.matchesWon;
      if (p.bestStreak > bestStreak) bestStreak = p.bestStreak;
      if (p.currentStreak > currentStreak) currentStreak = p.currentStreak;
      if (p.levelSubject && p.levelSubject.subject) {
        subjectSet[p.levelSubject.subject.id] = p.levelSubject.subject;
      }
    });

    var overallAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
      : 0;

    // Recent activity (last 10)
    var recentActivity = await prisma.learningActivityLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        activityType: true,
        activityTitle: true,
        subjectId: true,
        topicId: true,
        xpEarned: true,
        score: true,
        durationSeconds: true,
        createdAt: true,
      },
    });

    // Mastery breakdown by subject from StudentSkillMastery
    var masteryRecords = await prisma.studentSkillMastery.findMany({
      where: { userId: userId },
      select: {
        subjectId: true,
        skillName: true,
        masteryLevel: true,
        questionsAttempted: true,
        correctAnswers: true,
      },
    });

    // Group mastery by subject
    var masteryBySubject = {};
    masteryRecords.forEach(function (m) {
      var sid = m.subjectId || 'unassigned';
      if (!masteryBySubject[sid]) {
        masteryBySubject[sid] = {
          subjectId: sid,
          totalSkills: 0,
          avgMastery: 0,
          masterySum: 0,
          skills: [],
        };
      }
      masteryBySubject[sid].totalSkills++;
      masteryBySubject[sid].masterySum += Number(m.masteryLevel);
      masteryBySubject[sid].skills.push({
        skillName: m.skillName,
        masteryLevel: Number(m.masteryLevel),
        masteryLabel: masteryLabel(m.masteryLevel),
        questionsAttempted: m.questionsAttempted,
        correctAnswers: m.correctAnswers,
      });
    });

    var masteryBreakdown = Object.keys(masteryBySubject).map(function (key) {
      var entry = masteryBySubject[key];
      return {
        subjectId: entry.subjectId,
        totalSkills: entry.totalSkills,
        avgMastery: entry.totalSkills > 0
          ? Math.round((entry.masterySum / entry.totalSkills) * 100) / 100
          : 0,
        skills: entry.skills,
      };
    });

    // Convert activity scores from Decimal
    var activity = recentActivity.map(function (a) {
      return {
        id: a.id,
        activityType: a.activityType,
        activityTitle: a.activityTitle,
        subjectId: a.subjectId,
        topicId: a.topicId,
        xpEarned: a.xpEarned,
        score: a.score != null ? Number(a.score) : null,
        durationSeconds: a.durationSeconds,
        createdAt: a.createdAt,
      };
    });

    res.json({
      totalXp: totalXp,
      overallAccuracy: overallAccuracy,
      totalQuestionsAnswered: totalQuestions,
      correctAnswers: totalCorrect,
      currentStreak: currentStreak,
      bestStreak: bestStreak,
      matchesPlayed: totalMatchesPlayed,
      matchesWon: totalMatchesWon,
      subjectsStudied: Object.keys(subjectSet).length,
      subjects: Object.values(subjectSet),
      recentActivity: activity,
      masteryBreakdown: masteryBreakdown,
    });
  } catch (error) {
    console.error('GET /progress/overview error:', error);
    res.status(500).json({ error: 'Failed to fetch progress overview' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /subjects — Get per-subject progress
// ---------------------------------------------------------------------------
router.get('/subjects', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;

    var progressRecords = await prisma.studentProgress.findMany({
      where: { userId: userId, subjectId: { not: null } },
      include: {
        levelSubject: {
          include: {
            subject: { select: { id: true, code: true, name: true, nameEn: true } },
          },
        },
      },
    });

    // Group by subjectId and aggregate
    var subjectMap = {};
    progressRecords.forEach(function (p) {
      var sid = p.subjectId;
      if (!sid) return;
      if (!subjectMap[sid]) {
        subjectMap[sid] = {
          subjectId: sid,
          name: null,
          nameEn: null,
          code: null,
          totalXp: 0,
          questionsAnswered: 0,
          correctAnswers: 0,
          matchesPlayed: 0,
          matchesWon: 0,
          currentStreak: 0,
          bestStreak: 0,
        };
      }
      var entry = subjectMap[sid];
      entry.totalXp += p.totalXp;
      entry.questionsAnswered += p.totalQuestionsAnswered;
      entry.correctAnswers += p.correctAnswers;
      entry.matchesPlayed += p.matchesPlayed;
      entry.matchesWon += p.matchesWon;
      if (p.currentStreak > entry.currentStreak) entry.currentStreak = p.currentStreak;
      if (p.bestStreak > entry.bestStreak) entry.bestStreak = p.bestStreak;

      // Populate subject name from the first record that has it
      if (!entry.name && p.levelSubject && p.levelSubject.subject) {
        entry.name = p.levelSubject.subject.name;
        entry.nameEn = p.levelSubject.subject.nameEn;
        entry.code = p.levelSubject.subject.code;
      }
    });

    // Also try to get subject names from Subject model for records without levelSubject
    var missingNameIds = Object.keys(subjectMap).filter(function (sid) {
      return !subjectMap[sid].name;
    });
    if (missingNameIds.length > 0) {
      var subjects = await prisma.subject.findMany({
        where: { id: { in: missingNameIds } },
        select: { id: true, code: true, name: true, nameEn: true },
      });
      subjects.forEach(function (s) {
        if (subjectMap[s.id]) {
          subjectMap[s.id].name = s.name;
          subjectMap[s.id].nameEn = s.nameEn;
          subjectMap[s.id].code = s.code;
        }
      });
    }

    var result = Object.keys(subjectMap).map(function (key) {
      var e = subjectMap[key];
      var accuracy = e.questionsAnswered > 0
        ? Math.round((e.correctAnswers / e.questionsAnswered) * 10000) / 100
        : 0;
      return {
        subjectId: e.subjectId,
        name: e.name,
        nameEn: e.nameEn,
        code: e.code,
        totalXp: e.totalXp,
        questionsAnswered: e.questionsAnswered,
        correctAnswers: e.correctAnswers,
        accuracy: accuracy,
        matchesPlayed: e.matchesPlayed,
        matchesWon: e.matchesWon,
        currentStreak: e.currentStreak,
        bestStreak: e.bestStreak,
      };
    });

    res.json({ subjects: result });
  } catch (error) {
    console.error('GET /progress/subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /subjects/:subjectId — Detailed progress for one subject
// ---------------------------------------------------------------------------
router.get('/subjects/:subjectId', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var subjectId = req.params.subjectId;

    // Fetch subject info
    var subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, code: true, name: true, nameEn: true },
    });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Progress records for this subject
    var progressRecords = await prisma.studentProgress.findMany({
      where: { userId: userId, subjectId: subjectId },
    });

    var totalXp = 0;
    var totalQuestions = 0;
    var totalCorrect = 0;
    var matchesPlayed = 0;
    var matchesWon = 0;
    var currentStreak = 0;
    var bestStreak = 0;

    progressRecords.forEach(function (p) {
      totalXp += p.totalXp;
      totalQuestions += p.totalQuestionsAnswered;
      totalCorrect += p.correctAnswers;
      matchesPlayed += p.matchesPlayed;
      matchesWon += p.matchesWon;
      if (p.currentStreak > currentStreak) currentStreak = p.currentStreak;
      if (p.bestStreak > bestStreak) bestStreak = p.bestStreak;
    });

    var accuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
      : 0;

    // Skill mastery for this subject, grouped by topic
    var masteryRecords = await prisma.studentSkillMastery.findMany({
      where: { userId: userId, subjectId: subjectId },
      orderBy: { masteryLevel: 'asc' },
    });

    // Group by topicId
    var topicMap = {};
    var untopicSkills = [];
    masteryRecords.forEach(function (m) {
      var skill = {
        id: m.id,
        skillName: m.skillName,
        skillCategory: m.skillCategory,
        masteryLevel: Number(m.masteryLevel),
        masteryLabel: masteryLabel(m.masteryLevel),
        questionsAttempted: m.questionsAttempted,
        correctAnswers: m.correctAnswers,
        accuracy: m.questionsAttempted > 0
          ? Math.round((m.correctAnswers / m.questionsAttempted) * 10000) / 100
          : 0,
        lastPracticedAt: m.lastPracticedAt,
      };

      if (m.topicId) {
        if (!topicMap[m.topicId]) {
          topicMap[m.topicId] = { topicId: m.topicId, skills: [] };
        }
        topicMap[m.topicId].skills.push(skill);
      } else {
        untopicSkills.push(skill);
      }
    });

    var topics = Object.keys(topicMap).map(function (key) {
      return topicMap[key];
    });

    // Fetch topic names if we have topic IDs
    var topicIds = Object.keys(topicMap);
    var topicNames = {};
    if (topicIds.length > 0) {
      var topicRecords = await prisma.curriculumTopic.findMany({
        where: { id: { in: topicIds } },
        select: { id: true, name: true, nameEn: true },
      });
      topicRecords.forEach(function (t) {
        topicNames[t.id] = { name: t.name, nameEn: t.nameEn };
      });
    }

    var topicsWithNames = topics.map(function (t) {
      var nameInfo = topicNames[t.topicId] || {};
      return {
        topicId: t.topicId,
        topicName: nameInfo.name || null,
        topicNameEn: nameInfo.nameEn || null,
        skillCount: t.skills.length,
        skills: t.skills,
      };
    });

    // Recent activity for this subject
    var recentActivity = await prisma.learningActivityLog.findMany({
      where: { userId: userId, subjectId: subjectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        activityType: true,
        activityTitle: true,
        topicId: true,
        xpEarned: true,
        score: true,
        durationSeconds: true,
        createdAt: true,
      },
    });

    var activity = recentActivity.map(function (a) {
      return Object.assign({}, a, {
        score: a.score != null ? Number(a.score) : null,
      });
    });

    res.json({
      subject: subject,
      totalXp: totalXp,
      accuracy: accuracy,
      questionsAnswered: totalQuestions,
      correctAnswers: totalCorrect,
      matchesPlayed: matchesPlayed,
      matchesWon: matchesWon,
      currentStreak: currentStreak,
      bestStreak: bestStreak,
      topics: topicsWithNames,
      untopicSkills: untopicSkills,
      recentActivity: activity,
    });
  } catch (error) {
    console.error('GET /progress/subjects/:subjectId error:', error);
    res.status(500).json({ error: 'Failed to fetch subject detail' });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /activity — Get learning activity log
// ---------------------------------------------------------------------------
router.get('/activity', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    var offset = parseInt(req.query.offset, 10) || 0;
    var subjectId = String(req.query.subjectId || '');
    var activityType = String(req.query.activityType || '');
    var startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    var endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    var where = { userId: userId };

    if (subjectId) where.subjectId = subjectId;
    if (activityType) where.activityType = activityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    var [activities, total] = await Promise.all([
      prisma.learningActivityLog.findMany({
        where: where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.learningActivityLog.count({ where: where }),
    ]);

    res.json({
      activities: activities.map(function (a) {
        return {
          id: a.id,
          activityType: a.activityType,
          activityTitle: a.activityTitle,
          subjectId: a.subjectId,
          topicId: a.topicId,
          educationLevelId: a.educationLevelId,
          activityId: a.activityId,
          durationSeconds: a.durationSeconds,
          xpEarned: a.xpEarned,
          score: a.score != null ? Number(a.score) : null,
          metadata: a.metadata,
          createdAt: a.createdAt,
        };
      }),
      total: total,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error('GET /progress/activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /mastery — Get skill mastery data
// ---------------------------------------------------------------------------
router.get('/mastery', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var subjectId = String(req.query.subjectId || '');
    var topicId = String(req.query.topicId || '');

    var where = { userId: userId };
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;

    var masteryRecords = await prisma.studentSkillMastery.findMany({
      where: where,
      orderBy: [{ skillCategory: 'asc' }, { masteryLevel: 'desc' }],
    });

    // Group by category
    var categoryMap = {};
    masteryRecords.forEach(function (m) {
      var cat = m.skillCategory || 'general';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          skills: [],
          totalSkills: 0,
          avgMastery: 0,
          masterySum: 0,
        };
      }
      var accuracy = m.questionsAttempted > 0
        ? Math.round((m.correctAnswers / m.questionsAttempted) * 10000) / 100
        : 0;

      categoryMap[cat].skills.push({
        id: m.id,
        skillName: m.skillName,
        subjectId: m.subjectId,
        topicId: m.topicId,
        masteryLevel: Number(m.masteryLevel),
        masteryLabel: masteryLabel(m.masteryLevel),
        questionsAttempted: m.questionsAttempted,
        correctAnswers: m.correctAnswers,
        accuracy: accuracy,
        lastPracticedAt: m.lastPracticedAt,
      });
      categoryMap[cat].totalSkills++;
      categoryMap[cat].masterySum += Number(m.masteryLevel);
    });

    var categories = Object.keys(categoryMap).map(function (key) {
      var c = categoryMap[key];
      return {
        category: c.category,
        totalSkills: c.totalSkills,
        avgMastery: c.totalSkills > 0
          ? Math.round((c.masterySum / c.totalSkills) * 100) / 100
          : 0,
        skills: c.skills,
      };
    });

    res.json({ categories: categories });
  } catch (error) {
    console.error('GET /progress/mastery error:', error);
    res.status(500).json({ error: 'Failed to fetch mastery data' });
  }
});

// ---------------------------------------------------------------------------
// 6. GET /paths — Get learning paths
// ---------------------------------------------------------------------------
router.get('/paths', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var paths = await prisma.learningPath.findMany({
      where: { studentProfileId: studentProfile.id },
      include: {
        learningPathItems: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      paths: paths.map(function (p) {
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          subjectId: p.subjectId,
          educationLevelId: p.educationLevelId,
          pathType: p.pathType,
          status: p.status,
          startDate: p.startDate,
          targetEndDate: p.targetEndDate,
          completedAt: p.completedAt,
          progressPercent: Number(p.progressPercent),
          items: p.learningPathItems.map(function (item) {
            return {
              id: item.id,
              itemType: item.itemType,
              itemId: item.itemId,
              itemTitle: item.itemTitle,
              displayOrder: item.displayOrder,
              isCompleted: item.isCompleted,
              completedAt: item.completedAt,
              score: item.score != null ? Number(item.score) : null,
              timeSpentSeconds: item.timeSpentSeconds,
            };
          }),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('GET /progress/paths error:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths' });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /paths — Create a learning path
// ---------------------------------------------------------------------------
router.post('/paths', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var data = req.body || {};
    if (!data.title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!data.pathType) {
      return res.status(400).json({ error: 'pathType is required' });
    }

    var items = data.items || [];
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    var path = await prisma.$transaction(async function (tx) {
      var lp = await tx.learningPath.create({
        data: {
          studentProfileId: studentProfile.id,
          title: data.title,
          description: data.description || null,
          subjectId: data.subjectId || null,
          educationLevelId: data.educationLevelId || null,
          pathType: data.pathType,
          status: data.status || 'active',
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
          createdBy: userId,
        },
      });

      // Create items
      if (items.length > 0) {
        var itemData = items.map(function (item, idx) {
          return {
            learningPathId: lp.id,
            itemType: item.itemType || 'lesson',
            itemId: item.itemId || '',
            itemTitle: item.itemTitle || '',
            displayOrder: item.displayOrder != null ? item.displayOrder : idx,
          };
        });
        await tx.learningPathItem.createMany({ data: itemData });
      }

      return lp;
    });

    // Re-fetch with items
    var created = await prisma.learningPath.findUnique({
      where: { id: path.id },
      include: {
        learningPathItems: { orderBy: { displayOrder: 'asc' } },
      },
    });

    res.status(201).json({ path: created });
  } catch (error) {
    console.error('POST /progress/paths error:', error);
    res.status(500).json({ error: 'Failed to create learning path' });
  }
});

// ---------------------------------------------------------------------------
// 8. PATCH /paths/:id — Update a learning path
// ---------------------------------------------------------------------------
router.patch('/paths/:id', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var pathId = req.params.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Verify ownership
    var existing = await prisma.learningPath.findUnique({
      where: { id: pathId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    if (existing.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this path' });
    }

    var data = req.body || {};

    var updated = await prisma.$transaction(async function (tx) {
      var updateData = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.targetEndDate !== undefined) {
        updateData.targetEndDate = data.targetEndDate ? new Date(data.targetEndDate) : null;
      }
      if (data.progressPercent !== undefined) updateData.progressPercent = data.progressPercent;
      if (data.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progressPercent = 100;
      }

      var lp = await tx.learningPath.update({
        where: { id: pathId },
        data: updateData,
      });

      // Replace items if provided
      if (data.items && Array.isArray(data.items)) {
        await tx.learningPathItem.deleteMany({ where: { learningPathId: pathId } });
        if (data.items.length > 0) {
          var itemData = data.items.map(function (item, idx) {
            return {
              learningPathId: pathId,
              itemType: item.itemType || 'lesson',
              itemId: item.itemId || '',
              itemTitle: item.itemTitle || '',
              displayOrder: item.displayOrder != null ? item.displayOrder : idx,
              isCompleted: item.isCompleted || false,
              completedAt: item.completedAt ? new Date(item.completedAt) : null,
              score: item.score != null ? item.score : null,
              timeSpentSeconds: item.timeSpentSeconds || 0,
            };
          });
          await tx.learningPathItem.createMany({ data: itemData });
        }
      }

      return lp;
    });

    var result = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        learningPathItems: { orderBy: { displayOrder: 'asc' } },
      },
    });

    res.json({ path: result });
  } catch (error) {
    console.error('PATCH /progress/paths/:id error:', error);
    res.status(500).json({ error: 'Failed to update learning path' });
  }
});

// ---------------------------------------------------------------------------
// 9. GET /revision — Get revision plans
// ---------------------------------------------------------------------------
router.get('/revision', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var plans = await prisma.revisionPlan.findMany({
      where: { studentProfileId: studentProfile.id },
      include: {
        revisionPlanItems: {
          orderBy: [{ scheduledDate: 'asc' }, { displayOrder: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      plans: plans.map(function (p) {
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          subjectId: p.subjectId,
          educationLevelId: p.educationLevelId,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
          totalSessions: p.totalSessions,
          completedSessions: p.completedSessions,
          items: p.revisionPlanItems.map(function (item) {
            return {
              id: item.id,
              itemType: item.itemType,
              itemId: item.itemId,
              itemTitle: item.itemTitle,
              scheduledDate: item.scheduledDate,
              displayOrder: item.displayOrder,
              durationMinutes: item.durationMinutes,
              isCompleted: item.isCompleted,
              completedAt: item.completedAt,
              notes: item.notes,
            };
          }),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('GET /progress/revision error:', error);
    res.status(500).json({ error: 'Failed to fetch revision plans' });
  }
});

// ---------------------------------------------------------------------------
// 10. POST /revision — Create a revision plan
// ---------------------------------------------------------------------------
router.post('/revision', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var data = req.body || {};
    if (!data.title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!data.startDate) {
      return res.status(400).json({ error: 'startDate is required' });
    }

    var items = data.items || [];
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    var plan = await prisma.$transaction(async function (tx) {
      var rp = await tx.revisionPlan.create({
        data: {
          studentProfileId: studentProfile.id,
          title: data.title,
          description: data.description || null,
          subjectId: data.subjectId || null,
          educationLevelId: data.educationLevelId || null,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          status: data.status || 'active',
          totalSessions: items.length,
          createdBy: userId,
        },
      });

      // Create items
      if (items.length > 0) {
        var itemData = items.map(function (item, idx) {
          return {
            revisionPlanId: rp.id,
            itemType: item.itemType || 'study',
            itemId: item.itemId || '',
            itemTitle: item.itemTitle || '',
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate) : new Date(),
            displayOrder: item.displayOrder != null ? item.displayOrder : idx,
            durationMinutes: item.durationMinutes || null,
          };
        });
        await tx.revisionPlanItem.createMany({ data: itemData });
      }

      return rp;
    });

    // Re-fetch with items
    var created = await prisma.revisionPlan.findUnique({
      where: { id: plan.id },
      include: {
        revisionPlanItems: {
          orderBy: [{ scheduledDate: 'asc' }, { displayOrder: 'asc' }],
        },
      },
    });

    res.status(201).json({ plan: created });
  } catch (error) {
    console.error('POST /progress/revision error:', error);
    res.status(500).json({ error: 'Failed to create revision plan' });
  }
});

// ---------------------------------------------------------------------------
// 11. PATCH /revision/:id/items/:itemId — Mark revision item complete
// ---------------------------------------------------------------------------
router.patch('/revision/:id/items/:itemId', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var planId = req.params.id;
    var itemId = req.params.itemId;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Verify plan ownership
    var plan = await prisma.revisionPlan.findUnique({
      where: { id: planId },
      include: { revisionPlanItems: true },
    });
    if (!plan) {
      return res.status(404).json({ error: 'Revision plan not found' });
    }
    if (plan.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this plan' });
    }

    // Find the item
    var item = plan.revisionPlanItems.find(function (i) { return i.id === itemId; });
    if (!item) {
      return res.status(404).json({ error: 'Revision plan item not found' });
    }

    var data = req.body || {};
    var isCompleted = data.isCompleted !== undefined ? data.isCompleted : true;

    var updated = await prisma.$transaction(async function (tx) {
      var updatedItem = await tx.revisionPlanItem.update({
        where: { id: itemId },
        data: {
          isCompleted: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      // Recalculate completed sessions count
      var allItems = await tx.revisionPlanItem.findMany({
        where: { revisionPlanId: planId },
      });
      var completedCount = allItems.filter(function (i) { return i.isCompleted; }).length;

      await tx.revisionPlan.update({
        where: { id: planId },
        data: {
          completedSessions: completedCount,
          status: completedCount >= allItems.length && allItems.length > 0
            ? 'completed'
            : plan.status,
        },
      });

      return updatedItem;
    });

    res.json({
      item: {
        id: updated.id,
        itemType: updated.itemType,
        itemId: updated.itemId,
        itemTitle: updated.itemTitle,
        scheduledDate: updated.scheduledDate,
        durationMinutes: updated.durationMinutes,
        isCompleted: updated.isCompleted,
        completedAt: updated.completedAt,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('PATCH /progress/revision/:id/items/:itemId error:', error);
    res.status(500).json({ error: 'Failed to update revision item' });
  }
});

// ===========================================================================
// TEACHER ENDPOINTS (requireAuth + requireRole)
// ===========================================================================

// ---------------------------------------------------------------------------
// 12. GET /students/:studentId — Get a specific student's progress
// ---------------------------------------------------------------------------
router.get(
  '/students/:studentId',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var studentUserId = req.params.studentId;

      // Verify teacher has access to this student
      var hasAccess = await teacherHasStudentAccess(req.user, studentUserId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this student\'s progress' });
      }

      // Find the student's profile
      var studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentUserId },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      });
      if (!studentProfile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Fetch progress records
      var progressRecords = await prisma.studentProgress.findMany({
        where: { userId: studentUserId },
        include: {
          levelSubject: {
            include: {
              subject: { select: { id: true, code: true, name: true, nameEn: true } },
            },
          },
        },
      });

      var totalXp = 0;
      var totalQuestions = 0;
      var totalCorrect = 0;
      var bestStreak = 0;
      var currentStreak = 0;
      var matchesPlayed = 0;
      var matchesWon = 0;
      var subjectSet = {};

      progressRecords.forEach(function (p) {
        totalXp += p.totalXp;
        totalQuestions += p.totalQuestionsAnswered;
        totalCorrect += p.correctAnswers;
        matchesPlayed += p.matchesPlayed;
        matchesWon += p.matchesWon;
        if (p.bestStreak > bestStreak) bestStreak = p.bestStreak;
        if (p.currentStreak > currentStreak) currentStreak = p.currentStreak;
        if (p.levelSubject && p.levelSubject.subject) {
          subjectSet[p.levelSubject.subject.id] = p.levelSubject.subject;
        }
      });

      var overallAccuracy = totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
        : 0;

      // Recent activity
      var recentActivity = await prisma.learningActivityLog.findMany({
        where: { userId: studentUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          activityType: true,
          activityTitle: true,
          subjectId: true,
          xpEarned: true,
          score: true,
          durationSeconds: true,
          createdAt: true,
        },
      });

      // Mastery breakdown
      var masteryRecords = await prisma.studentSkillMastery.findMany({
        where: { userId: studentUserId },
        select: {
          subjectId: true,
          skillName: true,
          masteryLevel: true,
          questionsAttempted: true,
          correctAnswers: true,
        },
      });

      var masteryBySubject = {};
      masteryRecords.forEach(function (m) {
        var sid = m.subjectId || 'unassigned';
        if (!masteryBySubject[sid]) {
          masteryBySubject[sid] = { subjectId: sid, totalSkills: 0, masterySum: 0, skills: [] };
        }
        masteryBySubject[sid].totalSkills++;
        masteryBySubject[sid].masterySum += Number(m.masteryLevel);
        masteryBySubject[sid].skills.push({
          skillName: m.skillName,
          masteryLevel: Number(m.masteryLevel),
          masteryLabel: masteryLabel(m.masteryLevel),
          questionsAttempted: m.questionsAttempted,
        });
      });

      var masteryBreakdown = Object.keys(masteryBySubject).map(function (key) {
        var entry = masteryBySubject[key];
        return {
          subjectId: entry.subjectId,
          totalSkills: entry.totalSkills,
          avgMastery: entry.totalSkills > 0
            ? Math.round((entry.masterySum / entry.totalSkills) * 100) / 100
            : 0,
          skills: entry.skills,
        };
      });

      res.json({
        student: {
          id: studentProfile.user.id,
          fullName: studentProfile.user.fullName,
          email: studentProfile.user.email,
          avatarUrl: studentProfile.user.avatarUrl,
          studentId: studentProfile.studentId,
        },
        totalXp: totalXp,
        overallAccuracy: overallAccuracy,
        totalQuestionsAnswered: totalQuestions,
        correctAnswers: totalCorrect,
        currentStreak: currentStreak,
        bestStreak: bestStreak,
        matchesPlayed: matchesPlayed,
        matchesWon: matchesWon,
        subjectsStudied: Object.keys(subjectSet).length,
        subjects: Object.values(subjectSet),
        recentActivity: recentActivity.map(function (a) {
          return Object.assign({}, a, {
            score: a.score != null ? Number(a.score) : null,
          });
        }),
        masteryBreakdown: masteryBreakdown,
      });
    } catch (error) {
      console.error('GET /progress/students/:studentId error:', error);
      res.status(500).json({ error: 'Failed to fetch student progress' });
    }
  }
);

// ---------------------------------------------------------------------------
// 13. GET /class/:classId — Get class-level progress summary
// ---------------------------------------------------------------------------
router.get(
  '/class/:classId',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var classId = req.params.classId;

      // Verify teacher has access to this class
      var hasAccess = await teacherHasClassAccess(req.user, classId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this class' });
      }

      // Fetch class info
      var cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, level: true, section: true },
      });
      if (!cls) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Get students in this class via ClassMembership
      var memberships = await prisma.classMembership.findMany({
        where: { classId: classId, role: 'student', status: 'active' },
        select: { userId: true },
      });

      var studentUserIds = memberships.map(function (m) { return m.userId; });
      if (studentUserIds.length === 0) {
        return res.json({
          class: cls,
          studentCount: 0,
          averageAccuracy: 0,
          commonWeakTopics: [],
          topPerformers: [],
          students: [],
        });
      }

      // Fetch progress for all students in the class
      var progressRecords = await prisma.studentProgress.findMany({
        where: { userId: { in: studentUserIds } },
      });

      // Build per-student aggregates
      var studentAgg = {};
      studentUserIds.forEach(function (uid) {
        studentAgg[uid] = {
          userId: uid,
          totalXp: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          currentStreak: 0,
        };
      });

      progressRecords.forEach(function (p) {
        if (!studentAgg[p.userId]) return;
        studentAgg[p.userId].totalXp += p.totalXp;
        studentAgg[p.userId].totalQuestions += p.totalQuestionsAnswered;
        studentAgg[p.userId].totalCorrect += p.correctAnswers;
        if (p.currentStreak > studentAgg[p.userId].currentStreak) {
          studentAgg[p.userId].currentStreak = p.currentStreak;
        }
      });

      // Compute class-wide accuracy
      var classTotalQuestions = 0;
      var classTotalCorrect = 0;
      var studentList = Object.keys(studentAgg).map(function (uid) {
        var s = studentAgg[uid];
        classTotalQuestions += s.totalQuestions;
        classTotalCorrect += s.totalCorrect;
        var accuracy = s.totalQuestions > 0
          ? Math.round((s.totalCorrect / s.totalQuestions) * 10000) / 100
          : 0;
        return {
          userId: s.userId,
          totalXp: s.totalXp,
          accuracy: accuracy,
          questionsAnswered: s.totalQuestions,
          currentStreak: s.currentStreak,
        };
      });

      var averageAccuracy = classTotalQuestions > 0
        ? Math.round((classTotalCorrect / classTotalQuestions) * 10000) / 100
        : 0;

      // Top performers (by XP)
      var topPerformers = studentList
        .slice()
        .sort(function (a, b) { return b.totalXp - a.totalXp; })
        .slice(0, 5);

      // Fetch user names for top performers
      var topIds = topPerformers.map(function (t) { return t.userId; });
      var topUsers = await prisma.user.findMany({
        where: { id: { in: topIds } },
        select: { id: true, fullName: true },
      });
      var userMap = {};
      topUsers.forEach(function (u) { userMap[u.id] = u.fullName; });

      topPerformers = topPerformers.map(function (t) {
        return {
          userId: t.userId,
          fullName: userMap[t.userId] || null,
          totalXp: t.totalXp,
          accuracy: t.accuracy,
          questionsAnswered: t.questionsAnswered,
          currentStreak: t.currentStreak,
        };
      });

      // Find common weak topics from mastery data
      var masteryRecords = await prisma.studentSkillMastery.findMany({
        where: { userId: { in: studentUserIds } },
        select: { topicId: true, skillName: true, masteryLevel: true },
      });

      // Aggregate mastery by topic
      var topicWeakness = {};
      masteryRecords.forEach(function (m) {
        if (!m.topicId) return;
        var level = Number(m.masteryLevel);
        if (level >= 0.6) return; // Only track weak areas
        if (!topicWeakness[m.topicId]) {
          topicWeakness[m.topicId] = { topicId: m.topicId, weakCount: 0, totalMastery: 0, count: 0 };
        }
        topicWeakness[m.topicId].weakCount++;
        topicWeakness[m.topicId].totalMastery += level;
        topicWeakness[m.topicId].count++;
      });

      var commonWeakTopics = Object.keys(topicWeakness)
        .map(function (key) {
          var t = topicWeakness[key];
          return {
            topicId: t.topicId,
            weakStudentCount: t.weakCount,
            avgMastery: t.count > 0
              ? Math.round((t.totalMastery / t.count) * 100) / 100
              : 0,
          };
        })
        .sort(function (a, b) { return b.weakStudentCount - a.weakStudentCount; })
        .slice(0, 10);

      // Fetch topic names
      var weakTopicIds = commonWeakTopics.map(function (t) { return t.topicId; });
      if (weakTopicIds.length > 0) {
        var topicRecords = await prisma.curriculumTopic.findMany({
          where: { id: { in: weakTopicIds } },
          select: { id: true, name: true, nameEn: true },
        });
        var topicNameMap = {};
        topicRecords.forEach(function (t) {
          topicNameMap[t.id] = { name: t.name, nameEn: t.nameEn };
        });
        commonWeakTopics = commonWeakTopics.map(function (t) {
          var nameInfo = topicNameMap[t.topicId] || {};
          return {
            topicId: t.topicId,
            topicName: nameInfo.name || null,
            topicNameEn: nameInfo.nameEn || null,
            weakStudentCount: t.weakStudentCount,
            avgMastery: t.avgMastery,
          };
        });
      }

      // Add names to student list
      var allStudentUsers = await prisma.user.findMany({
        where: { id: { in: studentUserIds } },
        select: { id: true, fullName: true },
      });
      var allUserMap = {};
      allStudentUsers.forEach(function (u) { allUserMap[u.id] = u.fullName; });

      studentList = studentList.map(function (s) {
        return Object.assign({}, s, {
          fullName: allUserMap[s.userId] || null,
        });
      });

      res.json({
        class: cls,
        studentCount: studentUserIds.length,
        averageAccuracy: averageAccuracy,
        commonWeakTopics: commonWeakTopics,
        topPerformers: topPerformers,
        students: studentList,
      });
    } catch (error) {
      console.error('GET /progress/class/:classId error:', error);
      res.status(500).json({ error: 'Failed to fetch class progress' });
    }
  }
);

// ===========================================================================
// LEARNING GAP DETECTION
// ===========================================================================

// ---------------------------------------------------------------------------
// 14. GET /gaps — Identify learning gaps for the current student
// ---------------------------------------------------------------------------
router.get('/gaps', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // 1. Skills with low mastery (masteryLevel < 0.4 means beginning/developing)
    var weakSkills = await prisma.studentSkillMastery.findMany({
      where: {
        userId: userId,
        masteryLevel: { lt: 0.4 },
      },
      orderBy: { masteryLevel: 'asc' },
    });

    // Fetch subject and topic names for weak skills
    var subjectIds = [];
    var topicIds = [];
    weakSkills.forEach(function (s) {
      if (s.subjectId && subjectIds.indexOf(s.subjectId) === -1) subjectIds.push(s.subjectId);
      if (s.topicId && topicIds.indexOf(s.topicId) === -1) topicIds.push(s.topicId);
    });

    var [subjects, topics] = await Promise.all([
      subjectIds.length > 0
        ? prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true, nameEn: true } })
        : [],
      topicIds.length > 0
        ? prisma.curriculumTopic.findMany({ where: { id: { in: topicIds } }, select: { id: true, name: true, nameEn: true } })
        : [],
    ]);

    var subjectMap = {};
    subjects.forEach(function (s) { subjectMap[s.id] = s; });
    var topicMap = {};
    topics.forEach(function (t) { topicMap[t.id] = t; });

    var skillGaps = weakSkills.map(function (s) {
      var accuracy = s.questionsAttempted > 0
        ? Math.round((s.correctAnswers / s.questionsAttempted) * 10000) / 100
        : 0;
      var subject = s.subjectId ? subjectMap[s.subjectId] : null;
      var topic = s.topicId ? topicMap[s.topicId] : null;

      // Build recommendation based on mastery level and question count
      var recommendation = '';
      var masteryVal = Number(s.masteryLevel);
      if (s.questionsAttempted === 0) {
        recommendation = 'Start practicing this skill. No questions attempted yet.';
      } else if (masteryVal < 0.2) {
        recommendation = 'Critical: Review foundational material and seek additional help for ' + s.skillName + '.';
      } else if (accuracy < 40) {
        recommendation = 'Focus on improving accuracy. Review incorrect answers and retry practice questions.';
      } else {
        recommendation = 'Continue practicing ' + s.skillName + ' to build confidence and improve mastery.';
      }

      return {
        skillName: s.skillName,
        skillCategory: s.skillCategory,
        subject: subject ? { id: subject.id, name: subject.name, nameEn: subject.nameEn } : null,
        topic: topic ? { id: topic.id, name: topic.name, nameEn: topic.nameEn } : null,
        masteryLevel: masteryVal,
        masteryLabel: masteryLabel(s.masteryLevel),
        questionsAttempted: s.questionsAttempted,
        correctAnswers: s.correctAnswers,
        accuracy: accuracy,
        recommendation: recommendation,
      };
    });

    // 2. Recent failed assessments (percentage < passingScore)
    var failedAttempts = await prisma.assessmentAttempt.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: 'completed',
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            subjectId: true,
            passingScore: true,
          },
        },
        assessmentResults: { take: 1 },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    var assessmentGaps = [];
    failedAttempts.forEach(function (a) {
      var result = a.assessmentResults[0];
      if (!result) return;
      var percentage = Number(result.percentage);
      var passingScore = a.assessment.passingScore != null ? Number(a.assessment.passingScore) : 60;
      if (percentage < passingScore) {
        var subject = a.assessment.subjectId ? subjectMap[a.assessment.subjectId] : null;
        assessmentGaps.push({
          assessmentId: a.assessment.id,
          assessmentTitle: a.assessment.title || a.assessment.titleEn,
          subject: subject ? { id: subject.id, name: subject.name } : null,
          percentage: percentage,
          passingScore: passingScore,
          recommendation: 'Retake ' + (a.assessment.title || 'this assessment') + ' after reviewing the material.',
        });
      }
    });

    res.json({
      skillGaps: skillGaps,
      assessmentGaps: assessmentGaps,
      totalGaps: skillGaps.length + assessmentGaps.length,
    });
  } catch (error) {
    console.error('GET /progress/gaps error:', error);
    res.status(500).json({ error: 'Failed to detect learning gaps' });
  }
});

// ---------------------------------------------------------------------------
// 15. GET /recommendations — Get personalized learning recommendations
// ---------------------------------------------------------------------------
router.get('/recommendations', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var studentProfile = await getStudentProfile(userId);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var recommendations = [];

    // 1. Analyze weak skills to recommend subjects/topics
    var weakSkills = await prisma.studentSkillMastery.findMany({
      where: {
        userId: userId,
        masteryLevel: { lt: 0.4 },
      },
      orderBy: { masteryLevel: 'asc' },
      take: 10,
    });

    var weakSubjectIds = [];
    var weakTopicIds = [];
    weakSkills.forEach(function (s) {
      if (s.subjectId && weakSubjectIds.indexOf(s.subjectId) === -1) weakSubjectIds.push(s.subjectId);
      if (s.topicId && weakTopicIds.indexOf(s.topicId) === -1) weakTopicIds.push(s.topicId);
    });

    // Recommend practicing weak skills
    weakSkills.forEach(function (s) {
      var masteryVal = Number(s.masteryLevel);
      var priority = masteryVal < 0.2 ? 'high' : 'medium';
      recommendations.push(makeRecommendation(
        'skill_practice',
        'Practice ' + s.skillName,
        s.subjectId,
        s.topicId,
        'Mastery level is ' + masteryLabel(s.masteryLevel) + ' (' + Math.round(masteryVal * 100) + '%). More practice needed.',
        priority
      ));
    });

    // 2. Check for failed assessments and recommend revision
    var failedAttempts = await prisma.assessmentAttempt.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: 'completed',
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            subjectId: true,
            passingScore: true,
          },
        },
        assessmentResults: { take: 1 },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    failedAttempts.forEach(function (a) {
      var result = a.assessmentResults[0];
      if (!result) return;
      var percentage = Number(result.percentage);
      var passingScore = a.assessment.passingScore != null ? Number(a.assessment.passingScore) : 60;
      if (percentage < passingScore) {
        recommendations.push(makeRecommendation(
          'assessment_revision',
          'Review and retake: ' + (a.assessment.title || 'Assessment'),
          a.assessment.subjectId,
          null,
          'Scored ' + Math.round(percentage) + '% which is below the passing score of ' + passingScore + '%.',
          'high'
        ));
      }
    });

    // 3. Check active learning paths for incomplete items
    var activePaths = await prisma.learningPath.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: 'active',
      },
      include: {
        learningPathItems: {
          where: { isCompleted: false },
          orderBy: { displayOrder: 'asc' },
          take: 5,
        },
      },
    });

    activePaths.forEach(function (path) {
      path.learningPathItems.forEach(function (item) {
        recommendations.push(makeRecommendation(
          'learning_path',
          'Continue: ' + item.itemTitle,
          path.subjectId,
          null,
          'Part of your learning path "' + path.title + '".',
          'medium'
        ));
      });
    });

    // 4. Check revision plan for upcoming sessions
    var activePlans = await prisma.revisionPlan.findMany({
      where: {
        studentProfileId: studentProfile.id,
        status: 'active',
      },
      include: {
        revisionPlanItems: {
          where: { isCompleted: false },
          orderBy: { scheduledDate: 'asc' },
          take: 5,
        },
      },
    });

    var now = new Date();
    activePlans.forEach(function (plan) {
      plan.revisionPlanItems.forEach(function (item) {
        var isOverdue = item.scheduledDate < now;
        recommendations.push(makeRecommendation(
          'revision_session',
          (isOverdue ? 'Overdue: ' : 'Upcoming: ') + item.itemTitle,
          plan.subjectId,
          null,
          'From your revision plan "' + plan.title + '". Scheduled for ' + item.scheduledDate.toISOString().split('T')[0] + '.',
          isOverdue ? 'high' : 'low'
        ));
      });
    });

    // 5. If no weak areas found, recommend maintaining momentum
    if (recommendations.length === 0) {
      // Fetch subjects the student is studying
      var progressRecords = await prisma.studentProgress.findMany({
        where: { userId: userId, subjectId: { not: null } },
        select: { subjectId: true },
        distinct: ['subjectId'],
      });

      progressRecords.forEach(function (p) {
        recommendations.push(makeRecommendation(
          'practice',
          'Keep practicing',
          p.subjectId,
          null,
          'Maintain your progress and aim for mastery.',
          'low'
        ));
      });

      if (recommendations.length === 0) {
        recommendations.push(makeRecommendation(
          'get_started',
          'Start learning',
          null,
          null,
          'Begin by selecting subjects and taking assessments to track your progress.',
          'medium'
        ));
      }
    }

    // Sort by priority: high > medium > low
    var priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(function (a, b) {
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    res.json({ recommendations: recommendations });
  } catch (error) {
    console.error('GET /progress/recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// ===========================================================================
// AI LEARNING PREFERENCES
// ===========================================================================

// ---------------------------------------------------------------------------
// 16. GET /preferences — Get AI learning preferences
// ---------------------------------------------------------------------------
router.get('/preferences', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;

    var prefs = await prisma.aiLearningPreference.findUnique({
      where: { userId: userId },
    });

    if (!prefs) {
      return res.json({
        preferences: null,
        message: 'No learning preferences set yet. Use PUT to create them.',
      });
    }

    res.json({
      preferences: {
        id: prefs.id,
        learningStyle: prefs.learningStyle,
        preferredPace: prefs.preferredPace,
        weakSubjects: prefs.weakSubjects,
        strongSubjects: prefs.strongSubjects,
        preferredTopics: prefs.preferredTopics,
        studyGoals: prefs.studyGoals,
        aiTonePreference: prefs.aiTonePreference,
        explanationDepth: prefs.explanationDepth,
        createdAt: prefs.createdAt,
        updatedAt: prefs.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /progress/preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch learning preferences' });
  }
});

// ---------------------------------------------------------------------------
// 17. PUT /preferences — Update AI learning preferences
// ---------------------------------------------------------------------------
router.put('/preferences', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var data = req.body || {};

    var prefs = await prisma.aiLearningPreference.upsert({
      where: { userId: userId },
      update: {
        learningStyle: data.learningStyle !== undefined ? data.learningStyle : undefined,
        preferredPace: data.preferredPace !== undefined ? data.preferredPace : undefined,
        weakSubjects: data.weakSubjects !== undefined ? data.weakSubjects : undefined,
        strongSubjects: data.strongSubjects !== undefined ? data.strongSubjects : undefined,
        preferredTopics: data.preferredTopics !== undefined ? data.preferredTopics : undefined,
        studyGoals: data.studyGoals !== undefined ? data.studyGoals : undefined,
        aiTonePreference: data.aiTonePreference !== undefined ? data.aiTonePreference : undefined,
        explanationDepth: data.explanationDepth !== undefined ? data.explanationDepth : undefined,
      },
      create: {
        userId: userId,
        learningStyle: data.learningStyle || null,
        preferredPace: data.preferredPace || null,
        weakSubjects: data.weakSubjects || null,
        strongSubjects: data.strongSubjects || null,
        preferredTopics: data.preferredTopics || null,
        studyGoals: data.studyGoals || null,
        aiTonePreference: data.aiTonePreference || 'friendly',
        explanationDepth: data.explanationDepth || 'detailed',
      },
    });

    res.json({
      preferences: {
        id: prefs.id,
        learningStyle: prefs.learningStyle,
        preferredPace: prefs.preferredPace,
        weakSubjects: prefs.weakSubjects,
        strongSubjects: prefs.strongSubjects,
        preferredTopics: prefs.preferredTopics,
        studyGoals: prefs.studyGoals,
        aiTonePreference: prefs.aiTonePreference,
        explanationDepth: prefs.explanationDepth,
        createdAt: prefs.createdAt,
        updatedAt: prefs.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /progress/preferences error:', error);
    res.status(500).json({ error: 'Failed to update learning preferences' });
  }
});

module.exports = router;
