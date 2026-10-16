/**
 * Teacher workbench endpoints — lesson plan management, teaching resources,
 * class assessment tracking, and AI-assisted content generation for the
 * IREME Rwanda education platform.
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
var VALID_RESOURCE_TYPES = [
  'lesson_plan', 'worksheet', 'revision_note', 'quiz', 'marking_guide',
  'activity', 'experiment', 'project',
];
var LESSON_PLAN_TYPES = ['lesson_plan'];
var TEACHING_RESOURCE_TYPES = ['worksheet', 'revision_note', 'quiz', 'marking_guide', 'activity', 'experiment', 'project'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the SchoolStaffProfile for the currently authenticated user.
 * Returns null when no profile exists.
 */
async function getStaffProfile(userId) {
  return prisma.schoolStaffProfile.findUnique({
    where: { userId: userId },
    include: {
      teacherAssignments: {
        where: { isActive: true },
        include: {
          subject: { select: { id: true, name: true, nameEn: true, code: true } },
          class: { select: { id: true, name: true, level: true, section: true } },
          school: { select: { id: true, name: true } },
        },
      },
    },
  });
}

/**
 * Determine whether the user has an admin-level role.
 */
function isAdmin(user) {
  return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
}

/**
 * Find ResourceAuthor records that belong to a given teacher (by userId).
 * The link is: User -> SchoolStaffProfile -> match ResourceAuthor.authorName
 * by the user's name.
 */
async function getTeacherAuthorIds(userId) {
  var user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return [];

  var names = [];
  if (user.name) names.push(user.name);
  if (user.email) names.push(user.email);

  var authors = await prisma.resourceAuthor.findMany({
    where: { authorName: { in: names } },
    select: { id: true, learningResourceId: true },
  });

  return authors;
}

/**
 * Get the resource IDs authored by a teacher.
 */
async function getTeacherResourceIds(userId) {
  var authors = await getTeacherAuthorIds(userId);
  return authors.map(function (a) { return a.learningResourceId; });
}

/**
 * Verify that a teacher owns a specific learning resource via ResourceAuthor.
 * Returns the ResourceAuthor record if found, null otherwise.
 */
async function verifyResourceOwnership(resourceId, userId, userRole) {
  if (isAdmin({ role: userRole })) return { isAdmin: true };

  var user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return null;

  var names = [];
  if (user.name) names.push(user.name);
  if (user.email) names.push(user.email);

  var author = await prisma.resourceAuthor.findFirst({
    where: {
      learningResourceId: resourceId,
      authorName: { in: names },
    },
  });

  return author ? { isAdmin: false, author: author } : null;
}

/**
 * Verify that a teacher has access to a specific class via TeacherAssignment.
 * Returns true when access is allowed.
 */
async function verifyClassAccess(userId, classId, userRole) {
  if (isAdmin({ role: userRole })) return true;

  var staffProfile = await prisma.schoolStaffProfile.findUnique({
    where: { userId: userId },
  });
  if (!staffProfile) return false;

  var assignment = await prisma.teacherAssignment.findFirst({
    where: {
      schoolStaffProfileId: staffProfile.id,
      classId: classId,
      isActive: true,
    },
  });

  return !!assignment;
}

/**
 * Get the teacher's assignment for a specific class (includes subjectId).
 */
async function getTeacherClassAssignment(userId, classId) {
  var staffProfile = await prisma.schoolStaffProfile.findUnique({
    where: { userId: userId },
  });
  if (!staffProfile) return null;

  return prisma.teacherAssignment.findFirst({
    where: {
      schoolStaffProfileId: staffProfile.id,
      classId: classId,
      isActive: true,
    },
    include: {
      subject: { select: { id: true, name: true, nameEn: true, code: true } },
      class: true,
      school: { select: { id: true, name: true } },
    },
  });
}

/**
 * Call the OpenAI-compatible API to generate content.
 * Returns { text, tokensUsed, modelUsed } or null on failure.
 */
async function callOpenAI(systemPrompt, userMessage, options) {
  var apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  var apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  var model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  var maxTokens = (options && options.maxTokens) || 2048;
  var temperature = (options && options.temperature != null) ? options.temperature : 0.7;

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      var errorBody = await response.text();
      console.error('teacher error: OpenAI API returned ' + response.status + ': ' + errorBody);
      return null;
    }

    var data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('teacher error: Unexpected OpenAI response format');
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
      console.error('teacher error: OpenAI request timed out after ' + AI_RESPONSE_TIMEOUT_MS + 'ms');
    } else {
      console.error('teacher error: OpenAI API call failed:', err.message || err);
    }
    return null;
  }
}

/**
 * Fetch subject and education level records by ID.
 */
async function fetchSubjectAndLevel(subjectId, educationLevelId) {
  var results = await Promise.all([
    subjectId
      ? prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true, nameEn: true, code: true } })
      : null,
    educationLevelId
      ? prisma.educationLevel.findUnique({ where: { id: educationLevelId }, select: { id: true, name: true, nameEn: true, code: true } })
      : null,
  ]);
  return { subject: results[0], level: results[1] };
}

/**
 * Get or create a default ResourceCategory for teacher-created content.
 */
async function getTeacherResourceCategoryId() {
  var category = await prisma.resourceCategory.findFirst({
    where: { name: 'Teacher Resources' },
  });
  if (category) return category.id;

  var created = await prisma.resourceCategory.create({
    data: {
      name: 'Teacher Resources',
      nameEn: 'Teacher Resources',
      nameRw: 'Ibikoresho by\'abarimu',
      description: 'Resources created by teachers including lesson plans, worksheets, and quizzes',
      displayOrder: 999,
      isActive: true,
    },
  });
  return created.id;
}

