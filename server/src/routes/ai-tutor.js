/**
 * AI Tutor conversation endpoints — create conversations, send messages,
 * generate AI-powered tutoring responses, and manage conversation history
 * for the IREME Rwanda education platform.
 */
var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth, requireRole } = require('../middleware/auth');

var prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var AI_RESPONSE_TIMEOUT_MS = 30000;
var CONTEXT_MESSAGE_LIMIT = 10;
var FALLBACK_MESSAGE_EN = 'I\'m currently unavailable. Please try again later or contact support.';
var FALLBACK_MESSAGE_RW = 'Ntabwo nshobora kuboneka ubu. Nyamuneka gerageza nyuma cyangwa uhamagaze ubufasha.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the StudentProfile for the currently authenticated user.
 * Returns null when no profile exists.
 */
async function getStudentProfile(userId) {
  return prisma.studentProfile.findUnique({ where: { userId: userId } });
}

/**
 * Verify that a teacher has access to a specific student (same school or
 * assigned class). Returns true when access is allowed.
 */
async function teacherHasStudentAccess(teacherUser, studentUserId) {
  if (['ADMIN', 'SUPER_ADMIN'].includes(teacherUser.role)) return true;

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
 * Extract the plain text content from an AiMessage, preferring the requested
 * language. Falls back across contentEn -> contentRw -> content.
 */
function extractMessageContent(msg, lang) {
  if (lang === 'rw' && msg.contentRw) return msg.contentRw;
  if (msg.contentEn) return msg.contentEn;
  if (msg.contentRw) return msg.contentRw;
  return msg.content || '';
}

/**
 * Build the multilingual content object for an AiMessage.
 * The `content` field stores the primary text; `contentEn` and `contentRw`
 * store language-specific variants.
 */
function buildContentFields(text) {
  return {
    content: text,
    contentEn: text,
    contentRw: null,
  };
}

/**
 * Fetch the student's AI learning preferences if they exist.
 */
async function getLearningPreferences(userId) {
  return prisma.aiLearningPreference.findUnique({
    where: { userId: userId },
  });
}

/**
 * Fetch the student's academic context: profile, enrollment, education level,
 * and school. Returns null for non-student users.
 */
async function getStudentContext(userId) {
  var profile = await prisma.studentProfile.findUnique({
    where: { userId: userId },
    include: {
      currentSchool: { select: { id: true, name: true } },
      currentEducationLevel: { select: { id: true, name: true, code: true } },
    },
  });
  if (!profile) return null;

  var latestEnrollment = await prisma.studentEnrollment.findFirst({
    where: { studentProfileId: profile.id, status: 'active' },
    orderBy: { enrollmentDate: 'desc' },
    include: {
      educationLevel: { select: { id: true, name: true, code: true } },
      school: { select: { id: true, name: true } },
      curriculumProgramme: { select: { id: true, name: true, nameEn: true } },
    },
  });

  return { profile: profile, enrollment: latestEnrollment };
}

/**
 * Build the system prompt for the AI tutor.
 */
function buildSystemPrompt(conversation, preferences, subject, topic, studentContext) {
  var parts = [];

  parts.push('You are IREME AI, a personalized learning assistant for Rwandan students.');
  parts.push('You help students understand concepts, solve problems, and prepare for assessments.');

  // Student academic context
  if (studentContext) {
    var enrollment = studentContext.enrollment;
    var profile = studentContext.profile;
    var level = enrollment ? enrollment.educationLevel : (profile ? profile.currentEducationLevel : null);
    var school = enrollment ? enrollment.school : (profile ? profile.currentSchool : null);

    if (level) {
      parts.push('The student is at education level: ' + (level.name || level.code) + '.');
      parts.push('Tailor your explanations, vocabulary, and difficulty to this level.');
    }
    if (profile && profile.currentGrade) {
      parts.push('Current grade/class: ' + profile.currentGrade + '.');
    }
    if (school) {
      parts.push('School: ' + school.name + '.');
    }
    if (enrollment && enrollment.curriculumProgramme) {
      var programmeName = enrollment.curriculumProgramme.nameEn || enrollment.curriculumProgramme.name;
      if (programmeName) {
        parts.push('Curriculum programme: ' + programmeName + '.');
      }
    }
  }

  // Language guidance
  if (preferences) {
    if (preferences.learningStyle) {
      parts.push('The student\'s learning style is: ' + preferences.learningStyle + '.');
    }
    if (preferences.preferredPace) {
      parts.push('Preferred pace: ' + preferences.preferredPace + '.');
    }
    if (preferences.aiTonePreference) {
      parts.push('Use a ' + preferences.aiTonePreference + ' tone.');
    }
    if (preferences.explanationDepth) {
      parts.push('Explanation depth should be: ' + preferences.explanationDepth + '.');
    }
  }

  // Subject and topic context
  if (subject) {
    var subjectName = subject.nameEn || subject.name || '';
    parts.push('The student is asking about the subject: ' + subjectName + '.');
  }
  if (topic) {
    var topicName = topic.nameEn || topic.name || '';
    parts.push('The current topic is: ' + topicName + '.');
  }

  // Teaching guidelines
  parts.push('Teaching guidelines:');
  parts.push('- Be encouraging, patient, and supportive.');
  parts.push('- Teach step-by-step. Break complex problems into smaller parts.');
  parts.push('- Ask questions to check understanding before moving on.');
  parts.push('- Use examples relevant to Rwanda when possible.');
  parts.push('- Never invent or fabricate official curriculum content. If unsure, say so.');
  parts.push('- Cite sources when using external information.');
  parts.push('- Respond in the same language the student uses. If they write in Kinyarwanda, respond in Kinyarwanda. If in English, respond in English.');
  parts.push('- Keep responses concise but thorough. Avoid overly long explanations.');
  parts.push('- When the student makes a mistake, guide them to the correct answer rather than just giving it.');

  return parts.join('\n');
}

/**
 * Call the OpenAI-compatible API to generate a response.
 * Returns { text, tokensUsed, modelUsed } or null on failure.
 */
async function generateAiResponse(systemPrompt, messages) {
  var apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  var apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  var model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  var openaiMessages = [{ role: 'system', content: systemPrompt }];

  messages.forEach(function (msg) {
    openaiMessages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    });
  });

  var controller = new AbortController();
  var timeout = setTimeout(function () {
    controller.abort();
  }, AI_RESPONSE_TIMEOUT_MS);

  try {
    var response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: model,
        messages: openaiMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      var errorBody = await response.text();
      console.error('ai-tutor error: OpenAI API returned ' + response.status + ': ' + errorBody);
      return null;
    }

    var data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('ai-tutor error: Unexpected OpenAI response format');
      return null;
    }

    return {
      text: data.choices[0].message.content,
      tokensUsed: data.usage ? data.usage.total_tokens : null,
      modelUsed: model,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('ai-tutor error: OpenAI request timed out after ' + AI_RESPONSE_TIMEOUT_MS + 'ms');
    } else {
      console.error('ai-tutor error: OpenAI API call failed:', err.message || err);
    }
    return null;
  }
}

