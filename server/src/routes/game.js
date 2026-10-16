const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireActive } = require('../middleware/auth');

const prisma = new PrismaClient();

router.post('/match', requireAuth, requireActive, async (req, res) => {
  try {
    const {
      subject,
      subjectName,
      level,
      pathway,
      topic,
      difficulty,
      mode,
      totalRounds,
      playerScore,
      opponentScore,
      opponentName,
      answers,
    } = req.body;

    if (!subject || !level || !pathway) {
      return res.status(400).json({ error: 'subject, level, and pathway are required' });
    }

    const player1Accuracy = totalRounds > 0
      ? Math.round((playerScore / (totalRounds * 3)) * 100)
      : 0;

    const result = playerScore > opponentScore ? 'win'
      : playerScore === opponentScore ? 'draw' : 'loss';

    const match = await prisma.gameMatch.create({
      data: {
        player1Id: req.user.id,
        player1Score: playerScore || 0,
        player2Score: opponentScore || 0,
        subjectName: subjectName || subject,
        level,
        pathway,
        topic: topic || 'all',
        difficulty: difficulty || 'adaptive',
        mode: mode || 'quick',
        totalRounds: totalRounds || 10,
        result,
        status: 'completed',
        player1Accuracy,
        completedAt: new Date(),
        gameAnswers: answers && answers.length > 0 ? {
          create: answers.map((a, idx) => ({
            userId: req.user.id,
            questionId: a.questionId || 'unknown',
            roundNumber: a.roundNumber || idx + 1,
            selectedAnswer: typeof a.selectedAnswer === 'number' ? a.selectedAnswer : null,
            answerText: typeof a.selectedAnswer === 'string' ? a.selectedAnswer : null,
            isCorrect: !!a.isCorrect,
            points: a.points || 0,
            timeUsed: a.timeUsed || 0,
          })),
        } : undefined,
      },
      include: { gameAnswers: true },
    });

    res.status(201).json({
      message: 'Match saved successfully',
      match: {
        id: match.id,
        result: match.result,
        playerScore: match.player1Score,
        opponentScore: match.player2Score,
        accuracy: match.player1Accuracy,
        subject: match.subjectName,
        level: match.level,
        completedAt: match.completedAt,
      },
    });
  } catch (error) {
    console.error('Save match error:', error);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [matches, total] = await Promise.all([
      prisma.gameMatch.findMany({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id },
          ],
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          subjectId: true,
          subjectName: true,
          level: true,
          pathway: true,
          topic: true,
          difficulty: true,
          mode: true,
          player1Score: true,
          player2Score: true,
          result: true,
          player1Accuracy: true,
          totalRounds: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.gameMatch.count({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id },
          ],
        },
      }),
    ]);

    res.json({
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalMatches, wins, draws, losses, avgAccuracy] = await Promise.all([
      prisma.gameMatch.count({
        where: { player1Id: userId },
      }),
      prisma.gameMatch.count({
        where: { player1Id: userId, result: 'win' },
      }),
      prisma.gameMatch.count({
        where: { player1Id: userId, result: 'draw' },
      }),
      prisma.gameMatch.count({
        where: { player1Id: userId, result: 'loss' },
      }),
      prisma.gameMatch.aggregate({
        where: { player1Id: userId, player1Accuracy: { not: null } },
        _avg: { player1Accuracy: true },
      }),
    ]);

    const subjectStats = await prisma.gameMatch.groupBy({
      by: ['subjectName'],
      where: { player1Id: userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    res.json({
      totalMatches,
      wins,
      draws,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      averageAccuracy: avgAccuracy._avg.player1Accuracy
        ? Math.round(avgAccuracy._avg.player1Accuracy)
        : 0,
      topSubjects: subjectStats
        .filter(s => s.subjectName)
        .map(s => ({
          subject: s.subjectName,
          matches: s._count.id,
        })),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