// ===========================================================================
// LESSON PLAN MANAGEMENT
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. GET /lessons — List teacher's lesson plans
// ---------------------------------------------------------------------------
router.get(
  '/lessons',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var subjectId = String(req.query.subjectId || '');
      var educationLevelId = String(req.query.educationLevelId || '');
      var status = String(req.query.status || '');
      var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      var offset = parseInt(req.query.offset, 10) || 0;

      // Find resources authored by this teacher
      var teacherResourceIds = await getTeacherResourceIds(req.user.id);

      var where = {
        resourceType: 'lesson_plan',
      };

      // Admins can see all lesson plans; teachers only their own
      if (!isAdmin(req.user)) {
        if (teacherResourceIds.length === 0) {
          return res.json({ lessons: [], total: 0, limit: limit, offset: offset });
        }
        where.id = { in: teacherResourceIds };
      }

      // Filter by publish status
      if (status === 'published') {
        where.isPublished = true;
      } else if (status === 'draft') {
        where.isPublished = false;
      }

      // Filter by subject/level via ResourceCurriculumLink
      var curriculumFilter = {};
      if (subjectId) curriculumFilter.subjectId = subjectId;
      if (educationLevelId) curriculumFilter.educationLevelId = educationLevelId;
      if (Object.keys(curriculumFilter).length > 0) {
        where.resourceCurriculumLinks = {
          some: curriculumFilter,
        };
      }

      var [lessons, total] = await Promise.all([
        prisma.learningResource.findMany({
          where: where,
          include: {
            resourceFiles: { select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true } },
            resourceAuthors: { select: { id: true, authorName: true, authorType: true, institution: true } },
            resourceCurriculumLinks: {
              select: { id: true, subjectId: true, educationLevelId: true, topicId: true },
            },
            resourceCategory: { select: { id: true, name: true, nameEn: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.learningResource.count({ where: where }),
      ]);

      // Fetch related subject and level names in bulk
      var allSubjectIds = [];
      var allLevelIds = [];
      lessons.forEach(function (l) {
        l.resourceCurriculumLinks.forEach(function (cl) {
          if (cl.subjectId) allSubjectIds.push(cl.subjectId);
          if (cl.educationLevelId) allLevelIds.push(cl.educationLevelId);
        });
      });
      allSubjectIds = [...new Set(allSubjectIds)];
      allLevelIds = [...new Set(allLevelIds)];

      var [subjects, levels] = await Promise.all([
        allSubjectIds.length > 0
          ? prisma.subject.findMany({ where: { id: { in: allSubjectIds } }, select: { id: true, name: true, nameEn: true, code: true } })
          : [],
        allLevelIds.length > 0
          ? prisma.educationLevel.findMany({ where: { id: { in: allLevelIds } }, select: { id: true, name: true, nameEn: true, code: true } })
          : [],
      ]);

      var subjectMap = {};
      subjects.forEach(function (s) { subjectMap[s.id] = s; });
      var levelMap = {};
      levels.forEach(function (l) { levelMap[l.id] = l; });

      var output = lessons.map(function (l) {
        var linkedSubjects = [];
        var linkedLevels = [];
        l.resourceCurriculumLinks.forEach(function (cl) {
          if (cl.subjectId && subjectMap[cl.subjectId]) linkedSubjects.push(subjectMap[cl.subjectId]);
          if (cl.educationLevelId && levelMap[cl.educationLevelId]) linkedLevels.push(levelMap[cl.educationLevelId]);
        });

        return {
          id: l.id,
          title: l.title,
          titleEn: l.titleEn,
          titleRw: l.titleRw,
          description: l.description,
          resourceType: l.resourceType,
          language: l.language,
          verificationStatus: l.verificationStatus,
          isPublished: l.isPublished,
          publishedAt: l.publishedAt,
          accessLevel: l.accessLevel,
          downloadCount: l.downloadCount,
          viewCount: l.viewCount,
          files: l.resourceFiles,
          authors: l.resourceAuthors,
          subjects: linkedSubjects,
          educationLevels: linkedLevels,
          category: l.resourceCategory,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        };
      });

      res.json({ lessons: output, total: total, limit: limit, offset: offset });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch lesson plans' });
    }
  }
);

// ---------------------------------------------------------------------------
// 2. GET /lessons/:id — Get a lesson plan with full content
// ---------------------------------------------------------------------------
router.get(
  '/lessons/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var lessonId = req.params.id;

      var lesson = await prisma.learningResource.findUnique({
        where: { id: lessonId },
        include: {
          resourceFiles: true,
          resourceAuthors: true,
          resourceCurriculumLinks: true,
          resourceCategory: { select: { id: true, name: true, nameEn: true } },
        },
      });

      if (!lesson || lesson.resourceType !== 'lesson_plan') {
        return res.status(404).json({ error: 'Lesson plan not found' });
      }

      // Verify ownership (teacher can only see their own)
      var ownership = await verifyResourceOwnership(lessonId, req.user.id, req.user.role);
      if (!ownership) {
        return res.status(403).json({ error: 'You do not have permission to view this lesson plan' });
      }

      // Fetch subject and level info
      var subjectId = null;
      var educationLevelId = null;
      if (lesson.resourceCurriculumLinks.length > 0) {
        subjectId = lesson.resourceCurriculumLinks[0].subjectId;
        educationLevelId = lesson.resourceCurriculumLinks[0].educationLevelId;
      }
      var subjectLevel = await fetchSubjectAndLevel(subjectId, educationLevelId);

      res.json({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          titleEn: lesson.titleEn,
          titleRw: lesson.titleRw,
          description: lesson.description,
          resourceType: lesson.resourceType,
          language: lesson.language,
          source: lesson.source,
          publicationYear: lesson.publicationYear,
          verificationStatus: lesson.verificationStatus,
          isPublished: lesson.isPublished,
          publishedAt: lesson.publishedAt,
          accessLevel: lesson.accessLevel,
          downloadCount: lesson.downloadCount,
          viewCount: lesson.viewCount,
          files: lesson.resourceFiles,
          authors: lesson.resourceAuthors,
          curriculumLinks: lesson.resourceCurriculumLinks,
          category: lesson.resourceCategory,
          subject: subjectLevel.subject,
          educationLevel: subjectLevel.level,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        },
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch lesson plan' });
    }
  }
);

// ---------------------------------------------------------------------------
// 3. POST /lessons — Create a lesson plan
// ---------------------------------------------------------------------------
router.post(
  '/lessons',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var data = req.body || {};

      // Validate required fields
      if (!data.title && !data.titleEn) {
        return res.status(400).json({ error: 'title or titleEn is required' });
      }

      var resourceCategoryId = await getTeacherResourceCategoryId();

      // Build the description from content JSON if provided
      var description = data.description || null;
      if (data.content && typeof data.content === 'object') {
        description = JSON.stringify(data.content);
      }

      var lesson = await prisma.$transaction(async function (tx) {
        var resource = await tx.learningResource.create({
          data: {
            resourceCategoryId: resourceCategoryId,
            title: data.title || data.titleEn || 'Untitled Lesson Plan',
            titleEn: data.titleEn || data.title || null,
            titleRw: data.titleRw || null,
            description: description,
            resourceType: 'lesson_plan',
            language: data.language || 'en',
            verificationStatus: 'pending',
            isPublished: data.isPublished || false,
            publishedAt: data.isPublished ? new Date() : null,
            accessLevel: data.accessLevel || 'free',
            createdBy: req.user.id,
          },
        });

        // Create ResourceAuthor linking to the teacher
        var user = await tx.user.findUnique({
          where: { id: req.user.id },
          select: { name: true, email: true },
        });
        var authorName = (user && user.name) || (user && user.email) || 'Unknown Teacher';

        await tx.resourceAuthor.create({
          data: {
            learningResourceId: resource.id,
            authorName: authorName,
            authorType: 'individual',
            institution: data.institution || null,
            displayOrder: 0,
          },
        });

        // Create curriculum links for subject and education level
        if (data.subjectId || data.educationLevelId) {
          await tx.resourceCurriculumLink.create({
            data: {
              learningResourceId: resource.id,
              subjectId: data.subjectId || null,
              educationLevelId: data.educationLevelId || null,
              topicId: data.topicId || null,
            },
          });
        }

        // Create files if provided
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {
          var fileRecords = data.files.map(function (f, idx) {
            return {
              learningResourceId: resource.id,
              fileName: f.fileName || f.name || 'file',
              fileUrl: f.fileUrl || f.url || '',
              storageKey: f.storageKey || null,
              fileSize: f.fileSize || null,
              mimeType: f.mimeType || f.type || null,
              displayOrder: idx,
            };
          });
          await tx.resourceFile.createMany({ data: fileRecords });
        }

        return resource;
      });

      // Re-fetch with relations for the response
      var created = await prisma.learningResource.findUnique({
        where: { id: lesson.id },
        include: {
          resourceFiles: true,
          resourceAuthors: true,
          resourceCurriculumLinks: true,
        },
      });

      res.status(201).json({ lesson: created });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to create lesson plan' });
    }
  }
);

