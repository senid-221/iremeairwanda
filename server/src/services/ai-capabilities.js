/**
 * Enhanced AI Capabilities Service
 * Provides advanced AI features: task creation, image generation, search, lesson recommendations
 * with proper security controls and privacy safeguards
 */

var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

// ===========================================================================
// CAPABILITY 1: TASK CREATION
// ===========================================================================

/**
 * Create learning tasks for students
 */
async function createLearningTask(userId, taskData) {
  try {
    var task = await prisma.learningTask.create({
      data: {
        userId: userId,
        title: taskData.title,
        description: taskData.description,
        taskType: taskData.taskType || 'study', // study, assignment, revision, project
        subject: taskData.subject,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        priority: taskData.priority || 'medium', // low, medium, high
        status: 'pending',
        aiGenerated: true,
        metadata: taskData.metadata || {}
      }
    });
    return { success: true, task: task };
  } catch (err) {
    console.error('createLearningTask error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user's tasks
 */
async function getUserTasks(userId, filters) {
  try {
    var where = { userId: userId };
    
    if (filters.status) where.status = filters.status;
    if (filters.taskType) where.taskType = filters.taskType;
    if (filters.subject) where.subject = filters.subject;
    
    var tasks = await prisma.learningTask.findMany({
      where: where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ],
      take: filters.limit || 50
    });
    
    return { success: true, tasks: tasks };
  } catch (err) {
    console.error('getUserTasks error:', err);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// CAPABILITY 2: IMAGE GENERATION (Educational Visuals)
// ===========================================================================

/**
 * Generate educational images/diagrams
 * Uses OpenAI DALL-E or similar service
 */
async function generateEducationalImage(prompt, context) {
  try {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Image generation not configured' };
    }

    // Enhance prompt for educational context
    var enhancedPrompt = `Educational diagram/illustration: ${prompt}. 
    Style: Clear, educational, suitable for students. 
    Context: ${context.subject || 'General'} - ${context.level || 'All levels'}`;

    var response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      var errorText = await response.text();
      console.error('Image generation failed:', response.status, errorText);
      return { success: false, error: 'Image generation failed' };
    }

    var data = await response.json();
    
    // Log the image generation for tracking
    await prisma.aiUsageLog.create({
      data: {
        userId: context.userId,
        feature: 'image-generation',
        model: 'dall-e-3',
        inputTokens: 0,
        outputTokens: 0,
        metadata: { prompt: prompt, imageUrl: data.data[0].url }
      }
    });

    return {
      success: true,
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt
    };
  } catch (err) {
    console.error('generateEducationalImage error:', err);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// CAPABILITY 3: SEARCH & ANSWER FINDING
// ===========================================================================

/**
 * Search within platform content for answers
 */
async function searchPlatformContent(query, userId) {
  try {
    var results = {
      lessons: [],
      resources: [],
      assessments: [],
      videos: []
    };

    // Search video lessons
    var videos = await prisma.videoLesson.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { topicName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        title: true,
        topicName: true,
        durationSeconds: true,
        educationLevel: { select: { nameEn: true } }
      }
    });
    results.videos = videos;

    // Search educational resources
    var resources = await prisma.educationalResource.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        resourceType: true,
        url: true
      }
    });
    results.resources = resources;

    // Search assessments
    var assessments = await prisma.assessment.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        title: true,
        assessmentType: true,
        subject: { select: { nameEn: true } }
      }
    });
    results.assessments = assessments;

    return { success: true, results: results };
  } catch (err) {
    console.error('searchPlatformContent error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * AI-powered answer generation with context
 */
async function generateAnswer(question, context) {
  try {
    var apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'AI not configured' };
    }

    // Build context-aware prompt
    var systemPrompt = `You are IREME AI Tutor, helping Rwandan students.
Subject: ${context.subject || 'General'}
Level: ${context.level || 'Secondary'}
Student: ${context.studentName || 'Student'}

Provide clear, educational answers aligned with Rwanda's competence-based curriculum.
Use examples relevant to Rwandan context when possible.
Be encouraging and supportive.`;

    var response = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      return { success: false, error: 'AI request failed' };
    }

    var data = await response.json();
    var answer = data.choices[0].message.content;

    return { success: true, answer: answer };
  } catch (err) {
    console.error('generateAnswer error:', err);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// CAPABILITY 4: LESSON RECOMMENDATIONS
// ===========================================================================

/**
 * Recommend lessons based on student progress and interests
 */
async function recommendLessons(userId, preferences) {
  try {
    // Get student's learning history
    var recentActivity = await prisma.learningActivityLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        activityType: true,
        subjectId: true,
        xpEarned: true,
        createdAt: true
      }
    });

    // Get student's enrollments to know their level
    var studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: userId },
      include: {
        studentEnrollments: {
          where: { status: 'active' },
          include: {
            educationLevel: { select: { id: true, nameEn: true } }
          }
        }
      }
    });

    var levelIds = studentProfile?.studentEnrollments.map(e => e.educationLevelId) || [];

    // Find subjects student is studying
    var subjectIds = [...new Set(recentActivity.map(a => a.subjectId).filter(Boolean))];

    // Recommend video lessons
    var recommendedVideos = await prisma.videoLesson.findMany({
      where: {
        status: 'published',
        OR: [
          { subjectId: { in: subjectIds } },
          { educationLevelId: { in: levelIds } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        topicName: true,
        durationSeconds: true,
        educationLevel: { select: { nameEn: true } },
        subject: { select: { nameEn: true } }
      }
    });

    // Recommend assessments
    var recommendedAssessments = await prisma.assessment.findMany({
      where: {
        isPublished: true,
        startDate: { lte: new Date() },
        OR: [
          { subjectId: { in: subjectIds } },
          { educationLevelId: { in: levelIds } }
        ]
      },
      orderBy: { startDate: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        assessmentType: true,
        startDate: true,
        subject: { select: { nameEn: true } }
      }
    });

    return {
      success: true,
      recommendations: {
        videos: recommendedVideos,
        assessments: recommendedAssessments,
        basedOn: {
          recentSubjects: subjectIds.length,
          level: studentProfile?.studentEnrollments[0]?.educationLevel?.nameEn || 'Unknown'
        }
      }
    };
  } catch (err) {
    console.error('recommendLessons error:', err);
    return { success: false, error: err.message };
  }
}

// ===========================================================================
// CAPABILITY 5: STUDENT RECOGNITION (Privacy-Safe)
// ===========================================================================

/**
 * Note: Face recognition requires explicit consent and proper security.
 * This is a framework for future implementation with proper safeguards.
 */
async function verifyStudentIdentity(userId, verificationData) {
  // TODO: Implement with proper privacy controls
  // - Explicit user consent required
  // - Encrypted biometric data storage
  // - Compliance with data protection laws
  // - Option to disable feature
  
  return {
    success: false,
    message: 'Face recognition not yet implemented. Requires privacy review and user consent.'
  };
}

// ===========================================================================
// EXPORTS
// ===========================================================================

module.exports = {
  createLearningTask: createLearningTask,
  getUserTasks: getUserTasks,
  generateEducationalImage: generateEducationalImage,
  searchPlatformContent: searchPlatformContent,
  generateAnswer: generateAnswer,
  recommendLessons: recommendLessons,
  verifyStudentIdentity: verifyStudentIdentity
};
