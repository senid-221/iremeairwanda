const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getParentProfile(userId) {
  return prisma.parentProfile.findUnique({
    where: { userId },
    include: {
      studentGuardians: {
        where: { status: 'active' },
        include: {
          studentProfile: {
            include: {
              user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
              currentSchool: { select: { id: true, name: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 1. GET /api/parents/children — Get parent's children
// ---------------------------------------------------------------------------
router.get('/children', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const profile = await getParentProfile(req.user.id);
    if (!profile) {
      return res.json({ children: [] });
    }

    const children = profile.studentGuardians.map(g => {
      const sp = g.studentProfile;
      return {
        id: sp.id,
        userId: sp.userId,
        name: sp.user?.fullName || 'Unknown',
        email: sp.user?.email || '',
        avatarUrl: sp.user?.avatarUrl || null,
        school: sp.currentSchool ? (sp.currentSchool.nameEn || sp.currentSchool.name) : null,
        schoolId: sp.currentSchoolId,
        grade: sp.currentGrade,
        relationship: g.relationship,
        isPrimary: g.isPrimary,
      };
    });

    res.json({ children });
  } catch (err) {
    console.error('GET /parents/children error:', err);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/parents/children/:id/progress — Get child's learning progress
// ---------------------------------------------------------------------------
router.get('/children/:id/progress', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const childId = req.params.id;

    const profile = await getParentProfile(req.user.id);
    const isGuardian = profile?.studentGuardians.some(g => g.studentProfileId === childId);
    if (!isGuardian && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: childId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!studentProfile) return res.status(404).json({ error: 'Student not found' });

    const progress = await prisma.studentProgress.findMany({
      where: { userId: studentProfile.userId },
      include: {
        levelSubject: {
          include: {
            subject: { select: { id: true, name: true, nameEn: true } },
            educationLevel: { select: { id: true, name: true, nameEn: true } },
          },
        },
      },
    });

    const skillMastery = await prisma.studentSkillMastery.findMany({
      where: { userId: studentProfile.userId },
      take: 20,
      orderBy: { masteryLevel: 'desc' },
    });

    const activityLogs = await prisma.learningActivityLog.findMany({
      where: { userId: studentProfile.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalXp = progress.reduce((sum, p) => sum + p.totalXp, 0);
    const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestionsAnswered, 0);
    const totalCorrect = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const bestStreak = Math.max(0, ...progress.map(p => p.bestStreak));
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const subjects = progress.map(p => ({
      id: p.levelSubject?.subject?.id || p.subjectId,
      name: p.levelSubject?.subject?.nameEn || p.levelSubject?.subject?.name || 'Unknown',
      xp: p.totalXp,
      matchesPlayed: p.matchesPlayed,
      accuracy: p.totalQuestionsAnswered > 0 ? Math.round((Number(p.correctAnswers) / p.totalQuestionsAnswered) * 100) : 0,
      lastActivity: p.lastActivityAt,
    }));

    const strongAreas = skillMastery.slice(0, 5).map(s => ({
      skill: s.skillName,
      category: s.skillCategory,
      mastery: Number(s.masteryLevel),
    }));

    const weakAreas = skillMastery.slice(-5).reverse().map(s => ({
      skill: s.skillName,
      category: s.skillCategory,
      mastery: Number(s.masteryLevel),
    }));

    res.json({
      child: { id: studentProfile.id, name: studentProfile.user?.fullName },
      overview: { totalXp, totalQuestions, avgAccuracy, bestStreak, subjectsCount: subjects.length },
      subjects,
      strongAreas,
      weakAreas,
      recentActivity: activityLogs.map(a => ({
        id: a.id,
        type: a.activityType,
        description: a.description,
        xpEarned: a.xpEarned,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /parents/children/:id/progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/parents/children/:id/grades — Get child's academic grades
// ---------------------------------------------------------------------------
router.get('/children/:id/grades', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const childId = req.params.id;

    const profile = await getParentProfile(req.user.id);
    const isGuardian = profile?.studentGuardians.some(g => g.studentProfileId === childId);
    if (!isGuardian && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: childId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!studentProfile) return res.status(404).json({ error: 'Student not found' });

    const term = req.query.term;
    const where = { studentProfileId: childId };
    if (term) where.term = term;

    const records = await prisma.studentAcademicRecord.findMany({
      where,
      orderBy: { recordedDate: 'desc' },
      take: 100,
    });

    const grades = records.map(r => ({
      id: r.id,
      recordType: r.recordType,
      term: r.term,
      subjectId: r.subjectId,
      grade: r.grade,
      score: r.score ? Number(r.score) : null,
      maxScore: r.maxScore ? Number(r.maxScore) : null,
      percentage: r.percentage ? Number(r.percentage) : null,
      remarks: r.remarks,
      recordedDate: r.recordedDate,
    }));

    const terms = [...new Set(records.map(r => r.term).filter(Boolean))];

    res.json({
      child: { id: studentProfile.id, name: studentProfile.user?.fullName },
      grades,
      terms,
      summary: {
        total: grades.length,
        avgPercentage: grades.filter(g => g.percentage != null).length > 0
          ? Math.round(grades.filter(g => g.percentage != null).reduce((s, g) => s + g.percentage, 0) / grades.filter(g => g.percentage != null).length)
          : null,
      },
    });
  } catch (err) {
    console.error('GET /parents/children/:id/grades error:', err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /api/parents/message-teacher — Send message to a teacher
// ---------------------------------------------------------------------------
router.post('/message-teacher', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { teacherId, subject, content, category } = req.body || {};
    if (!teacherId || !subject || !content) {
      return res.status(400).json({ error: 'teacherId, subject, and content are required' });
    }

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const message = await prisma.parentMessage.create({
      data: {
        senderId: req.user.id,
        recipientId: teacherId,
        subject: String(subject).trim(),
        content: String(content).trim(),
        category: category || 'general',
      },
    });

    res.status(201).json({ message: 'Message sent successfully', data: message });
  } catch (err) {
    console.error('POST /parents/message-teacher error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /api/parents/messages — Get parent's messages
// ---------------------------------------------------------------------------
router.get('/messages', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const messages = await prisma.parentMessage.findMany({
      where: {
        OR: [{ senderId: req.user.id }, { recipientId: req.user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const enriched = await Promise.all(messages.map(async (m) => {
      const sender = await prisma.user.findUnique({
        where: { id: m.senderId },
        select: { id: true, fullName: true },
      });
      const recipient = await prisma.user.findUnique({
        where: { id: m.recipientId },
        select: { id: true, fullName: true },
      });
      return {
        id: m.id,
        subject: m.subject,
        content: m.content,
        category: m.category,
        isRead: m.isRead,
        sentAt: m.createdAt,
        sender: { id: sender?.id, name: sender?.fullName },
        recipient: { id: recipient?.id, name: recipient?.fullName },
        direction: m.senderId === req.user.id ? 'sent' : 'received',
      };
    }));

    res.json({ messages: enriched });
  } catch (err) {
    console.error('GET /parents/messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ---------------------------------------------------------------------------
// 6. GET /api/parents/payments — Get parent's payment history
// ---------------------------------------------------------------------------
router.get('/payments', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const payments = await prisma.paymentTransaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = payments.map(p => ({
      id: p.id,
      transactionRef: p.transactionRef,
      provider: p.provider,
      amount: Number(p.amount),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      paymentType: p.paymentType,
      status: p.status,
      description: p.description,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    res.json({ payments: formatted });
  } catch (err) {
    console.error('GET /parents/payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /api/parents/payments — Initiate a payment
// ---------------------------------------------------------------------------
router.post('/payments', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { feeId, amount, paymentMethod, provider } = req.body || {};
    if (!amount || !paymentMethod) {
      return res.status(400).json({ error: 'amount and paymentMethod are required' });
    }

    const transactionRef = 'PAY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    let feeDescription = 'School fee payment';
    if (feeId) {
      const fee = await prisma.schoolFee.findUnique({ where: { id: feeId } });
      if (fee) {
        feeDescription = fee.title;
        if (!amount) amount = Number(fee.amount);
      }
    }

    const payment = await prisma.paymentTransaction.create({
      data: {
        userId: req.user.id,
        transactionRef,
        provider: provider || 'manual',
        amount: Number(amount),
        currency: 'RWF',
        paymentMethod,
        paymentType: 'school_fee',
        status: 'pending',
        description: feeDescription,
        metadata: feeId ? { feeId } : undefined,
      },
    });

    res.status(201).json({
      message: 'Payment initiated',
      payment: {
        id: payment.id,
        transactionRef: payment.transactionRef,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (err) {
    console.error('POST /parents/payments error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// ---------------------------------------------------------------------------
// 9. GET /api/parents/school-documents — Get school documents for parent's children
// ---------------------------------------------------------------------------
router.get('/school-documents', requireAuth, requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const profile = await getParentProfile(req.user.id);
    if (!profile || !profile.studentGuardians.length) {
      return res.json({ documents: [] });
    }

    // Get unique school IDs from parent's children
    const schoolIds = [...new Set(profile.studentGuardians
      .map(g => g.studentProfile.currentSchoolId)
      .filter(id => id))];

    if (!schoolIds.length) {
      return res.json({ documents: [] });
    }

    const documents = await prisma.schoolDocument.findMany({
      where: {
        schoolId: { in: schoolIds },
        isActive: true,
        publishedAt: { not: null },
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            nameRw: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const formatted = documents.map(doc => ({
      id: doc.id,
      schoolId: doc.schoolId,
      schoolName: doc.school.nameEn || doc.school.name,
      title: doc.titleEn || doc.title,
      titleEn: doc.titleEn,
      titleRw: doc.titleRw,
      documentType: doc.documentType,
      description: doc.description,
      fileUrl: doc.fileUrl,
      academicYear: doc.academicYear,
      publishedAt: doc.publishedAt,
      dueDate: doc.dueDate,
      amount: doc.amount ? Number(doc.amount) : null,
      currency: doc.currency,
    }));

    res.json({ documents: formatted, count: formatted.length });
  } catch (err) {
    console.error('GET /parents/school-documents error:', err);
    res.status(500).json({ error: 'Failed to fetch school documents' });
  }
});

module.exports = router;