// ---------------------------------------------------------------------------
// 4. PATCH /lessons/:id — Update a lesson plan
// ---------------------------------------------------------------------------
router.patch(
  '/lessons/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var lessonId = req.params.id;
      var data = req.body || {};

      var existing = await prisma.learningResource.findUnique({
        where: { id: lessonId },
        include: { resourceCurriculumLinks: true },
      });

      if (!existing || existing.resourceType !== 'lesson_plan') {
        return res.status(404).json({ error: 'Lesson plan not found' });
      }

      // Verify ownership
      var ownership = await verifyResourceOwnership(lessonId, req.user.id, req.user.role);
      if (!ownership) {
        return res.status(403).json({ error: 'You do not have permission to update this lesson plan' });
      }

      // Build description from content if provided
      var description = existing.description;
      if (data.content && typeof data.content === 'object') {
        description = JSON.stringify(data.content);
      } else if (data.description !== undefined) {
        description = data.description;
      }

      var lesson = await prisma.$transaction(async function (tx) {
        var updateData = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
        if (data.titleRw !== undefined) updateData.titleRw = data.titleRw;
        if (description !== undefined) updateData.description = description;
        if (data.language !== undefined) updateData.language = data.language;
        if (data.accessLevel !== undefined) updateData.accessLevel = data.accessLevel;

        if (data.isPublished !== undefined) {
          updateData.isPublished = data.isPublished;
          updateData.publishedAt = data.isPublished ? new Date() : existing.publishedAt;
        }

        var resource = await tx.learningResource.update({
          where: { id: lessonId },
          data: updateData,
        });

        // Update curriculum links if subject/level changed
        if (data.subjectId !== undefined || data.educationLevelId !== undefined || data.topicId !== undefined) {
          await tx.resourceCurriculumLink.deleteMany({
            where: { learningResourceId: lessonId },
          });

          await tx.resourceCurriculumLink.create({
            data: {
              learningResourceId: lessonId,
              subjectId: data.subjectId || null,
              educationLevelId: data.educationLevelId || null,
              topicId: data.topicId || null,
            },
          });
        }

        return resource;
      });

      var updated = await prisma.learningResource.findUnique({
        where: { id: lessonId },
        include: {
          resourceFiles: true,
          resourceAuthors: true,
          resourceCurriculumLinks: true,
        },
      });

      res.json({ lesson: updated });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to update lesson plan' });
    }
  }
);

// ---------------------------------------------------------------------------
// 5. DELETE /lessons/:id — Delete/unpublish a lesson plan
// ---------------------------------------------------------------------------
router.delete(
  '/lessons/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var lessonId = req.params.id;

      var existing = await prisma.learningResource.findUnique({
        where: { id: lessonId },
        include: {
          _count: { select: { resourceAccessLogs: true, resourceBookmarks: true } },
        },
      });

      if (!existing || existing.resourceType !== 'lesson_plan') {
        return res.status(404).json({ error: 'Lesson plan not found' });
      }

      // Verify ownership
      var ownership = await verifyResourceOwnership(lessonId, req.user.id, req.user.role);
      if (!ownership) {
        return res.status(403).json({ error: 'You do not have permission to delete this lesson plan' });
      }

      // Soft-delete by setting isPublished = false
      await prisma.learningResource.update({
        where: { id: lessonId },
        data: { isPublished: false },
      });

      res.json({
        message: 'Lesson plan unpublished',
        lessonId: lessonId,
        softDeleted: true,
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to delete lesson plan' });
    }
  }
);

// ===========================================================================
// TEACHING RESOURCES
// ===========================================================================