/**
 * Build a fallback assistant response when AI is unavailable.
 */
function buildFallbackResponse() {
  return {
    text: FALLBACK_MESSAGE_EN,
    tokensUsed: 0,
    modelUsed: 'fallback',
  };
}

/**
 * Fetch subject and topic records for a conversation (either may be null).
 */
async function fetchSubjectAndTopic(subjectId, topicId) {
  var results = await Promise.all([
    subjectId ? prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true, nameEn: true, code: true } }) : null,
    topicId ? prisma.curriculumTopic.findUnique({ where: { id: topicId }, select: { id: true, name: true, nameEn: true } }) : null,
  ]);
  return { subject: results[0], topic: results[1] };
}

// ===========================================================================
// STUDENT ENDPOINTS (requireAuth)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. GET /conversations — List user's conversations
// ---------------------------------------------------------------------------
router.get('/conversations', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var subjectId = String(req.query.subjectId || '');
    var status = String(req.query.status || '');
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    var offset = parseInt(req.query.offset, 10) || 0;

    var where = { userId: userId };
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;

    var [conversations, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where: where,
        include: {
          aiMessages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              role: true,
              content: true,
              contentEn: true,
              contentRw: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.aiConversation.count({ where: where }),
    ]);

    var output = conversations.map(function (c) {
      var lastMsg = c.aiMessages[0] || null;
      var lastMessagePreview = null;
      if (lastMsg) {
        var text = lastMsg.contentEn || lastMsg.contentRw || lastMsg.content || '';
        lastMessagePreview = text.length > 150 ? text.substring(0, 150) + '...' : text;
      }

      return {
        id: c.id,
        title: c.title,
        conversationType: c.conversationType,
        subjectId: c.subjectId,
        topicId: c.topicId,
        status: c.status,
        messageCount: c.messageCount,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: lastMessagePreview,
        lastMessageRole: lastMsg ? lastMsg.role : null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    res.json({
      conversations: output,
      total: total,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error('ai-tutor error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /conversations/:id — Get full conversation with messages
// ---------------------------------------------------------------------------
router.get('/conversations/:id', requireAuth, async function (req, res) {
  try {
    var conversationId = req.params.id;
    var userId = req.user.id;

    var conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        aiMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this conversation' });
    }

    // Fetch subject and topic info
    var subjectTopic = await fetchSubjectAndTopic(conversation.subjectId, conversation.topicId);

    var messages = conversation.aiMessages.map(function (msg) {
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        contentEn: msg.contentEn,
        contentRw: msg.contentRw,
        tokensUsed: msg.tokensUsed,
        modelUsed: msg.modelUsed,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      };
    });

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        conversationType: conversation.conversationType,
        subjectId: conversation.subjectId,
        topicId: conversation.topicId,
        status: conversation.status,
        messageCount: conversation.messageCount,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        subject: subjectTopic.subject,
        topic: subjectTopic.topic,
        messages: messages,
      },
    });
  } catch (error) {
    console.error('ai-tutor error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ---------------------------------------------------------------------------
// 3. POST /conversations — Start a new conversation
// ---------------------------------------------------------------------------
router.post('/conversations', requireAuth, async function (req, res) {
  try {
    var userId = req.user.id;
    var data = req.body || {};

    if (!data.message || !data.message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Resolve student profile
    var studentProfile = await getStudentProfile(userId);
    var studentProfileId = studentProfile ? studentProfile.id : null;

    // Create conversation and user message in a transaction
    var conversation = await prisma.$transaction(async function (tx) {
      var convo = await tx.aiConversation.create({
        data: {
          userId: userId,
          studentProfileId: studentProfileId,
          title: data.title || null,
          conversationType: data.conversationType || 'tutoring',
          subjectId: data.subjectId || null,
          topicId: data.topicId || null,
          status: 'active',
          messageCount: 1,
          lastMessageAt: new Date(),
        },
      });

      var contentFields = buildContentFields(data.message.trim());

      await tx.aiMessage.create({
        data: {
          aiConversationId: convo.id,
          role: 'user',
          content: contentFields.content,
          contentEn: contentFields.contentEn,
          contentRw: contentFields.contentRw,
        },
      });

      return convo;
    });

    // Fetch subject/topic for the system prompt
    var subjectTopic = await fetchSubjectAndTopic(conversation.subjectId, conversation.topicId);

    // Fetch learning preferences and student context
    var preferences = await getLearningPreferences(userId);
    var studentContext = await getStudentContext(userId);

    // Build system prompt and generate AI response
    var systemPrompt = buildSystemPrompt(conversation, preferences, subjectTopic.subject, subjectTopic.topic, studentContext);

    var contextMessages = [{
      role: 'user',
      text: data.message.trim(),
    }];

    var aiResult = await generateAiResponse(systemPrompt, contextMessages);
    if (!aiResult) {
      aiResult = buildFallbackResponse();
    }

    // Save the AI response
    var assistantContent = buildContentFields(aiResult.text);

    var assistantMessage = await prisma.aiMessage.create({
      data: {
        aiConversationId: conversation.id,
        role: 'assistant',
        content: assistantContent.content,
        contentEn: assistantContent.contentEn,
        contentRw: assistantContent.contentRw,
        tokensUsed: aiResult.tokensUsed,
        modelUsed: aiResult.modelUsed,
        metadata: {
          isFallback: aiResult.modelUsed === 'fallback',
        },
      },
    });

    // Update conversation message count and last message time
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: 2,
        lastMessageAt: new Date(),
      },
    });

    // Fetch the user message we created in the transaction
    var userMessage = await prisma.aiMessage.findFirst({
      where: {
        aiConversationId: conversation.id,
        role: 'user',
      },
      orderBy: { createdAt: 'asc' },
    });

    // Re-fetch conversation with subject/topic
    var fullConvo = await prisma.aiConversation.findUnique({
      where: { id: conversation.id },
    });

    res.status(201).json({
      conversation: {
        id: fullConvo.id,
        title: fullConvo.title,
        conversationType: fullConvo.conversationType,
        subjectId: fullConvo.subjectId,
        topicId: fullConvo.topicId,
        status: fullConvo.status,
        messageCount: fullConvo.messageCount,
        lastMessageAt: fullConvo.lastMessageAt,
        createdAt: fullConvo.createdAt,
        subject: subjectTopic.subject,
        topic: subjectTopic.topic,
        messages: [
          {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            contentEn: userMessage.contentEn,
            contentRw: userMessage.contentRw,
            createdAt: userMessage.createdAt,
          },
          {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            contentEn: assistantMessage.contentEn,
            contentRw: assistantMessage.contentRw,
            tokensUsed: assistantMessage.tokensUsed,
            modelUsed: assistantMessage.modelUsed,
            metadata: assistantMessage.metadata,
            createdAt: assistantMessage.createdAt,
          },
        ],
      },
    });
  } catch (error) {
    console.error('ai-tutor error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /conversations/:id/messages — Send a message in existing conversation
// ---------------------------------------------------------------------------
router.post('/conversations/:id/messages', requireAuth, async function (req, res) {
  try {
    var conversationId = req.params.id;
    var userId = req.user.id;
    var data = req.body || {};

    if (!data.content || !data.content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Fetch conversation and verify ownership
    var conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to message in this conversation' });
    }
    if (conversation.status === 'archived') {
      return res.status(400).json({ error: 'This conversation has been archived' });
    }

    // Create user message
    var userContent = buildContentFields(data.content.trim());

    var userMessage = await prisma.aiMessage.create({
      data: {
        aiConversationId: conversationId,
        role: 'user',
        content: userContent.content,
        contentEn: userContent.contentEn,
        contentRw: userContent.contentRw,
      },
    });

    // Fetch conversation context (last N messages before this one)
    var recentMessages = await prisma.aiMessage.findMany({
      where: {
        aiConversationId: conversationId,
        id: { not: userMessage.id },
      },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_LIMIT,
    });

    // Reverse to chronological order
    recentMessages.reverse();

    // Build context for AI
    var contextMessages = recentMessages.map(function (msg) {
      return {
        role: msg.role,
        text: extractMessageContent(msg, 'en'),
      };
    });

    // Add the current user message
    contextMessages.push({
      role: 'user',
      text: data.content.trim(),
    });

    // Fetch subject/topic and preferences for the system prompt
    var subjectTopic = await fetchSubjectAndTopic(conversation.subjectId, conversation.topicId);
    var preferences = await getLearningPreferences(userId);
    var studentContext = await getStudentContext(userId);
    var systemPrompt = buildSystemPrompt(conversation, preferences, subjectTopic.subject, subjectTopic.topic, studentContext);

    // Generate AI response
    var aiResult = await generateAiResponse(systemPrompt, contextMessages);
    if (!aiResult) {
      aiResult = buildFallbackResponse();
    }

    // Save assistant message
    var assistantContent = buildContentFields(aiResult.text);

    var assistantMessage = await prisma.aiMessage.create({
      data: {
        aiConversationId: conversationId,
        role: 'assistant',
        content: assistantContent.content,
        contentEn: assistantContent.contentEn,
        contentRw: assistantContent.contentRw,
        tokensUsed: aiResult.tokensUsed,
        modelUsed: aiResult.modelUsed,
        metadata: {
          isFallback: aiResult.modelUsed === 'fallback',
        },
      },
    });

    // Update conversation messageCount and lastMessageAt
    var newMessageCount = conversation.messageCount + 2;

    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: newMessageCount,
        lastMessageAt: new Date(),
      },
    });

    res.json({
      messages: [
        {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          contentEn: userMessage.contentEn,
          contentRw: userMessage.contentRw,
          createdAt: userMessage.createdAt,
        },
        {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          contentEn: assistantMessage.contentEn,
          contentRw: assistantMessage.contentRw,
          tokensUsed: assistantMessage.tokensUsed,
          modelUsed: assistantMessage.modelUsed,
          metadata: assistantMessage.metadata,
          createdAt: assistantMessage.createdAt,
        },
      ],
      conversationId: conversationId,
      messageCount: newMessageCount,
    });
  } catch (error) {
    console.error('ai-tutor error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---------------------------------------------------------------------------
// 5. DELETE /conversations/:id — Archive a conversation (soft delete)
// ---------------------------------------------------------------------------
router.delete('/conversations/:id', requireAuth, async function (req, res) {
  try {
    var conversationId = req.params.id;
    var userId = req.user.id;

    var conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this conversation' });
    }

    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { status: 'archived' },
    });

    res.json({ message: 'Conversation archived', conversationId: conversationId, status: 'archived' });
  } catch (error) {
    console.error('ai-tutor error:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

// ===========================================================================
// TEACHER ENDPOINTS (requireAuth + requireRole)
// ===========================================================================

// ---------------------------------------------------------------------------
// 6. GET /students/:studentId/conversations — View a student's conversations
// ---------------------------------------------------------------------------
router.get(
  '/students/:studentId/conversations',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var studentUserId = req.params.studentId;
      var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      var offset = parseInt(req.query.offset, 10) || 0;

      // Verify teacher has access to this student
      var hasAccess = await teacherHasStudentAccess(req.user, studentUserId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this student\'s conversations' });
      }

      var where = { userId: studentUserId, status: { not: 'archived' } };

      var [conversations, total] = await Promise.all([
        prisma.aiConversation.findMany({
          where: where,
          include: {
            aiMessages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                role: true,
                content: true,
                contentEn: true,
                contentRw: true,
                createdAt: true,
              },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.aiConversation.count({ where: where }),
      ]);

      var output = conversations.map(function (c) {
        var lastMsg = c.aiMessages[0] || null;
        var lastMessagePreview = null;
        if (lastMsg) {
          var text = lastMsg.contentEn || lastMsg.contentRw || lastMsg.content || '';
          lastMessagePreview = text.length > 150 ? text.substring(0, 150) + '...' : text;
        }

        return {
          id: c.id,
          title: c.title,
          conversationType: c.conversationType,
          subjectId: c.subjectId,
          topicId: c.topicId,
          status: c.status,
          messageCount: c.messageCount,
          lastMessageAt: c.lastMessageAt,
          lastMessagePreview: lastMessagePreview,
          lastMessageRole: lastMsg ? lastMsg.role : null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });

      res.json({
        conversations: output,
        total: total,
        limit: limit,
        offset: offset,
      });
    } catch (error) {
      console.error('ai-tutor error:', error);
      res.status(500).json({ error: 'Failed to fetch student conversations' });
    }
  }
);

module.exports = router;
