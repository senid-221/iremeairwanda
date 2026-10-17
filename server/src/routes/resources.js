/**
 * Educational Resources API endpoints
 * Manage textbooks, student guides, teacher guides, exams, and other learning materials
 */
var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth, requireRole } = require('../middleware/auth');

var prisma = new PrismaClient();

// ===========================================================================
// GET / — List all active educational resources
// ===========================================================================
router.get('/', async function (req, res) {
  try {
    var category = req.query.category;
    var subject = req.query.subject;
    var level = req.query.level;
    var search = req.query.search;
    var limit = parseInt(req.query.limit) || 50;
    var offset = parseInt(req.query.offset) || 0;

    var where = { isActive: true };

    if (category && category !== 'all') {
      where.resourceType = category;
    }
    if (subject) {
      where.subjectCode = subject;
    }
    if (level) {
      where.levelCode = level;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleRw: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    var resources = await prisma.educationalResource.findMany({
      where: where,
      orderBy: [
        { isVerified: 'desc' },
        { downloadCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    var total = await prisma.educationalResource.count({ where: where });

    res.json({
      resources: resources,
      count: resources.length,
      total: total,
      limit: limit,
      offset: offset
    });
  } catch (err) {
    console.error('GET /resources error:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// ===========================================================================
// GET /:id — Get a single resource by ID
// ===========================================================================
router.get('/:id', async function (req, res) {
  try {
    var resource = await prisma.educationalResource.findUnique({
      where: { id: req.params.id }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Increment view count
    await prisma.educationalResource.update({
      where: { id: req.params.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ resource: resource });
  } catch (err) {
    console.error('GET /resources/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// ===========================================================================
// POST / — Create a new educational resource (admin only)
// ===========================================================================
router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var data = req.body;

    // Validate required fields
    if (!data.title || !data.subject || !data.level || !data.resourceType || !data.author) {
      return res.status(400).json({ error: 'Missing required fields: title, subject, level, resourceType, author' });
    }

    var resource = await prisma.educationalResource.create({
      data: {
        title: data.title,
        titleRw: data.titleRw || null,
        subject: data.subject,
        subjectCode: data.subjectCode || null,
        level: data.level,
        levelCode: data.levelCode || null,
        resourceType: data.resourceType,
        author: data.author,
        publisher: data.publisher || null,
        year: data.year || null,
        license: data.license || null,
        licenseUrl: data.licenseUrl || null,
        language: data.language || ['en'],
        format: data.format || null,
        url: data.url || null,
        coverImageUrl: data.coverImageUrl || null,
        description: data.description || null,
        descriptionRw: data.descriptionRw || null,
        fileSize: data.fileSize || null,
        pages: data.pages || null,
        isbn: data.isbn || null,
        tags: data.tags || [],
        isVerified: data.isVerified || false,
        verifiedBy: data.verifiedBy || null,
        verifiedAt: data.isVerified ? new Date() : null,
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      message: 'Resource created successfully',
      resource: resource
    });
  } catch (err) {
    console.error('POST /resources error:', err);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// ===========================================================================
// PUT /:id — Update an educational resource (admin only)
// ===========================================================================
router.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var data = req.body;

    var resource = await prisma.educationalResource.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        titleRw: data.titleRw,
        subject: data.subject,
        subjectCode: data.subjectCode,
        level: data.level,
        levelCode: data.levelCode,
        resourceType: data.resourceType,
        author: data.author,
        publisher: data.publisher,
        year: data.year,
        license: data.license,
        licenseUrl: data.licenseUrl,
        language: data.language,
        format: data.format,
        url: data.url,
        coverImageUrl: data.coverImageUrl,
        description: data.description,
        descriptionRw: data.descriptionRw,
        fileSize: data.fileSize,
        pages: data.pages,
        isbn: data.isbn,
        tags: data.tags,
        isVerified: data.isVerified,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.isVerified ? new Date() : null,
        isActive: data.isActive
      }
    });

    res.json({
      message: 'Resource updated successfully',
      resource: resource
    });
  } catch (err) {
    console.error('PUT /resources/:id error:', err);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// ===========================================================================
// DELETE /:id — Delete an educational resource (admin only)
// ===========================================================================
router.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    await prisma.educationalResource.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    console.error('DELETE /resources/:id error:', err);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// ===========================================================================
// POST /:id/download — Increment download count
// ===========================================================================
router.post('/:id/download', async function (req, res) {
  try {
    await prisma.educationalResource.update({
      where: { id: req.params.id },
      data: { downloadCount: { increment: 1 } }
    });

    res.json({ message: 'Download count updated' });
  } catch (err) {
    console.error('POST /resources/:id/download error:', err);
    res.status(500).json({ error: 'Failed to update download count' });
  }
});

// ===========================================================================
// GET /stats/overview — Get resource statistics
// ===========================================================================
router.get('/stats/overview', async function (req, res) {
  try {
    var total = await prisma.educationalResource.count({ where: { isActive: true } });
    var verified = await prisma.educationalResource.count({ where: { isActive: true, isVerified: true } });

    var byType = await prisma.educationalResource.groupBy({
      by: ['resourceType'],
      where: { isActive: true },
      _count: { id: true }
    });

    var bySubject = await prisma.educationalResource.groupBy({
      by: ['subjectCode'],
      where: { isActive: true },
      _count: { id: true }
    });

    var byLevel = await prisma.educationalResource.groupBy({
      by: ['levelCode'],
      where: { isActive: true },
      _count: { id: true }
    });

    res.json({
      total: total,
      verified: verified,
      byType: byType,
      bySubject: bySubject,
      byLevel: byLevel
    });
  } catch (err) {
    console.error('GET /resources/stats/overview error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