// ---------------------------------------------------------------------------
// 6. GET /resources — List teacher's created resources
// ---------------------------------------------------------------------------
router.get(
  '/resources',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var resourceType = String(req.query.resourceType || '');
      var subjectId = String(req.query.subjectId || '');
      var educationLevelId = String(req.query.educationLevelId || '');
      var status = String(req.query.status || '');
      var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      var offset = parseInt(req.query.offset, 10) || 0;

      var teacherResourceIds = await getTeacherResourceIds(req.user.id);

      var where = {
        resourceType: { in: TEACHING_RESOURCE_TYPES },
      };

      // Filter by specific resource type
      if (resourceType && TEACHING_RESOURCE_TYPES.indexOf(resourceType) !== -1) {
        where.resourceType = resourceType;
      }

      // Teachers only see their own resources
      if (!isAdmin(req.user)) {
        if (teacherResourceIds.length === 0) {
          return res.json({ resources: [], total: 0, limit: limit, offset: offset });
        }
        where.id = { in: teacherResourceIds };
      }

      if (status === 'published') {
        where.isPublished = true;
      } else if (status === 'draft') {
        where.isPublished = false;
      }

      var curriculumFilter = {};
      if (subjectId) curriculumFilter.subjectId = subjectId;
      if (educationLevelId) curriculumFilter.educationLevelId = educationLevelId;
      if (Object.keys(curriculumFilter).length > 0) {
        where.resourceCurriculumLinks = {
          some: curriculumFilter,
        };
      }

      var [resources, total] = await Promise.all([
        prisma.learningResource.findMany({
          where: where,
          include: {
            resourceFiles: { select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true } },
            resourceAuthors: { select: { id: true, authorName: true, authorType: true } },
            resourceCurriculumLinks: {
              select: { id: true, subjectId: true, educationLevelId: true },
            },
            resourceCategory: { select: { id: true, name: true, nameEn: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.learningResource.count({ where: where }),
      ]);

      // Fetch subject and level names in bulk
      var allSubjectIds = [];
      var allLevelIds = [];
      resources.forEach(function (r) {
        r.resourceCurriculumLinks.forEach(function (cl) {
          if (cl.subjectId) allSubjectIds.push(cl.subjectId);
          if (cl.educationLevelId) allLevelIds.push(cl.educationLevelId);
        });
      });
      allSubjectIds = [...new Set(allSubjectIds)];
      allLevelIds = [...new Set(allLevelIds)];

      var [subjects, levels] = await Promise.all([
        allSubjectIds.length > 0
          ? prisma.subject.findMany({ where: { id: { in: allSubjectIds } }, select: { id: true, name: true, nameEn: true, code: true } })
          : [],
        allLevelIds.length > 0
          ? prisma.educationLevel.findMany({ where: { id: { in: allLevelIds } }, select: { id: true, name: true, nameEn: true, code: true } })
          : [],
      ]);

      var subjectMap = {};
      subjects.forEach(function (s) { subjectMap[s.id] = s; });
      var levelMap = {};
      levels.forEach(function (l) { levelMap[l.id] = l; });

      var output = resources.map(function (r) {
        var linkedSubjects = [];
        var linkedLevels = [];
        r.resourceCurriculumLinks.forEach(function (cl) {
          if (cl.subjectId && subjectMap[cl.subjectId]) linkedSubjects.push(subjectMap[cl.subjectId]);
          if (cl.educationLevelId && levelMap[cl.educationLevelId]) linkedLevels.push(levelMap[cl.educationLevelId]);
        });

        return {
          id: r.id,
          title: r.title,
          titleEn: r.titleEn,
          titleRw: r.titleRw,
          description: r.description,
          resourceType: r.resourceType,
          language: r.language,
          verificationStatus: r.verificationStatus,
          isPublished: r.isPublished,
          publishedAt: r.publishedAt,
          accessLevel: r.accessLevel,
          downloadCount: r.downloadCount,
          viewCount: r.viewCount,
          files: r.resourceFiles,
          authors: r.resourceAuthors,
          subjects: linkedSubjects,
          educationLevels: linkedLevels,
          category: r.resourceCategory,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });

      res.json({ resources: output, total: total, limit: limit, offset: offset });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }
);

// ---------------------------------------------------------------------------
// 7. POST /resources — Create a teaching resource
// ---------------------------------------------------------------------------
router.post(
  '/resources',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var data = req.body || {};

      if (!data.title && !data.titleEn) {
        return res.status(400).json({ error: 'title or titleEn is required' });
      }
      if (!data.resourceType || TEACHING_RESOURCE_TYPES.indexOf(data.resourceType) === -1) {
        return res.status(400).json({
          error: 'resourceType is required and must be one of: ' + TEACHING_RESOURCE_TYPES.join(', '),
        });
      }

      var resourceCategoryId = await getTeacherResourceCategoryId();

      var description = data.description || null;
      if (data.content && typeof data.content === 'object') {
        description = JSON.stringify(data.content);
      }

      var resource = await prisma.$transaction(async function (tx) {
        var r = await tx.learningResource.create({
          data: {
            resourceCategoryId: resourceCategoryId,
            title: data.title || data.titleEn || 'Untitled Resource',
            titleEn: data.titleEn || data.title || null,
            titleRw: data.titleRw || null,
            description: description,
            resourceType: data.resourceType,
            language: data.language || 'en',
            verificationStatus: 'pending',
            isPublished: data.isPublished || false,
            publishedAt: data.isPublished ? new Date() : null,
            accessLevel: data.accessLevel || 'free',
            createdBy: req.user.id,
          },
        });

        // Create ResourceAuthor
        var user = await tx.user.findUnique({
          where: { id: req.user.id },
          select: { name: true, email: true },
        });
        var authorName = (user && user.name) || (user && user.email) || 'Unknown Teacher';

        await tx.resourceAuthor.create({
          data: {
            learningResourceId: r.id,
            authorName: authorName,
            authorType: 'individual',
            institution: data.institution || null,
            displayOrder: 0,
          },
        });

        // Create curriculum links
        if (data.subjectId || data.educationLevelId) {
          await tx.resourceCurriculumLink.create({
            data: {
              learningResourceId: r.id,
              subjectId: data.subjectId || null,
              educationLevelId: data.educationLevelId || null,
              topicId: data.topicId || null,
            },
          });
        }

        // Create files if provided
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {
          var fileRecords = data.files.map(function (f, idx) {
            return {
              learningResourceId: r.id,
              fileName: f.fileName || f.name || 'file',
              fileUrl: f.fileUrl || f.url || '',
              storageKey: f.storageKey || null,
              fileSize: f.fileSize || null,
              mimeType: f.mimeType || f.type || null,
              displayOrder: idx,
            };
          });
          await tx.resourceFile.createMany({ data: fileRecords });
        }

        return r;
      });

      var created = await prisma.learningResource.findUnique({
        where: { id: resource.id },
        include: {
          resourceFiles: true,
          resourceAuthors: true,
          resourceCurriculumLinks: true,
        },
      });

      res.status(201).json({ resource: created });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to create resource' });
    }
  }
);

// ---------------------------------------------------------------------------
// 8. PATCH /resources/:id — Update a resource
// ---------------------------------------------------------------------------
router.patch(
  '/resources/:id',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var resourceId = req.params.id;
      var data = req.body || {};

      var existing = await prisma.learningResource.findUnique({
        where: { id: resourceId },
        include: { resourceCurriculumLinks: true },
      });

      if (!existing || TEACHING_RESOURCE_TYPES.indexOf(existing.resourceType) === -1) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      var ownership = await verifyResourceOwnership(resourceId, req.user.id, req.user.role);
      if (!ownership) {
        return res.status(403).json({ error: 'You do not have permission to update this resource' });
      }

      var description = existing.description;
      if (data.content && typeof data.content === 'object') {
        description = JSON.stringify(data.content);
      } else if (data.description !== undefined) {
        description = data.description;
      }

      var resource = await prisma.$transaction(async function (tx) {
        var updateData = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
        if (data.titleRw !== undefined) updateData.titleRw = data.titleRw;
        if (description !== undefined) updateData.description = description;
        if (data.language !== undefined) updateData.language = data.language;
        if (data.accessLevel !== undefined) updateData.accessLevel = data.accessLevel;
        if (data.resourceType !== undefined && TEACHING_RESOURCE_TYPES.indexOf(data.resourceType) !== -1) {
          updateData.resourceType = data.resourceType;
        }

        if (data.isPublished !== undefined) {
          updateData.isPublished = data.isPublished;
          updateData.publishedAt = data.isPublished ? new Date() : existing.publishedAt;
        }

        var r = await tx.learningResource.update({
          where: { id: resourceId },
          data: updateData,
        });

        // Update curriculum links
        if (data.subjectId !== undefined || data.educationLevelId !== undefined || data.topicId !== undefined) {
          await tx.resourceCurriculumLink.deleteMany({
            where: { learningResourceId: resourceId },
          });
          await tx.resourceCurriculumLink.create({
            data: {
              learningResourceId: resourceId,
              subjectId: data.subjectId || null,
              educationLevelId: data.educationLevelId || null,
              topicId: data.topicId || null,
            },
          });
        }

        // Replace files if provided
        if (data.files && Array.isArray(data.files)) {
          await tx.resourceFile.deleteMany({ where: { learningResourceId: resourceId } });
          if (data.files.length > 0) {
            var fileRecords = data.files.map(function (f, idx) {
              return {
                learningResourceId: resourceId,
                fileName: f.fileName || f.name || 'file',
                fileUrl: f.fileUrl || f.url || '',
                storageKey: f.storageKey || null,
                fileSize: f.fileSize || null,
                mimeType: f.mimeType || f.type || null,
                displayOrder: idx,
              };
            });
            await tx.resourceFile.createMany({ data: fileRecords });
          }
        }

        return r;
      });

      var updated = await prisma.learningResource.findUnique({
        where: { id: resourceId },
        include: {
          resourceFiles: true,
          resourceAuthors: true,
          resourceCurriculumLinks: true,
        },
      });

      res.json({ resource: updated });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to update resource' });
    }
  }
);

