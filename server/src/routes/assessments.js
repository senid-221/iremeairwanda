/**
 * Assessment endpoints — question bank, assessment CRUD, attempt lifecycle,
 * auto-scoring, and result tracking for the IREME Rwanda education platform.
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the StudentProfile for the currently authenticated user.
 * Returns null when no profile exists.
 */
async function getStudentProfile(userId) {
  return prisma.studentProfile.findUnique({ where: { userId } });
}

/**
 * Determine whether the user has a staff role (teacher / admin / super-admin).
 */
function isStaff(user) {
  return ['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

/**
 * Shuffle an array in-place using Fisher-Yates and return it.
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute a letter grade from a percentage score.
 */
function computeGrade(percentage) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Strip correct-answer information from question options so students cannot
 * see the answer before submitting.
 */
function redactOptions(options) {
  return options.map(function (o) {
    return {
      id: o.id,
      optionText: o.optionText,
      optionTextEn: o.optionTextEn,
      optionTextRw: o.optionTextRw,
      optionOrder: o.optionOrder,
      mediaUrl: o.mediaUrl,
    };
  });
}

/**
 * Strip correct-answer and explanation data from a question object for students.
 */
function redactQuestionForStudent(q) {
  return Object.assign({}, q, {
    explanation: undefined,
    explanationEn: undefined,
    explanationRw: undefined,
    questionOptions: redactOptions(q.questionOptions || []),
  });
}

// ===========================================================================
// QUESTION BANK ENDPOINTS (requireAuth)
// ===========================================================================

// ---------------------------------------------------------------------------
// 7. GET /questions — List questions
// ---------------------------------------------------------------------------
router.get('/questions', requireAuth, async function (req, res) {
  try {
    var subjectId = String(req.query.subjectId || '');
    var level = String(req.query.level || '');
    var difficulty = String(req.query.difficulty || '');
    var type = String(req.query.type || '');
    var bankId = String(req.query.bankId || '');
    var limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    var offset = parseInt(req.query.offset, 10) || 0;

    var where = { isActive: true };

    if (bankId) where.questionBankId = bankId;
    if (type) where.questionType = type;
    if (difficulty) where.difficulty = difficulty;

    // Filter by subject / level via the parent QuestionBank
    var bankFilter = {};
    if (subjectId) bankFilter.subjectId = subjectId;
    if (level) bankFilter.level = level;
    if (Object.keys(bankFilter).length > 0) {
      where.questionBank = { is: bankFilter };
    }

    var [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: where,
        include: {
          questionOptions: { orderBy: { optionOrder: 'asc' } },
          questionBank: {
            select: { id: true, name: true, subjectId: true, level: true, difficulty: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.question.count({ where: where }),
    ]);

    // Students should not see correct answers
    var staff = isStaff(req.user);
    var output = staff
      ? questions
      : questions.map(function (q) { return redactQuestionForStudent(q); });

    res.json({ questions: output, total: total, limit: limit, offset: offset });
  } catch (error) {
    console.error('GET /assessments/questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /questions — Create a question (teacher/admin)
// ---------------------------------------------------------------------------
router.post(
  '/questions',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var data = req.body || {};

      // Validate required fields
      if (!data.questionBankId) {
        return res.status(400).json({ error: 'questionBankId is required' });
      }
      if (!data.questionText) {
        return res.status(400).json({ error: 'questionText is required' });
      }

      // Verify question bank exists
      var bank = await prisma.questionBank.findUnique({
        where: { id: data.questionBankId },
      });
      if (!bank) {
        return res.status(404).json({ error: 'Question bank not found' });
      }

      var question = await prisma.$transaction(async function (tx) {
        var q = await tx.question.create({
          data: {
            questionBankId: data.questionBankId,
            subjectTopicId: data.subjectTopicId || null,
            questionType: data.questionType || 'multiple_choice',
            questionText: data.questionText,
            questionTextEn: data.questionTextEn || null,
            questionTextRw: data.questionTextRw || null,
            difficulty: data.difficulty || 'medium',
            points: data.points != null ? data.points : 1,
            timeLimitSeconds: data.timeLimitSeconds || null,
            explanation: data.explanation || null,
            explanationEn: data.explanationEn || null,
            explanationRw: data.explanationRw || null,
            hint: data.hint || null,
            mediaUrl: data.mediaUrl || null,
            createdBy: req.user.id,
          },
        });

        // Create options if provided
        if (data.options && Array.isArray(data.options) && data.options.length > 0) {
          for (var i = 0; i < data.options.length; i++) {
            var opt = data.options[i];
            await tx.questionOption.create({
              data: {
                questionId: q.id,
                optionText: opt.optionText || '',
                optionTextEn: opt.optionTextEn || null,
                optionTextRw: opt.optionTextRw || null,
                optionOrder: opt.optionOrder != null ? opt.optionOrder : i,
                isCorrect: opt.isCorrect || false,
                mediaUrl: opt.mediaUrl || null,
              },
            });
          }
        }

        return q;
      });

      // Re-fetch with options for the response
      var created = await prisma.question.findUnique({
        where: { id: question.id },
        include: { questionOptions: { orderBy: { optionOrder: 'asc' } } },
      });

      res.status(201).json({ question: created });
    } catch (error) {
      console.error('POST /assessments/questions error:', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }
);

// ---------------------------------------------------------------------------
// 9. PATCH /questions/:id — Update a question (teacher/admin)
// ---------------------------------------------------------------------------
router.patch(
  '/questions/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var questionId = req.params.id;
      var data = req.body || {};

      var existing = await prisma.question.findUnique({
        where: { id: questionId },
        include: { questionOptions: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Question not found' });
      }

      var question = await prisma.$transaction(async function (tx) {
        var q = await tx.question.update({
          where: { id: questionId },
          data: {
            questionText: data.questionText !== undefined ? data.questionText : undefined,
            questionTextEn: data.questionTextEn !== undefined ? data.questionTextEn : undefined,
            questionTextRw: data.questionTextRw !== undefined ? data.questionTextRw : undefined,
            questionType: data.questionType !== undefined ? data.questionType : undefined,
            difficulty: data.difficulty !== undefined ? data.difficulty : undefined,
            points: data.points !== undefined ? data.points : undefined,
            timeLimitSeconds: data.timeLimitSeconds !== undefined ? data.timeLimitSeconds : undefined,
            explanation: data.explanation !== undefined ? data.explanation : undefined,
            explanationEn: data.explanationEn !== undefined ? data.explanationEn : undefined,
            explanationRw: data.explanationRw !== undefined ? data.explanationRw : undefined,
            hint: data.hint !== undefined ? data.hint : undefined,
            mediaUrl: data.mediaUrl !== undefined ? data.mediaUrl : undefined,
            subjectTopicId: data.subjectTopicId !== undefined ? data.subjectTopicId : undefined,
            isActive: data.isActive !== undefined ? data.isActive : undefined,
          },
        });

        // Replace options if provided
        if (data.options && Array.isArray(data.options)) {
          await tx.questionOption.deleteMany({ where: { questionId: questionId } });
          for (var i = 0; i < data.options.length; i++) {
            var opt = data.options[i];
            await tx.questionOption.create({
              data: {
                questionId: questionId,
                optionText: opt.optionText || '',
                optionTextEn: opt.optionTextEn || null,
                optionTextRw: opt.optionTextRw || null,
                optionOrder: opt.optionOrder != null ? opt.optionOrder : i,
                isCorrect: opt.isCorrect || false,
                mediaUrl: opt.mediaUrl || null,
              },
            });
          }
        }

        return q;
      });

      var updated = await prisma.question.findUnique({
        where: { id: questionId },
        include: { questionOptions: { orderBy: { optionOrder: 'asc' } } },
      });

      res.json({ question: updated });
    } catch (error) {
      console.error('PATCH /assessments/questions/:id error:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
);

// ---------------------------------------------------------------------------
// 10. DELETE /questions/:id — Delete a question (teacher/admin)
// ---------------------------------------------------------------------------
router.delete(
  '/questions/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var questionId = req.params.id;

      var existing = await prisma.question.findUnique({
        where: { id: questionId },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check if any student answers reference this question
      var answerCount = await prisma.studentAnswer.count({
        where: { questionId: questionId },
      });

      if (answerCount > 0) {
        // Soft-delete: mark inactive rather than hard-deleting
        await prisma.question.update({
          where: { id: questionId },
          data: { isActive: false },
        });
        return res.json({ message: 'Question deactivated (has existing student answers)', softDeleted: true });
      }

      // Hard delete — cascade will remove options
      await prisma.question.delete({ where: { id: questionId } });

      res.json({ message: 'Question deleted', softDeleted: false });
    } catch (error) {
      console.error('DELETE /assessments/questions/:id error:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
);

// ===========================================================================
// ASSESSMENT LIST + DETAIL ENDPOINTS (requireAuth)
// ===========================================================================

// ---------------------------------------------------------------------------
// 5. GET /history — Get user's attempt history
//    NOTE: Must be defined BEFORE /:id to avoid route conflicts.
// ---------------------------------------------------------------------------
router.get('/history', requireAuth, async function (req, res) {
  try {
    var assessmentId = String(req.query.assessmentId || '');
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    var offset = parseInt(req.query.offset, 10) || 0;

    var studentProfile = await getStudentProfile(req.user.id);
    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    var where = { studentProfileId: studentProfile.id };
    if (assessmentId) where.assessmentId = assessmentId;

    var [attempts, total] = await Promise.all([
      prisma.assessmentAttempt.findMany({
        where: where,
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              titleRw: true,
              assessmentType: true,
              subjectId: true,
              totalPoints: true,
              passingScore: true,
            },
          },
          assessmentResults: { take: 1 },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.assessmentAttempt.count({ where: where }),
    ]);

    res.json({
      attempts: attempts.map(function (a) {
        var result = a.assessmentResults[0] || null;
        return {
          id: a.id,
          assessmentId: a.assessmentId,
          assessment: a.assessment,
          status: a.status,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          timeSpentSeconds: a.timeSpentSeconds,
          totalScore: a.totalScore,
          result: result
            ? {
                id: result.id,
                totalScore: result.totalScore,
                maxScore: result.maxScore,
                percentage: Number(result.percentage),
                grade: result.grade,
                passed: result.passed,
                remarks: result.remarks,
              }
            : null,
        };
      }),
      total: total,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error('GET /assessments/history error:', error);
    res.status(500).json({ error: 'Failed to fetch attempt history' });
  }
});

// ---------------------------------------------------------------------------
// 1. GET / — List published assessments
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async function (req, res) {
  try {
    var subjectId = String(req.query.subjectId || '');
    var educationLevelId = String(req.query.educationLevelId || '');
    var type = String(req.query.type || '');
    var search = String(req.query.search || '');
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    var offset = parseInt(req.query.offset, 10) || 0;

    var where = {};

    // Students only see published assessments; staff can see all
    if (!isStaff(req.user)) {
      where.isPublished = true;
    }

    if (subjectId) where.subjectId = subjectId;
    if (educationLevelId) where.educationLevelId = educationLevelId;
    if (type) where.assessmentType = type;

    // Full-text search across title fields
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { titleRw: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    var [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where: where,
        include: {
          assessmentQuestions: {
            select: { id: true, questionId: true, questionOrder: true, points: true },
            orderBy: { questionOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.assessment.count({ where: where }),
    ]);

    // Fetch related subject and level names in bulk
    var subjectIds = [...new Set(assessments.map(function (a) { return a.subjectId; }).filter(Boolean))];
    var levelIds = [...new Set(assessments.map(function (a) { return a.educationLevelId; }).filter(Boolean))];

    var [subjects, levels] = await Promise.all([
      subjectIds.length > 0
        ? prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, code: true, name: true, nameEn: true } })
        : [],
      levelIds.length > 0
        ? prisma.educationLevel.findMany({ where: { id: { in: levelIds } }, select: { id: true, code: true, name: true, nameEn: true } })
        : [],
    ]);

    var subjectMap = {};
    subjects.forEach(function (s) { subjectMap[s.id] = s; });
    var levelMap = {};
    levels.forEach(function (l) { levelMap[l.id] = l; });

    res.json({
      assessments: assessments.map(function (a) {
        return {
          id: a.id,
          title: a.title,
          titleEn: a.titleEn,
          titleRw: a.titleRw,
          description: a.description,
          assessmentType: a.assessmentType,
          subjectId: a.subjectId,
          educationLevelId: a.educationLevelId,
          timeLimitMinutes: a.timeLimitMinutes,
          totalPoints: a.totalPoints,
          passingScore: a.passingScore,
          maxAttempts: a.maxAttempts,
          isPublished: a.isPublished,
          startDate: a.startDate,
          endDate: a.endDate,
          questionCount: a.assessmentQuestions.length,
          subject: a.subjectId ? subjectMap[a.subjectId] || null : null,
          educationLevel: a.educationLevelId ? levelMap[a.educationLevelId] || null : null,
        };
      }),
      total: total,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error('GET /assessments error:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /:id — Get assessment details
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async function (req, res) {
  try {
    var assessmentId = req.params.id;

    var assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentQuestions: {
          include: {
            question: {
              include: {
                questionOptions: { orderBy: { optionOrder: 'asc' } },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Students can only see published assessments
    if (!assessment.isPublished && !isStaff(req.user)) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Fetch subject and level info
    var [subject, level] = await Promise.all([
      assessment.subjectId
        ? prisma.subject.findUnique({ where: { id: assessment.subjectId }, select: { id: true, code: true, name: true, nameEn: true } })
        : null,
      assessment.educationLevelId
        ? prisma.educationLevel.findUnique({ where: { id: assessment.educationLevelId }, select: { id: true, code: true, name: true, nameEn: true } })
        : null,
    ]);

    // Check remaining attempts for students
    var attemptsRemaining = null;
    var studentProfile = null;
    if (!isStaff(req.user)) {
      studentProfile = await getStudentProfile(req.user.id);
      if (studentProfile && assessment.maxAttempts != null) {
        var attemptCount = await prisma.assessmentAttempt.count({
          where: { assessmentId: assessmentId, studentProfileId: studentProfile.id },
        });
        attemptsRemaining = Math.max(0, assessment.maxAttempts - attemptCount);
      }
    }

    // Redact questions for students: no correct answers, no explanations
    var staff = isStaff(req.user);
    var questions = assessment.assessmentQuestions.map(function (aq) {
      var q = staff ? aq.question : redactQuestionForStudent(aq.question);
      return {
        id: aq.id,
        questionOrder: aq.questionOrder,
        points: aq.points,
        isRequired: aq.isRequired,
        question: q,
      };
    });

    res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        titleEn: assessment.titleEn,
        titleRw: assessment.titleRw,
        description: assessment.description,
        assessmentType: assessment.assessmentType,
        subjectId: assessment.subjectId,
        educationLevelId: assessment.educationLevelId,
        timeLimitMinutes: assessment.timeLimitMinutes,
        totalPoints: assessment.totalPoints,
        passingScore: assessment.passingScore,
        maxAttempts: assessment.maxAttempts,
        isPublished: assessment.isPublished,
        startDate: assessment.startDate,
        endDate: assessment.endDate,
        subject: subject,
        educationLevel: level,
        questions: questions,
        questionCount: questions.length,
        attemptsRemaining: attemptsRemaining,
      },
    });
  } catch (error) {
    console.error('GET /assessments/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
});

// ---------------------------------------------------------------------------
// 3. POST /:id/start — Start a new attempt
// ---------------------------------------------------------------------------
router.post('/:id/start', requireAuth, async function (req, res) {
  try {
    var assessmentId = req.params.id;

    // Fetch student profile
    var studentProfile = await getStudentProfile(req.user.id);
    if (!studentProfile) {
      return res.status(400).json({ error: 'Student profile not found. Please complete your profile first.' });
    }

    // Fetch assessment
    var assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentQuestions: {
          include: {
            question: {
              include: {
                questionOptions: { orderBy: { optionOrder: 'asc' } },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (!assessment.isPublished) {
      return res.status(400).json({ error: 'Assessment is not currently available' });
    }

    // Check date validity
    var now = new Date();
    if (assessment.startDate && now < assessment.startDate) {
      return res.status(400).json({ error: 'Assessment has not started yet', startDate: assessment.startDate });
    }
    if (assessment.endDate && now > assessment.endDate) {
      return res.status(400).json({ error: 'Assessment has ended', endDate: assessment.endDate });
    }

    // Check max attempts
    if (assessment.maxAttempts != null) {
      var attemptCount = await prisma.assessmentAttempt.count({
        where: { assessmentId: assessmentId, studentProfileId: studentProfile.id },
      });
      if (attemptCount >= assessment.maxAttempts) {
        return res.status(400).json({
          error: 'Maximum attempts reached',
          maxAttempts: assessment.maxAttempts,
          attemptsUsed: attemptCount,
        });
      }
    }

    // Check for an existing in-progress attempt
    var existingAttempt = await prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: assessmentId,
        studentProfileId: studentProfile.id,
        status: 'in_progress',
      },
    });

    if (existingAttempt) {
      // Return the existing in-progress attempt instead of creating a new one
      var existingQuestions = assessment.assessmentQuestions.map(function (aq) {
        var shuffledOptions = shuffleArray(aq.question.questionOptions.slice());
        return {
          id: aq.id,
          questionOrder: aq.questionOrder,
          points: aq.points,
          isRequired: aq.isRequired,
          question: Object.assign({}, redactQuestionForStudent(aq.question), {
            questionOptions: redactOptions(shuffledOptions),
          }),
        };
      });

      return res.json({
        attempt: {
          id: existingAttempt.id,
          assessmentId: existingAttempt.assessmentId,
          status: existingAttempt.status,
          startedAt: existingAttempt.startedAt,
          timeLimitMinutes: assessment.timeLimitMinutes,
          questions: existingQuestions,
        },
        message: 'Resumed existing in-progress attempt',
      });
    }

    // Create a new attempt
    var attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assessmentId,
        studentProfileId: studentProfile.id,
        status: 'in_progress',
        maxScore: assessment.totalPoints,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
      },
    });

    // Prepare questions: shuffle options, redact correct answers
    var questions = assessment.assessmentQuestions.map(function (aq) {
      var shuffledOptions = shuffleArray(aq.question.questionOptions.slice());
      return {
        id: aq.id,
        questionOrder: aq.questionOrder,
        points: aq.points,
        isRequired: aq.isRequired,
        question: Object.assign({}, redactQuestionForStudent(aq.question), {
          questionOptions: redactOptions(shuffledOptions),
        }),
      };
    });

    res.status(201).json({
      attempt: {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        timeLimitMinutes: assessment.timeLimitMinutes,
        questions: questions,
      },
    });
  } catch (error) {
    console.error('POST /assessments/:id/start error:', error);
    res.status(500).json({ error: 'Failed to start assessment attempt' });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /:id/submit — Submit answers and auto-score
// ---------------------------------------------------------------------------
router.post('/:id/submit', requireAuth, async function (req, res) {
  try {
    var assessmentId = req.params.id;
    var body = req.body || {};
    var attemptId = body.attemptId;
    var answers = body.answers || [];

    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers array is required and must not be empty' });
    }

    // Validate each answer has at least questionId
    for (var i = 0; i < answers.length; i++) {
      if (!answers[i].questionId) {
        return res.status(400).json({ error: 'Each answer must include a questionId' });
      }
    }

    // Fetch student profile
    var studentProfile = await getStudentProfile(req.user.id);
    if (!studentProfile) {
      return res.status(400).json({ error: 'Student profile not found' });
    }

    // Fetch the attempt and verify ownership
    var attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    if (attempt.assessmentId !== assessmentId) {
      return res.status(400).json({ error: 'Attempt does not belong to this assessment' });
    }
    if (attempt.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'You do not have permission to submit this attempt' });
    }
    if (attempt.status === 'completed') {
      return res.status(400).json({ error: 'This attempt has already been submitted' });
    }

    // Fetch all assessment questions with their question data and options
    var assessmentQuestions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: assessmentId },
      include: {
        question: {
          include: {
            questionOptions: true,
          },
        },
      },
    });

    // Build lookup maps
    var aqMap = {};
    assessmentQuestions.forEach(function (aq) {
      aqMap[aq.questionId] = aq;
    });

    // Build answer lookup
    var answerMap = {};
    answers.forEach(function (a) {
      answerMap[a.questionId] = a;
    });

    // Score each answer
    var totalScore = 0;
    var maxScore = 0;
    var correctCount = 0;
    var totalQuestions = 0;
    var subjectiveQuestions = 0;
    var studentAnswerRecords = [];

    for (var j = 0; j < assessmentQuestions.length; j++) {
      var aq = assessmentQuestions[j];
      var q = aq.question;
      var answer = answerMap[q.id];
      var questionPoints = aq.points != null ? aq.points : q.points;
      maxScore += questionPoints;

      if (!answer) {
        // No answer provided
        studentAnswerRecords.push({
          assessmentAttemptId: attemptId,
          questionId: q.id,
          selectedOptionId: null,
          answerText: null,
          isCorrect: false,
          pointsEarned: 0,
          timeSpentSeconds: 0,
        });
        totalQuestions++;
        continue;
      }

      var isCorrect = null;
      var pointsEarned = 0;
      var timeSpentSeconds = answer.timeSpentSeconds || 0;

      if (q.questionType === 'multiple_choice' || q.questionType === 'true_false') {
        // Objective scoring: compare selectedOptionId with isCorrect
        totalQuestions++;
        if (answer.selectedOptionId) {
          var selectedOption = q.questionOptions.find(function (o) {
            return o.id === answer.selectedOptionId;
          });
          if (selectedOption && selectedOption.isCorrect) {
            isCorrect = true;
            pointsEarned = questionPoints;
            correctCount++;
          } else {
            isCorrect = false;
            pointsEarned = 0;
          }
        } else {
          isCorrect = false;
          pointsEarned = 0;
        }
      } else if (q.questionType === 'short_answer' || q.questionType === 'essay') {
        // Subjective: mark for teacher review
        subjectiveQuestions++;
        isCorrect = null;
        pointsEarned = 0; // Will be graded manually
      } else {
        // Fallback: treat as objective if there are options
        totalQuestions++;
        if (answer.selectedOptionId) {
          var selectedOpt = q.questionOptions.find(function (o) {
            return o.id === answer.selectedOptionId;
          });
          if (selectedOpt && selectedOpt.isCorrect) {
            isCorrect = true;
            pointsEarned = questionPoints;
            correctCount++;
          } else {
            isCorrect = false;
            pointsEarned = 0;
          }
        } else {
          isCorrect = false;
          pointsEarned = 0;
        }
      }

      totalScore += pointsEarned;

      studentAnswerRecords.push({
        assessmentAttemptId: attemptId,
        questionId: q.id,
        selectedOptionId: answer.selectedOptionId || null,
        answerText: answer.answerText || null,
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        timeSpentSeconds: timeSpentSeconds,
      });
    }

    // Calculate time spent
    var completedAt = new Date();
    var timeSpentSeconds = Math.floor((completedAt - attempt.startedAt) / 1000);

    // Calculate percentage
    var percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    var passed = assessment.passingScore != null ? percentage >= assessment.passingScore : null;
    var grade = computeGrade(percentage);

    // Build per-question feedback for the response
    var questionFeedback = assessmentQuestions.map(function (aq) {
      var q = aq.question;
      var record = studentAnswerRecords.find(function (r) { return r.questionId === q.id; });
      var correctOption = q.questionOptions.find(function (o) { return o.isCorrect; });

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        selectedOptionId: record ? record.selectedOptionId : null,
        answerText: record ? record.answerText : null,
        isCorrect: record ? record.isCorrect : null,
        pointsEarned: record ? record.pointsEarned : 0,
        maxPoints: aq.points != null ? aq.points : q.points,
        correctOptionId: correctOption ? correctOption.id : null,
        correctOptionText: correctOption ? correctOption.optionText : null,
        explanation: q.explanation || null,
        explanationEn: q.explanationEn || null,
        explanationRw: q.explanationRw || null,
      };
    });

    // Execute the submission in a transaction
    var result = await prisma.$transaction(async function (tx) {
      // 1. Create StudentAnswer records
      if (studentAnswerRecords.length > 0) {
        await tx.studentAnswer.createMany({ data: studentAnswerRecords });
      }

      // 2. Create AssessmentResult
      var assessmentResult = await tx.assessmentResult.create({
        data: {
          assessmentAttemptId: attemptId,
          totalScore: totalScore,
          maxScore: maxScore,
          percentage: percentage,
          grade: grade,
          passed: passed,
          remarks: subjectiveQuestions > 0
            ? 'Contains ' + subjectiveQuestions + ' question(s) pending teacher review'
            : null,
        },
      });

      // 3. Update AssessmentAttempt
      var updatedAttempt = await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: completedAt,
          timeSpentSeconds: timeSpentSeconds,
          totalScore: totalScore,
          maxScore: maxScore,
          percentage: percentage,
          status: 'completed',
        },
      });

      // 4. Update StudentProgress
      var studentProgress = await tx.studentProgress.findFirst({
        where: { userId: req.user.id },
      });

      if (studentProgress) {
        var newTotalAnswered = studentProgress.totalQuestionsAnswered + totalQuestions;
        var newCorrect = studentProgress.correctAnswers + correctCount;
        var newAccuracy = newTotalAnswered > 0 ? (newCorrect / newTotalAnswered) * 100 : 0;
        var xpEarned = totalScore;

        await tx.studentProgress.update({
          where: { id: studentProgress.id },
          data: {
            totalQuestionsAnswered: newTotalAnswered,
            correctAnswers: newCorrect,
            accuracy: newAccuracy,
            totalXp: studentProgress.totalXp + xpEarned,
            lastActivityAt: new Date(),
          },
        });

        // 5. Create LearningActivityLog entry
        await tx.learningActivityLog.create({
          data: {
            userId: req.user.id,
            studentProfileId: studentProfile.id,
            activityType: 'assessment_completed',
            subjectId: assessment.subjectId || null,
            educationLevelId: assessment.educationLevelId || null,
            activityId: assessmentId,
            activityTitle: assessment.title || assessment.titleEn || 'Assessment',
            durationSeconds: timeSpentSeconds,
            xpEarned: xpEarned,
            score: percentage,
            metadata: {
              assessmentType: assessment.assessmentType,
              totalScore: totalScore,
              maxScore: maxScore,
              passed: passed,
              grade: grade,
              correctAnswers: correctCount,
              totalQuestions: totalQuestions,
              subjectiveQuestions: subjectiveQuestions,
            },
          },
        });
      }

      return {
        attempt: updatedAttempt,
        result: assessmentResult,
      };
    });

    res.json({
      attempt: {
        id: result.attempt.id,
        assessmentId: result.attempt.assessmentId,
        status: result.attempt.status,
        startedAt: attempt.startedAt,
        completedAt: result.attempt.completedAt,
        timeSpentSeconds: result.attempt.timeSpentSeconds,
        totalScore: result.attempt.totalScore,
        maxScore: result.attempt.maxScore,
      },
      result: {
        id: result.result.id,
        totalScore: result.result.totalScore,
        maxScore: result.result.maxScore,
        percentage: Number(result.result.percentage),
        grade: result.result.grade,
        passed: result.result.passed,
        remarks: result.result.remarks,
      },
      summary: {
        correctAnswers: correctCount,
        totalObjectiveQuestions: totalQuestions,
        subjectiveQuestions: subjectiveQuestions,
        totalQuestions: assessmentQuestions.length,
      },
      questionFeedback: questionFeedback,
    });
  } catch (error) {
    console.error('POST /assessments/:id/submit error:', error);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// ---------------------------------------------------------------------------
// 6. GET /results/:attemptId — Get detailed results for an attempt
// ---------------------------------------------------------------------------
router.get('/results/:attemptId', requireAuth, async function (req, res) {
  try {
    var attemptId = req.params.attemptId;

    var attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            titleRw: true,
            assessmentType: true,
            subjectId: true,
            educationLevelId: true,
            totalPoints: true,
            passingScore: true,
          },
        },
        assessmentResults: { take: 1 },
        studentAnswers: {
          include: {
            question: {
              include: {
                questionOptions: { orderBy: { optionOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Authorization: only the student who took it, or a teacher/admin
    var staff = isStaff(req.user);
    if (!staff) {
      var studentProfile = await getStudentProfile(req.user.id);
      if (!studentProfile || attempt.studentProfileId !== studentProfile.id) {
        return res.status(403).json({ error: 'You do not have permission to view this result' });
      }
    }

    var result = attempt.assessmentResults[0] || null;

    // Build per-question detail with correct answers and explanations
    var questionDetails = attempt.studentAnswers.map(function (sa) {
      var q = sa.question;
      var correctOption = q.questionOptions.find(function (o) { return o.isCorrect; });
      var selectedOption = sa.selectedOptionId
        ? q.questionOptions.find(function (o) { return o.id === sa.selectedOptionId; })
        : null;

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionTextEn: q.questionTextEn,
        questionTextRw: q.questionTextRw,
        questionType: q.questionType,
        difficulty: q.difficulty,
        selectedOptionId: sa.selectedOptionId,
        selectedOptionText: selectedOption ? selectedOption.optionText : null,
        answerText: sa.answerText,
        isCorrect: sa.isCorrect,
        pointsEarned: sa.pointsEarned,
        maxPoints: q.points,
        timeSpentSeconds: sa.timeSpentSeconds,
        correctOptionId: correctOption ? correctOption.id : null,
        correctOptionText: correctOption ? correctOption.optionText : null,
        explanation: q.explanation,
        explanationEn: q.explanationEn,
        explanationRw: q.explanationRw,
        mediaUrl: q.mediaUrl,
        options: q.questionOptions.map(function (o) {
          return {
            id: o.id,
            optionText: o.optionText,
            optionTextEn: o.optionTextEn,
            optionTextRw: o.optionTextRw,
            optionOrder: o.optionOrder,
            isCorrect: o.isCorrect,
            mediaUrl: o.mediaUrl,
          };
        }),
      };
    });

    res.json({
      attempt: {
        id: attempt.id,
        assessmentId: attempt.assessmentId,
        assessment: attempt.assessment,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        timeSpentSeconds: attempt.timeSpentSeconds,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
      },
      result: result
        ? {
            id: result.id,
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            percentage: Number(result.percentage),
            grade: result.grade,
            passed: result.passed,
            remarks: result.remarks,
          }
        : null,
      questionDetails: questionDetails,
    });
  } catch (error) {
    console.error('GET /assessments/results/:attemptId error:', error);
    res.status(500).json({ error: 'Failed to fetch assessment results' });
  }
});

// ===========================================================================
// ASSESSMENT CRUD ENDPOINTS (teacher/admin)
// ===========================================================================

// ---------------------------------------------------------------------------
// 11. POST / — Create an assessment (teacher/admin)
// ---------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var data = req.body || {};

      // Validate required fields
      if (!data.title) {
        return res.status(400).json({ error: 'title is required' });
      }
      if (!data.assessmentType) {
        return res.status(400).json({ error: 'assessmentType is required' });
      }

      var questionIds = data.questionIds || [];
      if (!Array.isArray(questionIds)) {
        return res.status(400).json({ error: 'questionIds must be an array' });
      }

      // Calculate total points from questions if not explicitly provided
      var totalPoints = data.totalPoints;
      if (totalPoints == null && questionIds.length > 0) {
        var questions = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, points: true },
        });
        totalPoints = questions.reduce(function (sum, q) { return sum + q.points; }, 0);
      }

      var assessment = await prisma.$transaction(async function (tx) {
        var a = await tx.assessment.create({
          data: {
            title: data.title,
            titleEn: data.titleEn || null,
            titleRw: data.titleRw || null,
            description: data.description || null,
            assessmentType: data.assessmentType,
            subjectId: data.subjectId || null,
            educationLevelId: data.educationLevelId || null,
            timeLimitMinutes: data.timeLimitMinutes || null,
            totalPoints: totalPoints || 0,
            passingScore: data.passingScore || null,
            maxAttempts: data.maxAttempts || null,
            isPublished: data.isPublished || false,
            publishedAt: data.isPublished ? new Date() : null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            createdBy: req.user.id,
          },
        });

        // Link questions
        if (questionIds.length > 0) {
          var aqData = questionIds.map(function (qId, idx) {
            return {
              assessmentId: a.id,
              questionId: qId,
              questionOrder: idx + 1,
              points: data.questionPoints && data.questionPoints[qId] != null
                ? data.questionPoints[qId]
                : null,
              isRequired: data.questionRequired && data.questionRequired[qId] != null
                ? data.questionRequired[qId]
                : true,
            };
          });

          await tx.assessmentQuestion.createMany({ data: aqData });
        }

        return a;
      });

      // Re-fetch with questions for the response
      var created = await prisma.assessment.findUnique({
        where: { id: assessment.id },
        include: {
          assessmentQuestions: {
            include: {
              question: {
                select: { id: true, questionText: true, questionType: true, difficulty: true, points: true },
              },
            },
            orderBy: { questionOrder: 'asc' },
          },
        },
      });

      res.status(201).json({ assessment: created });
    } catch (error) {
      console.error('POST /assessments error:', error);
      res.status(500).json({ error: 'Failed to create assessment' });
    }
  }
);

// ---------------------------------------------------------------------------
// 12. PATCH /:id — Update an assessment (teacher/admin)
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var assessmentId = req.params.id;
      var data = req.body || {};

      var existing = await prisma.assessment.findUnique({
        where: { id: assessmentId },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      var assessment = await prisma.$transaction(async function (tx) {
        var updateData = {};

        // Only include fields that are explicitly provided
        if (data.title !== undefined) updateData.title = data.title;
        if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
        if (data.titleRw !== undefined) updateData.titleRw = data.titleRw;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.assessmentType !== undefined) updateData.assessmentType = data.assessmentType;
        if (data.subjectId !== undefined) updateData.subjectId = data.subjectId;
        if (data.educationLevelId !== undefined) updateData.educationLevelId = data.educationLevelId;
        if (data.timeLimitMinutes !== undefined) updateData.timeLimitMinutes = data.timeLimitMinutes;
        if (data.totalPoints !== undefined) updateData.totalPoints = data.totalPoints;
        if (data.passingScore !== undefined) updateData.passingScore = data.passingScore;
        if (data.maxAttempts !== undefined) updateData.maxAttempts = data.maxAttempts;
        if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
        if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

        // Handle publish/unpublish
        if (data.isPublished !== undefined) {
          updateData.isPublished = data.isPublished;
          updateData.publishedAt = data.isPublished ? new Date() : existing.publishedAt;
        }

        var a = await tx.assessment.update({
          where: { id: assessmentId },
          data: updateData,
        });

        // Replace question list if provided
        if (data.questionIds && Array.isArray(data.questionIds)) {
          // Remove existing question links
          await tx.assessmentQuestion.deleteMany({ where: { assessmentId: assessmentId } });

          if (data.questionIds.length > 0) {
            var aqData = data.questionIds.map(function (qId, idx) {
              return {
                assessmentId: assessmentId,
                questionId: qId,
                questionOrder: idx + 1,
                points: data.questionPoints && data.questionPoints[qId] != null
                  ? data.questionPoints[qId]
                  : null,
                isRequired: data.questionRequired && data.questionRequired[qId] != null
                  ? data.questionRequired[qId]
                  : true,
              };
            });

            await tx.assessmentQuestion.createMany({ data: aqData });
          }
        }

        return a;
      });

      var updated = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          assessmentQuestions: {
            include: {
              question: {
                select: { id: true, questionText: true, questionType: true, difficulty: true, points: true },
              },
            },
            orderBy: { questionOrder: 'asc' },
          },
        },
      });

      res.json({ assessment: updated });
    } catch (error) {
      console.error('PATCH /assessments/:id error:', error);
      res.status(500).json({ error: 'Failed to update assessment' });
    }
  }
);

// ---------------------------------------------------------------------------
// 13. DELETE /:id — Delete/unpublish an assessment (teacher/admin)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var assessmentId = req.params.id;

      var existing = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          _count: { select: { assessmentAttempts: true } },
        },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      // If there are attempts, unpublish rather than hard-delete
      if (existing._count.assessmentAttempts > 0) {
        await prisma.assessment.update({
          where: { id: assessmentId },
          data: { isPublished: false },
        });
        return res.json({
          message: 'Assessment unpublished (has existing attempts)',
          softDeleted: true,
        });
      }

      // Hard delete — cascade will remove assessment questions
      await prisma.assessment.delete({ where: { id: assessmentId } });

      res.json({ message: 'Assessment deleted', softDeleted: false });
    } catch (error) {
      console.error('DELETE /assessments/:id error:', error);
      res.status(500).json({ error: 'Failed to delete assessment' });
    }
  }
);

// ---------------------------------------------------------------------------
// 14. GET /upcoming — List upcoming exams for students
// ---------------------------------------------------------------------------
router.get('/upcoming', requireAuth, async function (req, res) {
  try {
    var studentProfile = await getStudentProfile(req.user.id);
    if (!studentProfile) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    var now = new Date();
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // Fetch published assessments with start dates in the future
    var upcomingAssessments = await prisma.assessment.findMany({
      where: {
        isPublished: true,
        startDate: { gte: now },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            nameRw: true,
          },
        },
        educationLevel: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            nameRw: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });

    // Format response
    var formatted = upcomingAssessments.map(function (a) {
      return {
        id: a.id,
        title: a.titleEn || a.title,
        titleEn: a.titleEn,
        titleRw: a.titleRw,
        description: a.description,
        assessmentType: a.assessmentType,
        subject: a.subject ? (a.subject.nameEn || a.subject.name) : null,
        subjectId: a.subjectId,
        educationLevel: a.educationLevel ? (a.educationLevel.nameEn || a.educationLevel.name) : null,
        educationLevelId: a.educationLevelId,
        startDate: a.startDate,
        endDate: a.endDate,
        timeLimitMinutes: a.timeLimitMinutes,
        totalPoints: a.totalPoints,
        passingScore: a.passingScore,
        maxAttempts: a.maxAttempts,
      };
    });

    res.json({ assessments: formatted, count: formatted.length });
  } catch (error) {
    console.error('GET /assessments/upcoming error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming assessments' });
  }
});

module.exports = router;
