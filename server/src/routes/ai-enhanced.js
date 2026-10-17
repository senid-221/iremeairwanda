/**
 * Enhanced AI Capabilities API endpoints
 * Task creation, image generation, search, lesson recommendations
 */
var express = require('express');
var router = express.Router();
var { requireAuth } = require('../middleware/auth');
var aiCapabilities = require('../services/ai-capabilities');

// ===========================================================================
// TASK MANAGEMENT
// ===========================================================================

/**
 * POST /tasks — Create a new learning task
 */
router.post('/tasks', requireAuth, async function (req, res) {
  try {
    var result = await aiCapabilities.createLearningTask(req.user.id, req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.status(201).json({
      message: 'Task created successfully',
      task: result.task
    });
  } catch (err) {
    console.error('POST /ai-enhanced/tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * GET /tasks — Get user's tasks
 */
router.get('/tasks', requireAuth, async function (req, res) {
  try {
    var filters = {
      status: req.query.status,
      taskType: req.query.taskType,
      subject: req.query.subject,
      limit: parseInt(req.query.limit) || 50
    };
    
    var result = await aiCapabilities.getUserTasks(req.user.id, filters);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      tasks: result.tasks,
      count: result.tasks.length
    });
  } catch (err) {
    console.error('GET /ai-enhanced/tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * PUT /tasks/:id — Update task status
 */
router.put('/tasks/:id', requireAuth, async function (req, res) {
  try {
    var { PrismaClient } = require('@prisma/client');
    var prisma = new PrismaClient();
    
    var task = await prisma.learningTask.update({
      where: { id: req.params.id, userId: req.user.id },
      data: {
        status: req.body.status,
        completedAt: req.body.status === 'completed' ? new Date() : null
      }
    });
    
    res.json({
      message: 'Task updated',
      task: task
    });
  } catch (err) {
    console.error('PUT /ai-enhanced/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ===========================================================================
// IMAGE GENERATION
// ===========================================================================

/**
 * POST /generate-image — Generate educational image
 */
router.post('/generate-image', requireAuth, async function (req, res) {
  try {
    var { prompt, subject, level } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    var result = await aiCapabilities.generateEducationalImage(prompt, {
      userId: req.user.id,
      subject: subject,
      level: level
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Save to database
    var { PrismaClient } = require('@prisma/client');
    var prisma = new PrismaClient();
    
    var savedImage = await prisma.generatedImage.create({
      data: {
        userId: req.user.id,
        prompt: prompt,
        revisedPrompt: result.revisedPrompt,
        imageUrl: result.imageUrl,
        subject: subject,
        level: level
      }
    });
    
    res.json({
      message: 'Image generated successfully',
      image: {
        id: savedImage.id,
        url: result.imageUrl,
        prompt: prompt
      }
    });
  } catch (err) {
    console.error('POST /ai-enhanced/generate-image error:', err);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

/**
 * GET /images — Get user's generated images
 */
router.get('/images', requireAuth, async function (req, res) {
  try {
    var { PrismaClient } = require('@prisma/client');
    var prisma = new PrismaClient();
    
    var images = await prisma.generatedImage.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 20
    });
    
    res.json({
      images: images,
      count: images.length
    });
  } catch (err) {
    console.error('GET /ai-enhanced/images error:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// ===========================================================================
// SEARCH & ANSWERS
// ===========================================================================

/**
 * POST /search — Search platform content
 */
router.post('/search', requireAuth, async function (req, res) {
  try {
    var { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    var result = await aiCapabilities.searchPlatformContent(query, req.user.id);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      query: query,
      results: result.results
    });
  } catch (err) {
    console.error('POST /ai-enhanced/search error:', err);
    res.status(500).json({ error: 'Failed to search' });
  }
});

/**
 * POST /ask — Ask AI a question with context
 */
router.post('/ask', requireAuth, async function (req, res) {
  try {
    var { question, subject, level } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Get student info for context
    var { PrismaClient } = require('@prisma/client');
    var prisma = new PrismaClient();
    
    var user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { fullName: true }
    });
    
    var result = await aiCapabilities.generateAnswer(question, {
      userId: req.user.id,
      studentName: user?.fullName,
      subject: subject,
      level: level
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      question: question,
      answer: result.answer
    });
  } catch (err) {
    console.error('POST /ai-enhanced/ask error:', err);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// ===========================================================================
// LESSON RECOMMENDATIONS
// ===========================================================================

/**
 * GET /recommendations — Get personalized lesson recommendations
 */
router.get('/recommendations', requireAuth, async function (req, res) {
  try {
    var result = await aiCapabilities.recommendLessons(req.user.id, {});
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      recommendations: result.recommendations
    });
  } catch (err) {
    console.error('GET /ai-enhanced/recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// ===========================================================================
// AI USAGE STATS
// ===========================================================================

/**
 * GET /usage — Get user's AI usage statistics
 */
router.get('/usage', requireAuth, async function (req, res) {
  try {
    var { PrismaClient } = require('@prisma/client');
    var prisma = new PrismaClient();
    
    var usage = await prisma.aiUsageLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    var totalCost = usage.reduce(function(sum, log) {
      return sum + (parseFloat(log.cost) || 0);
    }, 0);
    
    res.json({
      usage: usage,
      totalCost: totalCost,
      count: usage.length
    });
  } catch (err) {
    console.error('GET /ai-enhanced/usage error:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

module.exports = router;