// ===========================================================================
// CLASS ASSESSMENT TRACKING
// ===========================================================================

// ---------------------------------------------------------------------------
// 9. GET /classes — List teacher's assigned classes
// ---------------------------------------------------------------------------
router.get(
  '/classes',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var staffProfile = await getStaffProfile(req.user.id);

      if (!staffProfile && !isAdmin(req.user)) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      var classes;
      var total;

      if (isAdmin(req.user)) {
        // Admins can see all active classes
        var limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        var offset = parseInt(req.query.offset, 10) || 0;
        var schoolId = String(req.query.schoolId || '');

        var where = { isActive: true };
        if (schoolId) where.schoolId = schoolId;

        var results = await Promise.all([
          prisma.class.findMany({
            where: where,
            include: {
              school: { select: { id: true, name: true } },
              classMemberships: {
                where: { role: 'student', status: 'active' },
                select: { id: true },
              },
            },
            orderBy: { name: 'asc' },
            take: limit,
            skip: offset,
          }),
          prisma.class.count({ where: where }),
        ]);

        classes = results[0].map(function (c) {
          return {
            id: c.id,
            name: c.name,
            level: c.level,
            section: c.section,
            schoolId: c.schoolId,
            school: c.school,
            academicYearId: c.academicYearId,
            capacity: c.capacity,
            studentCount: c.classMemberships.length,
            subject: null,
            assignment: null,
          };
        });
        total = results[1];

        res.json({ classes: classes, total: total, limit: limit, offset: offset });
      } else {
        // Teachers see only their assigned classes
        var assignments = staffProfile.teacherAssignments || [];

        // Group assignments by classId to merge subject info
        var classMap = {};
        assignments.forEach(function (a) {
          if (!a.classId) return;
          if (!classMap[a.classId]) {
            classMap[a.classId] = {
              id: a.classId,
              name: a.class ? a.class.name : null,
              level: a.class ? a.class.level : null,
              section: a.class ? a.class.section : null,
              schoolId: a.schoolId,
              school: a.school,
              subjects: [],
              assignments: [],
            };
          }
          if (a.subject) classMap[a.classId].subjects.push(a.subject);
          classMap[a.classId].assignments.push({
            id: a.id,
            subjectId: a.subjectId,
            subject: a.subject,
          });
        });

        var classIds = Object.keys(classMap);
        if (classIds.length === 0) {
          return res.json({ classes: [], total: 0 });
        }

        // Fetch class details and student counts
        var classRecords = await prisma.class.findMany({
          where: { id: { in: classIds }, isActive: true },
          include: {
            school: { select: { id: true, name: true } },
            classMemberships: {
              where: { role: 'student', status: 'active' },
              select: { id: true },
            },
          },
        });

        classes = classRecords.map(function (c) {
          var info = classMap[c.id] || {};
          return {
            id: c.id,
            name: c.name,
            level: c.level,
            section: c.section,
            schoolId: c.schoolId,
            school: c.school,
            academicYearId: c.academicYearId,
            capacity: c.capacity,
            studentCount: c.classMemberships.length,
            subjects: info.subjects || [],
            assignments: info.assignments || [],
          };
        });

        res.json({ classes: classes, total: classes.length });
      }
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  }
);

// ---------------------------------------------------------------------------
// 10. GET /classes/:classId/students — Get students with assessment performance
// ---------------------------------------------------------------------------
router.get(
  '/classes/:classId/students',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var classId = req.params.classId;
      var limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      var offset = parseInt(req.query.offset, 10) || 0;

      // Verify teacher has access to this class
      var hasAccess = await verifyClassAccess(req.user.id, classId, req.user.role);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this class' });
      }

      // Get students in the class
      var memberships = await prisma.classMembership.findMany({
        where: {
          classId: classId,
          role: 'student',
          status: 'active',
        },
        include: {
          class: { select: { id: true, name: true } },
        },
        take: limit,
        skip: offset,
      });

      var totalMembers = await prisma.classMembership.count({
        where: { classId: classId, role: 'student', status: 'active' },
      });

      // For each student, get their assessment performance
      var students = [];
      for (var i = 0; i < memberships.length; i++) {
        var m = memberships[i];

        // Get the student's user info
        var user = await prisma.user.findUnique({
          where: { id: m.userId },
          select: { id: true, name: true, email: true },
        });

        // Get the student's profile
        var studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: m.userId },
        });

        var avgScore = null;
        var assessmentsTaken = 0;
        var passCount = 0;

        if (studentProfile) {
          // Get all completed attempts with results
          var attempts = await prisma.assessmentAttempt.findMany({
            where: {
              studentProfileId: studentProfile.id,
              status: 'completed',
            },
            include: {
              assessmentResults: { take: 1 },
              assessment: {
                select: { id: true, title: true, subjectId: true, assessmentType: true },
              },
            },
            orderBy: { completedAt: 'desc' },
          });

          assessmentsTaken = attempts.length;
          var totalPercentage = 0;

          attempts.forEach(function (a) {
            var result = a.assessmentResults[0];
            if (result) {
              totalPercentage += Number(result.percentage);
              if (result.passed) passCount++;
            }
          });

          if (attempts.length > 0) {
            avgScore = Math.round(totalPercentage / attempts.length * 100) / 100;
          }
        }

        students.push({
          id: m.id,
          userId: m.userId,
          name: user ? user.name : null,
          email: user ? user.email : null,
          studentProfileId: studentProfile ? studentProfile.id : null,
          enrolledAt: m.enrolledAt,
          status: m.status,
          performance: {
            averageScore: avgScore,
            assessmentsTaken: assessmentsTaken,
            passCount: passCount,
            passRate: assessmentsTaken > 0 ? Math.round(passCount / assessmentsTaken * 10000) / 100 : null,
          },
        });
      }

      res.json({
        students: students,
        total: totalMembers,
        limit: limit,
        offset: offset,
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch class students' });
    }
  }
);

// ---------------------------------------------------------------------------
// 11. GET /classes/:classId/assessments — Get assessments for a class
// ---------------------------------------------------------------------------
router.get(
  '/classes/:classId/assessments',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var classId = req.params.classId;
      var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      var offset = parseInt(req.query.offset, 10) || 0;

      // Verify teacher has access to this class
      var hasAccess = await verifyClassAccess(req.user.id, classId, req.user.role);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this class' });
      }

      // Get the teacher's assignment for this class to determine subject
      var assignment = await getTeacherClassAssignment(req.user.id, classId);

      // Build assessment filter
      var where = { isPublished: true };
      if (assignment && assignment.subjectId && !isAdmin(req.user)) {
        where.subjectId = assignment.subjectId;
      }

      var subjectId = String(req.query.subjectId || '');
      if (subjectId) where.subjectId = subjectId;

      var [assessments, total] = await Promise.all([
        prisma.assessment.findMany({
          where: where,
          include: {
            _count: {
              select: {
                assessmentAttempts: true,
                assessmentQuestions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.assessment.count({ where: where }),
      ]);

      // For each assessment, compute attempt statistics
      var output = [];
      for (var i = 0; i < assessments.length; i++) {
        var a = assessments[i];

        // Get completed attempts with results for statistics
        var completedAttempts = await prisma.assessmentAttempt.findMany({
          where: {
            assessmentId: a.id,
            status: 'completed',
          },
          include: {
            assessmentResults: { take: 1 },
          },
        });

        var totalScore = 0;
        var passCount = 0;
        var resultCount = 0;

        completedAttempts.forEach(function (attempt) {
          var result = attempt.assessmentResults[0];
          if (result) {
            totalScore += Number(result.percentage);
            resultCount++;
            if (result.passed) passCount++;
          }
        });

        output.push({
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
          isPublished: a.isPublished,
          startDate: a.startDate,
          endDate: a.endDate,
          questionCount: a._count.assessmentQuestions,
          statistics: {
            totalAttempts: a._count.assessmentAttempts,
            completedAttempts: completedAttempts.length,
            averageScore: resultCount > 0 ? Math.round(totalScore / resultCount * 100) / 100 : null,
            passRate: resultCount > 0 ? Math.round(passCount / resultCount * 10000) / 100 : null,
          },
        });
      }

      res.json({ assessments: output, total: total, limit: limit, offset: offset });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch class assessments' });
    }
  }
);

// ---------------------------------------------------------------------------
// 12. GET /classes/:classId/performance — Class performance summary
// ---------------------------------------------------------------------------
router.get(
  '/classes/:classId/performance',
  requireAuth,
  requireRole('TEACHER', 'ADMIN', 'SUPER_ADMIN'),
  async function (req, res) {
    try {
      var classId = req.params.classId;

      // Verify teacher has access to this class
      var hasAccess = await verifyClassAccess(req.user.id, classId, req.user.role);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this class' });
      }

      // Get class info
      var classRecord = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          school: { select: { id: true, name: true } },
        },
      });

      if (!classRecord) {
        return res.status(404).json({ error: 'Class not found' });
      }

      // Get total students
      var totalStudents = await prisma.classMembership.count({
        where: { classId: classId, role: 'student', status: 'active' },
      });

      // Get all students in the class
      var studentMemberships = await prisma.classMembership.findMany({
        where: { classId: classId, role: 'student', status: 'active' },
        select: { userId: true },
      });

      var userIds = studentMemberships.map(function (m) { return m.userId; });

      // Get student profiles for these users
      var studentProfiles = await prisma.studentProfile.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      });

      var profileIds = studentProfiles.map(function (p) { return p.id; });

      // Get all completed assessment attempts for these students
      var allAttempts = [];
      var allResults = [];

      if (profileIds.length > 0) {
        allAttempts = await prisma.assessmentAttempt.findMany({
          where: {
            studentProfileId: { in: profileIds },
            status: 'completed',
          },
          include: {
            assessmentResults: { take: 1 },
            assessment: {
              select: { id: true, title: true, subjectId: true, assessmentType: true },
            },
          },
        });
      }

      // Compute aggregate statistics
      var totalAttempts = allAttempts.length;
      var totalPercentage = 0;
      var passCount = 0;
      var resultCount = 0;
      var subjectScores = {};

      allAttempts.forEach(function (attempt) {
        var result = attempt.assessmentResults[0];
        if (result) {
          var pct = Number(result.percentage);
          totalPercentage += pct;
          resultCount++;
          if (result.passed) passCount++;

          // Track per-subject scores
          var subjId = attempt.assessment.subjectId || 'unknown';
          if (!subjectScores[subjId]) {
            subjectScores[subjId] = { total: 0, count: 0 };
          }
          subjectScores[subjId].total += pct;
          subjectScores[subjId].count++;
        }
      });

      var averageAccuracy = resultCount > 0
        ? Math.round(totalPercentage / resultCount * 100) / 100
        : null;
      var classPassRate = resultCount > 0
        ? Math.round(passCount / resultCount * 10000) / 100
        : null;

      // Identify weak subjects (below 60% average)
      var weakTopics = [];
      var subjectIds = Object.keys(subjectScores);
      if (subjectIds.length > 0) {
        var subjectRecords = await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, nameEn: true, code: true },
        });
        var subjectNameMap = {};
        subjectRecords.forEach(function (s) { subjectNameMap[s.id] = s; });

        subjectIds.forEach(function (sId) {
          var data = subjectScores[sId];
          var avg = data.total / data.count;
          if (avg < 60) {
            var subjectInfo = subjectNameMap[sId] || { id: sId, name: sId };
            weakTopics.push({
              subjectId: sId,
              subjectName: subjectInfo.nameEn || subjectInfo.name || sId,
              averageScore: Math.round(avg * 100) / 100,
              attemptCount: data.count,
            });
          }
        });

        // Sort by score ascending (weakest first)
        weakTopics.sort(function (a, b) { return a.averageScore - b.averageScore; });
      }

      // Per-student summary
      var studentSummaries = [];
      for (var i = 0; i < studentProfiles.length; i++) {
        var profile = studentProfiles[i];
        var profileAttempts = allAttempts.filter(function (a) {
          return a.studentProfileId === profile.id;
        });

        var studentTotal = 0;
        var studentResultCount = 0;
        var studentPassCount = 0;

        profileAttempts.forEach(function (a) {
          var r = a.assessmentResults[0];
          if (r) {
            studentTotal += Number(r.percentage);
            studentResultCount++;
            if (r.passed) studentPassCount++;
          }
        });

        var user = await prisma.user.findUnique({
          where: { id: profile.userId },
          select: { id: true, name: true, email: true },
        });

        studentSummaries.push({
          userId: profile.userId,
          name: user ? user.name : null,
          email: user ? user.email : null,
          assessmentsTaken: profileAttempts.length,
          averageScore: studentResultCount > 0
            ? Math.round(studentTotal / studentResultCount * 100) / 100
            : null,
          passRate: studentResultCount > 0
            ? Math.round(studentPassCount / studentResultCount * 10000) / 100
            : null,
        });
      }

      res.json({
        class: {
          id: classRecord.id,
          name: classRecord.name,
          level: classRecord.level,
          section: classRecord.section,
          school: classRecord.school,
        },
        summary: {
          totalStudents: totalStudents,
          totalAssessmentAttempts: totalAttempts,
          averageAccuracy: averageAccuracy,
          passRate: classPassRate,
          weakTopics: weakTopics,
        },
        students: studentSummaries,
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to fetch class performance' });
    }
  }
);

// ===========================================================================
// AI-ASSISTED GENERATION
// ===========================================================================

// ---------------------------------------------------------------------------
// 13. POST /generate/lesson-plan — Generate a lesson plan outline using AI
// ---------------------------------------------------------------------------
router.post(
  '/generate/lesson-plan',
  requireAuth,
  requireRole('TEACHER'),
  async function (req, res) {
    try {
      var data = req.body || {};

      if (!data.topic) {
        return res.status(400).json({ error: 'topic is required' });
      }

      // Fetch subject and level info for context
      var subjectLevel = await fetchSubjectAndLevel(data.subjectId, data.educationLevelId);
      var subjectName = subjectLevel.subject
        ? (subjectLevel.subject.nameEn || subjectLevel.subject.name || '')
        : (data.subject || 'the subject');
      var levelName = subjectLevel.level
        ? (subjectLevel.level.nameEn || subjectLevel.level.name || '')
        : (data.level || 'the appropriate level');

      var duration = data.durationMinutes || 40;
      var objectives = data.objectives || [];

      var systemPrompt = [
        'You are an expert curriculum designer for the Rwanda basic education system.',
        'You create structured, pedagogically sound lesson plans aligned with the Competence-Based Curriculum (CBC).',
        'Your lesson plans should be practical, learner-centred, and include active learning strategies.',
        'Always respond in valid JSON format.',
        'Use English unless Kinyarwanda is specifically requested.',
      ].join('\n');

      var userMessage = 'Create a detailed lesson plan outline for the following:\n\n' +
        'Subject: ' + subjectName + '\n' +
        'Level: ' + levelName + '\n' +
        'Topic: ' + data.topic + '\n' +
        'Duration: ' + duration + ' minutes\n' +
        (objectives.length > 0 ? 'Learning Objectives:\n' + objectives.map(function (o, i) { return (i + 1) + '. ' + o; }).join('\n') + '\n' : '') +
        '\nPlease return a JSON object with this structure:\n' +
        '{\n' +
        '  "title": "Lesson plan title",\n' +
        '  "objectives": ["objective 1", "objective 2", ...],\n' +
        '  "materials": ["list of materials needed"],\n' +
        '  "prerequisites": ["what students should already know"],\n' +
        '  "introduction": { "duration": "5 min", "activities": ["..."] },\n' +
        '  "development": [\n' +
        '    { "stage": "Stage name", "duration": "10 min", "teacherActivities": ["..."], "learnerActivities": ["..."] }\n' +
        '  ],\n' +
        '  "conclusion": { "duration": "5 min", "activities": ["..."] },\n' +
        '  "assessment": { "type": "...", "description": "..." },\n' +
        '  "differentiation": "How to support different learners",\n' +
        '  "crossCuttingIssues": ["..."]\n' +
        '}';

      var aiResult = await callOpenAI(systemPrompt, userMessage, { maxTokens: 3000, temperature: 0.7 });

      if (!aiResult) {
        // Return a template structure when AI is unavailable
        var template = {
          title: 'Lesson Plan: ' + data.topic,
          subject: subjectName,
          level: levelName,
          duration: duration + ' minutes',
          objectives: objectives.length > 0
            ? objectives
            : [
                'By the end of the lesson, learners should be able to define and explain ' + data.topic,
                'Learners should be able to apply concepts of ' + data.topic + ' in practical situations',
                'Learners should be able to analyse and evaluate scenarios related to ' + data.topic,
              ],
          materials: ['Textbook', 'Chalkboard', 'Relevant teaching aids'],
          prerequisites: ['Previous knowledge of related concepts'],
          introduction: {
            duration: '5 minutes',
            activities: [
              'Greet learners and check attendance',
              'Review previous lesson briefly',
              'Introduce the topic and state lesson objectives',
            ],
          },
          development: [
            {
              stage: 'Presentation',
              duration: Math.round(duration * 0.25) + ' minutes',
              teacherActivities: ['Explain key concepts of ' + data.topic, 'Use examples and visual aids'],
              learnerActivities: ['Listen and take notes', 'Ask clarifying questions'],
            },
            {
              stage: 'Practice',
              duration: Math.round(duration * 0.25) + ' minutes',
              teacherActivities: ['Guide learners through exercises', 'Provide feedback'],
              learnerActivities: ['Work in pairs or groups on activities', 'Share responses with the class'],
            },
            {
              stage: 'Application',
              duration: Math.round(duration * 0.2) + ' minutes',
              teacherActivities: ['Present real-world scenarios', 'Facilitate discussion'],
              learnerActivities: ['Apply knowledge to solve problems', 'Discuss in groups'],
            },
          ],
          conclusion: {
            duration: '5 minutes',
            activities: [
              'Summarise key points of the lesson',
              'Ask learners to share what they learned',
              'Assign homework or preview next lesson',
            ],
          },
          assessment: {
            type: 'Formative',
            description: 'Observe learner participation, check group work, ask targeted questions to assess understanding of ' + data.topic,
          },
          differentiation: 'Provide additional support for struggling learners through peer tutoring. Challenge advanced learners with extension activities.',
          crossCuttingIssues: ['Gender equality', 'Inclusive education', 'Environment and sustainability'],
          generatedByAI: false,
        };

        return res.json({
          lessonPlan: template,
          aiAvailable: false,
          message: 'AI generation is currently unavailable. A template has been provided for you to customise.',
        });
      }

      // Parse the AI response
      var lessonPlan;
      try {
        var cleaned = aiResult.text.trim();
        // Strip markdown code fences if present
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        lessonPlan = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error('teacher error: Failed to parse AI lesson plan response:', parseErr.message);
        return res.json({
          lessonPlan: null,
          rawContent: aiResult.text,
          aiAvailable: true,
          message: 'AI generated content but it could not be parsed as structured JSON. Raw content is provided.',
        });
      }

      res.json({
        lessonPlan: lessonPlan,
        aiAvailable: true,
        modelUsed: aiResult.modelUsed,
        tokensUsed: aiResult.tokensUsed,
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to generate lesson plan' });
    }
  }
);

// ---------------------------------------------------------------------------
// 14. POST /generate/questions — Generate quiz questions using AI
// ---------------------------------------------------------------------------
router.post(
  '/generate/questions',
  requireAuth,
  requireRole('TEACHER'),
  async function (req, res) {
    try {
      var data = req.body || {};

      if (!data.topic) {
        return res.status(400).json({ error: 'topic is required' });
      }

      var count = Math.min(parseInt(data.count, 10) || 5, 20);
      var difficulty = data.difficulty || 'medium';
      var questionType = data.type || 'multiple_choice';

      // Fetch subject and level info
      var subjectLevel = await fetchSubjectAndLevel(data.subjectId, data.educationLevelId);
      var subjectName = subjectLevel.subject
        ? (subjectLevel.subject.nameEn || subjectLevel.subject.name || '')
        : (data.subject || 'the subject');
      var levelName = subjectLevel.level
        ? (subjectLevel.level.nameEn || subjectLevel.level.name || '')
        : (data.level || 'the appropriate level');

      var validTypes = ['multiple_choice', 'true_false', 'short_answer', 'mixed'];
      if (validTypes.indexOf(questionType) === -1) {
        questionType = 'multiple_choice';
      }

      var validDifficulties = ['easy', 'medium', 'hard'];
      if (validDifficulties.indexOf(difficulty) === -1) {
        difficulty = 'medium';
      }

      var systemPrompt = [
        'You are an expert assessment designer for the Rwanda basic education system.',
        'You create high-quality, curriculum-aligned assessment questions.',
        'Questions should be clear, unambiguous, and appropriate for the specified level.',
        'For multiple choice questions, provide exactly 4 options with exactly one correct answer.',
        'For true/false questions, provide the correct answer.',
        'Always respond in valid JSON format.',
        'Use English unless Kinyarwanda is specifically requested.',
      ].join('\n');

      var typeInstructions = '';
      if (questionType === 'multiple_choice') {
        typeInstructions = 'Create ' + count + ' multiple choice questions, each with 4 options.';
      } else if (questionType === 'true_false') {
        typeInstructions = 'Create ' + count + ' true/false questions.';
      } else if (questionType === 'short_answer') {
        typeInstructions = 'Create ' + count + ' short answer questions with model answers.';
      } else {
        typeInstructions = 'Create ' + count + ' questions of mixed types (multiple choice, true/false, and short answer).';
      }

      var userMessage = typeInstructions + '\n\n' +
        'Subject: ' + subjectName + '\n' +
        'Level: ' + levelName + '\n' +
        'Topic: ' + data.topic + '\n' +
        'Difficulty: ' + difficulty + '\n' +
        '\nReturn a JSON array of question objects with this structure:\n' +
        '[\n' +
        '  {\n' +
        '    "questionText": "The question...",\n' +
        '    "questionType": "multiple_choice|true_false|short_answer",\n' +
        '    "difficulty": "' + difficulty + '",\n' +
        '    "points": 1,\n' +
        '    "options": [\n' +
        '      { "optionText": "Option A", "isCorrect": false },\n' +
        '      { "optionText": "Option B", "isCorrect": true },\n' +
        '      { "optionText": "Option C", "isCorrect": false },\n' +
        '      { "optionText": "Option D", "isCorrect": false }\n' +
        '    ],\n' +
        '    "explanation": "Why this is the correct answer",\n' +
        '    "hint": "Optional hint for students"\n' +
        '  }\n' +
        ']\n' +
        'For true/false questions, use options: [{ "optionText": "True", "isCorrect": true/false }, { "optionText": "False", "isCorrect": true/false }]\n' +
        'For short_answer questions, omit options and include "modelAnswer" instead.';

      var aiResult = await callOpenAI(systemPrompt, userMessage, { maxTokens: 4000, temperature: 0.8 });

      if (!aiResult) {
        // Return template questions when AI is unavailable
        var templateQuestions = [];
        for (var i = 0; i < count; i++) {
          if (questionType === 'multiple_choice' || questionType === 'mixed') {
            templateQuestions.push({
              questionText: 'Question ' + (i + 1) + ' about ' + data.topic + ' (' + difficulty + ' difficulty)',
              questionType: 'multiple_choice',
              difficulty: difficulty,
              points: 1,
              options: [
                { optionText: 'Option A - review and edit', isCorrect: false },
                { optionText: 'Option B - review and edit', isCorrect: true },
                { optionText: 'Option C - review and edit', isCorrect: false },
                { optionText: 'Option D - review and edit', isCorrect: false },
              ],
              explanation: 'Add explanation for the correct answer',
              hint: 'Add a helpful hint',
            });
          } else if (questionType === 'true_false') {
            templateQuestions.push({
              questionText: 'Statement about ' + data.topic + ' for learners to evaluate (Question ' + (i + 1) + ')',
              questionType: 'true_false',
              difficulty: difficulty,
              points: 1,
              options: [
                { optionText: 'True', isCorrect: i % 2 === 0 },
                { optionText: 'False', isCorrect: i % 2 !== 0 },
              ],
              explanation: 'Add explanation',
              hint: 'Think about the key concepts covered in class',
            });
          } else {
            templateQuestions.push({
              questionText: 'Short answer question ' + (i + 1) + ' about ' + data.topic,
              questionType: 'short_answer',
              difficulty: difficulty,
              points: 2,
              modelAnswer: 'Provide the expected answer here',
              explanation: 'Add explanation',
              hint: 'Consider the main concepts from the lesson',
            });
          }
        }

        return res.json({
          questions: templateQuestions,
          aiAvailable: false,
          message: 'AI generation is currently unavailable. Template questions have been provided for you to customise.',
        });
      }

      // Parse the AI response
      var questions;
      try {
        var cleaned = aiResult.text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        questions = JSON.parse(cleaned);
        if (!Array.isArray(questions)) {
          questions = questions.questions || [questions];
        }
      } catch (parseErr) {
        console.error('teacher error: Failed to parse AI questions response:', parseErr.message);
        return res.json({
          questions: null,
          rawContent: aiResult.text,
          aiAvailable: true,
          message: 'AI generated content but it could not be parsed as structured JSON. Raw content is provided.',
        });
      }

      res.json({
        questions: questions,
        aiAvailable: true,
        modelUsed: aiResult.modelUsed,
        tokensUsed: aiResult.tokensUsed,
      });
    } catch (error) {
      console.error('teacher error:', error);
      res.status(500).json({ error: 'Failed to generate questions' });
    }
  }
);

module.exports = router;
