const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole, requireActive } = require('../middleware/auth');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseIntParam(val, fallback) {
  const n = Number.parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ---------------------------------------------------------------------------
// 1. POST /api/schools/register — Headteacher registers a school
// ---------------------------------------------------------------------------
router.post('/register', requireAuth, requireRole('HEADTEACHER'), requireActive, async (req, res) => {
  try {
    const {
      name, nameEn, nameRw, schoolType, category, ownership, code,
      province, district, sector, cell, village, address,
      contacts, educationLevelIds,
    } = req.body || {};

    // --- validation ---
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'School name is required' });
    }
    if (!nameEn || !String(nameEn).trim()) {
      return res.status(400).json({ error: 'School name (English) is required' });
    }
    if (!schoolType || !String(schoolType).trim()) {
      return res.status(400).json({ error: 'School type is required' });
    }
    if (!district || !String(district).trim()) {
      return res.status(400).json({ error: 'District is required' });
    }
    if (!Array.isArray(educationLevelIds) || educationLevelIds.length === 0) {
      return res.status(400).json({ error: 'At least one education level is required' });
    }

    // --- duplicate check ---
    if (code) {
      const byCode = await prisma.school.findUnique({ where: { code: String(code).trim() } });
      if (byCode) {
        return res.status(409).json({ error: 'A school with this code already exists' });
      }
    }

    const byNameAndDistrict = await prisma.school.findFirst({
      where: {
        name: { equals: String(name).trim(), mode: 'insensitive' },
        schoolLocation: { district: { equals: String(district).trim(), mode: 'insensitive' } },
      },
    });
    if (byNameAndDistrict) {
      return res.status(409).json({ error: 'A school with this name already exists in this district' });
    }

    // --- verify education levels exist ---
    const levels = await prisma.educationLevel.findMany({
      where: { id: { in: educationLevelIds } },
      select: { id: true },
    });
    if (levels.length !== educationLevelIds.length) {
      return res.status(400).json({ error: 'One or more education level IDs are invalid' });
    }

    // --- create everything in a transaction ---
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: String(name).trim(),
          nameEn: String(nameEn).trim(),
          nameRw: nameRw ? String(nameRw).trim() : null,
          schoolType: String(schoolType).trim(),
          category: category ? String(category).trim() : null,
          ownership: ownership ? String(ownership).trim() : null,
          code: code ? String(code).trim() : null,
          registrationStatus: 'pending',
          registeredBy: req.user.id,
          registeredAt: new Date(),
        },
      });

      // Location
      await tx.schoolLocation.create({
        data: {
          schoolId: school.id,
          province: province ? String(province).trim() : null,
          district: String(district).trim(),
          sector: sector ? String(sector).trim() : null,
          cell: cell ? String(cell).trim() : null,
          village: village ? String(village).trim() : null,
          address: address ? String(address).trim() : null,
        },
      });

      // Contacts
      if (Array.isArray(contacts) && contacts.length > 0) {
        await tx.schoolContact.createMany({
          data: contacts.map((c) => ({
            schoolId: school.id,
            contactType: String(c.type || c.contactType || 'phone').trim(),
            contactValue: String(c.value || c.contactValue || '').trim(),
            isPrimary: Boolean(c.isPrimary),
          })),
        });
      }

      // Education levels
      await tx.schoolLevel.createMany({
        data: educationLevelIds.map((levelId) => ({
          schoolId: school.id,
          educationLevelId: levelId,
          isActive: true,
        })),
      });

      // Membership for the registering headteacher
      await tx.schoolMembership.create({
        data: {
          schoolId: school.id,
          userId: req.user.id,
          role: 'headteacher',
          isPrimary: true,
          status: 'pending',
        },
      });

      // Leadership appointment
      await tx.schoolLeadershipAppointment.create({
        data: {
          schoolId: school.id,
          userId: req.user.id,
          position: 'headteacher',
          status: 'pending',
          startDate: new Date(),
        },
      });

      // Staff profile
      await tx.schoolStaffProfile.upsert({
        where: { userId: req.user.id },
        update: { schoolId: school.id, position: 'headteacher', isActive: true },
        create: {
          userId: req.user.id,
          schoolId: school.id,
          position: 'headteacher',
          employmentType: 'full_time',
          hireDate: new Date(),
          isActive: true,
        },
      });

      return school;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('POST /schools/register error:', err);
    res.status(500).json({ error: 'Failed to register school' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/schools — List schools (public, with pagination and search)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = Math.min(parseIntParam(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const { search, district, province, type } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (district) {
      where.schoolLocation = { district: { equals: district, mode: 'insensitive' } };
    }
    if (province) {
      where.schoolLocation = { province: { equals: province, mode: 'insensitive' } };
    }
    if (type) {
      where.schoolType = { equals: type, mode: 'insensitive' };
    }

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          schoolLocation: true,
          schoolContacts: { where: { isPrimary: true } },
          schoolLevels: { include: { educationLevel: true } },
        },
      }),
      prisma.school.count({ where }),
    ]);

    res.json({
      data: schools,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /schools error:', err);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// ---------------------------------------------------------------------------
// 2b. GET /api/schools/search — Searchable schools for dropdowns
// ---------------------------------------------------------------------------
router.get('/search', async (req, res) => {
  try {
    const { q, limit: limitParam, educationLevelId, provinceId, districtId } = req.query;
    const limit = Math.min(parseIntParam(limitParam, 50), 100);

    const where = {
      status: 'active',
      isVerified: true
    };

    if (q && String(q).trim()) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (educationLevelId) {
      where.schoolLevels = {
        some: { educationLevelId: educationLevelId }
      };
    }

    if (provinceId || districtId) {
      where.schoolLocation = {};
      if (provinceId) where.schoolLocation.provinceId = provinceId;
      if (districtId) where.schoolLocation.districtId = districtId;
    }

    const schools = await prisma.school.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        nameEn: true,
        nameRw: true,
        schoolType: true,
        ownership: true,
        schoolLocation: {
          select: {
            province: true,
            district: true,
            sector: true
          }
        },
        schoolLevels: {
          select: {
            educationLevel: {
              select: { id: true, nameEn: true }
            }
          }
        }
      }
    });

    res.json({
      schools: schools.map(function(s) {
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          nameEn: s.nameEn,
          nameRw: s.nameRw,
          schoolType: s.schoolType,
          ownership: s.ownership,
          location: s.schoolLocation ? (s.schoolLocation.district || '') + (s.schoolLocation.sector ? ', ' + s.schoolLocation.sector : '') : '',
          educationLevels: s.schoolLevels ? s.schoolLevels.map(function(sl) { return sl.educationLevel; }) : []
        };
      })
    });
  } catch (err) {
    console.error('GET /schools/search error:', err);
    res.status(500).json({ error: 'Failed to search schools' });
  }
});

// ---------------------------------------------------------------------------
// 3. GET /api/schools/pending — List pending registrations (ADMIN only)
// ---------------------------------------------------------------------------
router.get('/pending', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      where: { registrationStatus: 'pending' },
      orderBy: { registeredAt: 'desc' },
      include: {
        schoolLocation: true,
        schoolContacts: true,
        schoolLevels: { include: { educationLevel: true } },
        schoolMemberships: {
          where: { role: 'headteacher' },
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    res.json({ data: schools });
  } catch (err) {
    console.error('GET /schools/pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending schools' });
  }
});

// ---------------------------------------------------------------------------
// 11. GET /api/schools/my-school — Current user's assigned school
// ---------------------------------------------------------------------------
router.get('/my-school', requireAuth, async (req, res) => {
  try {
    // HEADTEACHER: find active leadership appointment
    if (req.user.role === 'HEADTEACHER') {
      const appointment = await prisma.schoolLeadershipAppointment.findFirst({
        where: { userId: req.user.id, status: 'active' },
        include: {
          school: {
            include: {
              schoolLocation: true,
              schoolContacts: true,
              schoolLevels: { include: { educationLevel: true } },
            },
          },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'No school assignment found' });
      }
      return res.json(appointment.school);
    }

    // Other roles: find active membership
    const membership = await prisma.schoolMembership.findFirst({
      where: { userId: req.user.id, status: 'active' },
      include: {
        school: {
          include: {
            schoolLocation: true,
            schoolContacts: true,
            schoolLevels: { include: { educationLevel: true } },
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'No school assignment found' });
    }
    res.json(membership.school);
  } catch (err) {
    console.error('GET /schools/my-school error:', err);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /api/schools/:id — Get school details (public)
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        schoolLocation: true,
        schoolContacts: true,
        schoolLevels: { include: { educationLevel: true } },
      },
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get membership counts
    const [studentCount, teacherCount, membershipCount] = await Promise.all([
      prisma.schoolMembership.count({ where: { schoolId: school.id, role: 'student', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId: school.id, role: 'teacher', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId: school.id, status: 'active' } }),
    ]);

    res.json({
      ...school,
      stats: {
        students: studentCount,
        teachers: teacherCount,
        totalMembers: membershipCount,
      },
    });
  } catch (err) {
    console.error('GET /schools/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch school details' });
  }
});

// ---------------------------------------------------------------------------
// 5. PATCH /api/schools/:id — Update school profile
// ---------------------------------------------------------------------------
router.patch('/:id', requireAuth, requireActive, async (req, res) => {
  try {
    const schoolId = req.params.id;

    // Check authorization: must be headteacher of this school or admin
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isAdmin) {
      const membership = await prisma.schoolMembership.findFirst({
        where: {
          schoolId,
          userId: req.user.id,
          role: 'headteacher',
          status: 'active',
        },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Only the headteacher or an admin can update this school' });
      }
    }

    const allowedFields = [
      'name', 'nameEn', 'nameRw', 'schoolType', 'category', 'ownership', 'code', 'logoUrl',
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Update location if provided
    const locationFields = ['province', 'district', 'sector', 'cell', 'village', 'address', 'latitude', 'longitude'];
    const locationUpdate = {};
    for (const field of locationFields) {
      if (req.body[field] !== undefined) {
        locationUpdate[field] = req.body[field];
      }
    }

    const school = await prisma.$transaction(async (tx) => {
      const updated = await tx.school.update({
        where: { id: schoolId },
        data: updateData,
      });

      if (Object.keys(locationUpdate).length > 0) {
        await tx.schoolLocation.upsert({
          where: { schoolId },
          update: locationUpdate,
          create: { schoolId, ...locationUpdate },
        });
      }

      return updated;
    });

    res.json(school);
  } catch (err) {
    console.error('PATCH /schools/:id error:', err);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /api/schools/:id/verify — Verify or reject a school (ADMIN only)
// ---------------------------------------------------------------------------
router.post('/:id/verify', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { action, notes } = req.body || {};

    if (!action || !['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "verify" or "reject"' });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (action === 'verify') {
        await tx.school.update({
          where: { id: schoolId },
          data: {
            isVerified: true,
            verifiedAt: now,
            verifiedBy: req.user.id,
            registrationStatus: 'approved',
            reviewNotes: notes || null,
            reviewedBy: req.user.id,
            reviewedAt: now,
          },
        });

        // Activate memberships
        await tx.schoolMembership.updateMany({
          where: { schoolId, status: 'pending' },
          data: { status: 'active', approvedBy: req.user.id, approvalDate: now },
        });

        // Activate appointments
        await tx.schoolLeadershipAppointment.updateMany({
          where: { schoolId, status: 'pending' },
          data: { status: 'active', approvedBy: req.user.id, approvalDate: now },
        });
      } else {
        await tx.school.update({
          where: { id: schoolId },
          data: {
            registrationStatus: 'rejected',
            reviewNotes: notes || null,
            reviewedBy: req.user.id,
            reviewedAt: now,
          },
        });

        // Reject pending memberships
        await tx.schoolMembership.updateMany({
          where: { schoolId, status: 'pending' },
          data: { status: 'rejected' },
        });
      }

      // Create verification record
      await tx.schoolVerificationRecord.create({
        data: {
          schoolId,
          verifiedBy: req.user.id,
          verificationType: action === 'verify' ? 'approval' : 'rejection',
          status: action === 'verify' ? 'approved' : 'rejected',
          notes: notes || null,
        },
      });
    });

    const updated = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { schoolLocation: true, schoolContacts: true },
    });

    res.json(updated);
  } catch (err) {
    console.error('POST /schools/:id/verify error:', err);
    res.status(500).json({ error: 'Failed to process verification' });
  }
});

// ---------------------------------------------------------------------------
// 7. GET /api/schools/:id/members — Get school members
// ---------------------------------------------------------------------------
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isAdmin) {
      const membership = await prisma.schoolMembership.findFirst({
        where: { schoolId, userId: req.user.id, role: 'headteacher', status: 'active' },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const members = await prisma.schoolMembership.findMany({
      where: { schoolId, status: 'active' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json({ data: members });
  } catch (err) {
    console.error('GET /schools/:id/members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /api/schools/:id/appointments — Create leadership appointment
// ---------------------------------------------------------------------------
router.post('/:id/appointments', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { userId, position, startDate, reason } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!position) return res.status(400).json({ error: 'position is required' });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const effectiveDate = startDate ? new Date(startDate) : now;

    const appointment = await prisma.$transaction(async (tx) => {
      // End any existing active appointment for this position at this school
      const existing = await tx.schoolLeadershipAppointment.findFirst({
        where: { schoolId, position, status: 'active' },
        orderBy: { startDate: 'desc' },
      });

      if (existing) {
        await tx.schoolLeadershipAppointment.update({
          where: { id: existing.id },
          data: { endDate: now, status: 'ended', endReason: reason || 'Replaced by new appointment' },
        });
      }

      // End existing membership for this user at this school (if any)
      const existingMembership = await tx.schoolMembership.findUnique({
        where: { schoolId_userId: { schoolId, userId } },
      });

      if (existingMembership) {
        await tx.schoolMembership.update({
          where: { id: existingMembership.id },
          data: { leftAt: now, status: 'ended', endReason: 'Reassigned' },
        });
      }

      // Create new appointment
      const newAppointment = await tx.schoolLeadershipAppointment.create({
        data: {
          schoolId,
          userId,
          position,
          startDate: effectiveDate,
          status: 'active',
          approvedBy: req.user.id,
          approvalDate: now,
          reason: reason || null,
          previousAppointmentId: existing ? existing.id : null,
        },
      });

      // Create/update membership
      await tx.schoolMembership.upsert({
        where: { schoolId_userId: { schoolId, userId } },
        update: {
          role: position === 'headteacher' ? 'headteacher' : 'staff',
          status: 'active',
          isPrimary: position === 'headteacher',
          leftAt: null,
          endReason: null,
        },
        create: {
          schoolId,
          userId,
          role: position === 'headteacher' ? 'headteacher' : 'staff',
          status: 'active',
          isPrimary: position === 'headteacher',
        },
      });

      return newAppointment;
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error('POST /schools/:id/appointments error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// ---------------------------------------------------------------------------
// 9. POST /api/schools/:id/transfer — Transfer headteacher
// ---------------------------------------------------------------------------
router.post('/:id/transfer', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { outgoingUserId, incomingUserId, reason, effectiveDate } = req.body || {};

    if (!incomingUserId) return res.status(400).json({ error: 'incomingUserId is required' });
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const incomingUser = await prisma.user.findUnique({ where: { id: incomingUserId } });
    if (!incomingUser) return res.status(404).json({ error: 'Incoming user not found' });

    const now = new Date();
    const effective = effectiveDate ? new Date(effectiveDate) : now;

    const result = await prisma.$transaction(async (tx) => {
      let outgoingAppointment = null;
      let outgoingMembership = null;

      // a. End outgoing headteacher's appointment and membership
      if (outgoingUserId) {
        outgoingAppointment = await tx.schoolLeadershipAppointment.findFirst({
          where: { schoolId, userId: outgoingUserId, status: 'active' },
        });

        if (outgoingAppointment) {
          await tx.schoolLeadershipAppointment.update({
            where: { id: outgoingAppointment.id },
            data: {
              endDate: effective,
              status: 'ended',
              endReason: reason,
              transferNotes: `Transferred on ${effective.toISOString()}. ${reason}`,
            },
          });
        }

        outgoingMembership = await tx.schoolMembership.findUnique({
          where: { schoolId_userId: { schoolId, userId: outgoingUserId } },
        });

        if (outgoingMembership) {
          await tx.schoolMembership.update({
            where: { id: outgoingMembership.id },
            data: {
              leftAt: effective,
              status: 'ended',
              endReason: reason,
              transferNotes: `Transferred on ${effective.toISOString()}. ${reason}`,
            },
          });
        }
      }

      // c. Create new appointment for incoming headteacher
      const newAppointment = await tx.schoolLeadershipAppointment.create({
        data: {
          schoolId,
          userId: incomingUserId,
          position: 'headteacher',
          startDate: effective,
          status: 'active',
          approvedBy: req.user.id,
          approvalDate: now,
          reason,
          previousAppointmentId: outgoingAppointment ? outgoingAppointment.id : null,
        },
      });

      // d. Create new membership for incoming headteacher
      // Check if there's an existing (ended) membership to reactivate
      const existingIncomingMembership = await tx.schoolMembership.findUnique({
        where: { schoolId_userId: { schoolId, userId: incomingUserId } },
      });

      if (existingIncomingMembership) {
        await tx.schoolMembership.update({
          where: { id: existingIncomingMembership.id },
          data: {
            role: 'headteacher',
            status: 'active',
            isPrimary: true,
            joinedAt: effective,
            leftAt: null,
            endReason: null,
            transferNotes: null,
          },
        });
      } else {
        await tx.schoolMembership.create({
          data: {
            schoolId,
            userId: incomingUserId,
            role: 'headteacher',
            status: 'active',
            isPrimary: true,
          },
        });
      }

      // Update staff profile for incoming
      await tx.schoolStaffProfile.upsert({
        where: { userId: incomingUserId },
        update: { schoolId, position: 'headteacher', isActive: true },
        create: {
          userId: incomingUserId,
          schoolId,
          position: 'headteacher',
          employmentType: 'full_time',
          hireDate: effective,
          isActive: true,
        },
      });

      return { appointment: newAppointment };
    });

    res.json(result);
  } catch (err) {
    console.error('POST /schools/:id/transfer error:', err);
    res.status(500).json({ error: 'Failed to transfer headteacher' });
  }
});

// ---------------------------------------------------------------------------
// 10. GET /api/schools/:id/leadership-history — Leadership appointment history
// ---------------------------------------------------------------------------
router.get('/:id/leadership-history', async (req, res) => {
  try {
    const schoolId = req.params.id;

    const appointments = await prisma.schoolLeadershipAppointment.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        approver: { select: { id: true, fullName: true } },
      },
    });

    res.json({ data: appointments });
  } catch (err) {
    console.error('GET /schools/:id/leadership-history error:', err);
    res.status(500).json({ error: 'Failed to fetch leadership history' });
  }
});

// ---------------------------------------------------------------------------
// 12. GET /api/schools/:id/stats — Get school statistics
// ---------------------------------------------------------------------------
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isAdmin) {
      const membership = await prisma.schoolMembership.findFirst({
        where: { schoolId, userId: req.user.id, role: 'headteacher', status: 'active' },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const [
      studentCount,
      teacherCount,
      totalMemberships,
      classCount,
      activeAppointments,
      pendingMemberships,
    ] = await Promise.all([
      prisma.schoolMembership.count({ where: { schoolId, role: 'student', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId, role: 'teacher', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId, status: 'active' } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.schoolLeadershipAppointment.count({ where: { schoolId, status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId, status: 'pending' } }),
    ]);

    res.json({
      students: studentCount,
      teachers: teacherCount,
      totalMembers: totalMemberships,
      classes: classCount,
      activeAppointments,
      pendingMemberships,
      isVerified: school.isVerified,
      registrationStatus: school.registrationStatus,
    });
  } catch (err) {
    console.error('GET /schools/:id/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ---------------------------------------------------------------------------
// Helper: resolve school from :id param or 'my-school'
// ---------------------------------------------------------------------------
async function resolveSchool(req) {
  const id = req.params.id;
  if (id === 'my-school') {
    const membership = await prisma.schoolMembership.findFirst({
      where: { userId: req.user.id, role: 'headteacher', status: 'active' },
      include: { school: true },
    });
    return membership ? membership.school : null;
  }
  return prisma.school.findUnique({ where: { id } });
}

async function requireHeadteacher(req, res) {
  if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) return true;
  const schoolId = req.params.id === 'my-school'
    ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, role: 'headteacher', status: 'active' } }))?.schoolId
    : req.params.id;
  if (!schoolId) {
    res.status(404).json({ error: 'School not found' });
    return false;
  }
  const membership = await prisma.schoolMembership.findFirst({
    where: { schoolId, userId: req.user.id, role: 'headteacher', status: 'active' },
  });
  if (!membership) {
    res.status(403).json({ error: 'Access denied. Headteacher role required.' });
    return false;
  }
  req.resolvedSchoolId = schoolId;
  return true;
}

// ---------------------------------------------------------------------------
// 13. GET /api/schools/:id/teachers — List teachers at a school
// ---------------------------------------------------------------------------
router.get('/:id/teachers', requireAuth, async (req, res) => {
  try {
    if (!await requireHeadteacher(req, res)) return;
    const schoolId = req.resolvedSchoolId;

    const staff = await prisma.schoolStaffProfile.findMany({
      where: { schoolId, isActive: true },
      include: {
        teacherAssignments: {
          where: { isActive: true, schoolId },
          include: {
            subject: { select: { id: true, name: true, nameEn: true, code: true } },
            class: { select: { id: true, name: true, level: true, section: true } },
          },
        },
        teacherQualifications: true,
      },
    });

    const teachers = await Promise.all(staff.map(async (s) => {
      const user = await prisma.user.findUnique({
        where: { id: s.userId },
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
      });
      return {
        id: s.id,
        userId: s.userId,
        staffId: s.staffId,
        position: s.position,
        department: s.department,
        employmentType: s.employmentType,
        hireDate: s.hireDate,
        name: user?.fullName || 'Unknown',
        email: user?.email || '',
        phone: user?.phone || '',
        avatarUrl: user?.avatarUrl || null,
        subjects: s.teacherAssignments.map(a => a.subject).filter(Boolean),
        classes: s.teacherAssignments.map(a => a.class).filter(Boolean),
        qualifications: s.teacherQualifications.map(q => ({
          type: q.qualificationType,
          institution: q.institution,
          degree: q.degree,
          fieldOfStudy: q.fieldOfStudy,
        })),
      };
    }));

    res.json({ teachers, total: teachers.length });
  } catch (err) {
    console.error('GET /schools/:id/teachers error:', err);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// ---------------------------------------------------------------------------
// 14. POST /api/schools/:id/teachers — Register a teacher at a school
// ---------------------------------------------------------------------------
router.post('/:id/teachers', requireAuth, requireRole('HEADTEACHER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    if (!await requireHeadteacher(req, res)) return;
    const schoolId = req.resolvedSchoolId;
    const { email, fullName, phone, position, department, subjectIds, qualification, experience } = req.body || {};

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and full name are required' });
    }

    let user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: String(email).trim().toLowerCase(),
          emailNormalized: String(email).trim().toLowerCase(),
          fullName: String(fullName).trim(),
          phone: phone ? String(phone).trim() : null,
          role: 'TEACHER',
          status: 'ACTIVE',
          emailVerified: false,
        },
      });
    }

    let staff = await prisma.schoolStaffProfile.findUnique({ where: { userId: user.id } });
    if (!staff) {
      staff = await prisma.schoolStaffProfile.create({
        data: {
          userId: user.id,
          schoolId,
          staffId: 'TCH-' + Date.now().toString(36).toUpperCase(),
          position: position || 'Teacher',
          department: department || null,
          employmentType: 'full_time',
          hireDate: new Date(),
          isActive: true,
        },
      });
    }

    if (qualification) {
      await prisma.teacherQualification.create({
        data: {
          schoolStaffProfileId: staff.id,
          qualificationType: qualification.type || 'Degree',
          institution: qualification.institution || '',
          degree: qualification.degree || null,
          fieldOfStudy: qualification.fieldOfStudy || null,
        },
      });
    }

    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        const existing = await prisma.teacherAssignment.findFirst({
          where: { schoolStaffProfileId: staff.id, schoolId, subjectId, isActive: true },
        });
        if (!existing) {
          await prisma.teacherAssignment.create({
            data: { schoolStaffProfileId: staff.id, schoolId, subjectId, isActive: true },
          });
        }
      }
    }

    const membership = await prisma.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId, userId: user.id } },
      update: { role: 'teacher', status: 'active' },
      create: { schoolId, userId: user.id, role: 'teacher', status: 'active' },
    });

    res.status(201).json({ message: 'Teacher registered successfully', teacher: { id: staff.id, userId: user.id, name: user.fullName, email: user.email } });
  } catch (err) {
    console.error('POST /schools/:id/teachers error:', err);
    res.status(500).json({ error: 'Failed to register teacher' });
  }
});

// ---------------------------------------------------------------------------
// 15. GET /api/schools/:id/absent-teachers — Get absent teachers
// ---------------------------------------------------------------------------
router.get('/:id/absent-teachers', requireAuth, async (req, res) => {
  try {
    if (!await requireHeadteacher(req, res)) return;
    const schoolId = req.resolvedSchoolId;
    const period = req.query.period || 'today';

    const staff = await prisma.schoolStaffProfile.findMany({
      where: { schoolId, isActive: true },
      include: {
        teacherAssignments: {
          where: { isActive: true, schoolId },
          include: { subject: { select: { id: true, name: true, nameEn: true } } },
        },
      },
    });

    const teachers = await Promise.all(staff.map(async (s) => {
      const user = await prisma.user.findUnique({
        where: { id: s.userId },
        select: { id: true, fullName: true, email: true, phone: true },
      });
      return {
        id: s.id,
        userId: s.userId,
        name: user?.fullName || 'Unknown',
        email: user?.email || '',
        phone: user?.phone || '',
        position: s.position,
        subjects: s.teacherAssignments.map(a => a.subject).filter(Boolean),
        status: 'absent',
        period,
      };
    }));

    res.json({ absentTeachers: teachers, total: teachers.length, period });
  } catch (err) {
    console.error('GET /schools/:id/absent-teachers error:', err);
    res.status(500).json({ error: 'Failed to fetch absent teachers' });
  }
});

// ---------------------------------------------------------------------------
// 16. POST /api/schools/request-teacher-report — Request a report from a teacher
// ---------------------------------------------------------------------------
router.post('/request-teacher-report', requireAuth, requireRole('HEADTEACHER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolId, teacherId, reportType, message } = req.body || {};
    if (!schoolId || !teacherId || !reportType) {
      return res.status(400).json({ error: 'schoolId, teacherId, and reportType are required' });
    }

    const report = await prisma.teacherReportRequest.create({
      data: {
        schoolId,
        requestedBy: req.user.id,
        teacherId,
        reportType,
        message: message || null,
      },
    });

    res.status(201).json({ message: 'Report request sent', report });
  } catch (err) {
    console.error('POST /schools/request-teacher-report error:', err);
    res.status(500).json({ error: 'Failed to create report request' });
  }
});

// ---------------------------------------------------------------------------
// 17. POST /api/schools/events — Create a school event
// ---------------------------------------------------------------------------
router.post('/events', requireAuth, requireRole('HEADTEACHER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolId, title, description, eventType, startDate, endDate, location } = req.body || {};
    if (!schoolId || !title || !startDate) {
      return res.status(400).json({ error: 'schoolId, title, and startDate are required' });
    }

    const event = await prisma.schoolEvent.create({
      data: {
        schoolId,
        title: String(title).trim(),
        description: description || null,
        eventType: eventType || 'GENERAL',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    console.error('POST /schools/events error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ---------------------------------------------------------------------------
// 18. GET /api/schools/:id/events — Get school events
// ---------------------------------------------------------------------------
router.get('/:id/events', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const events = await prisma.schoolEvent.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });

    res.json({ events });
  } catch (err) {
    console.error('GET /schools/:id/events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ---------------------------------------------------------------------------
// 19. DELETE /api/schools/events/:id — Delete a school event
// ---------------------------------------------------------------------------
router.delete('/events/:id', requireAuth, requireRole('HEADTEACHER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const event = await prisma.schoolEvent.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.createdBy !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.schoolEvent.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('DELETE /schools/events/:id error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ---------------------------------------------------------------------------
// 20. POST /api/schools/parent-meetings — Create a parent meeting
// ---------------------------------------------------------------------------
router.post('/parent-meetings', requireAuth, requireRole('HEADTEACHER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { schoolId, title, description, meetingType, classId, scheduledAt, durationMinutes, location } = req.body || {};
    if (!schoolId || !title || !scheduledAt) {
      return res.status(400).json({ error: 'schoolId, title, and scheduledAt are required' });
    }

    const meeting = await prisma.parentMeeting.create({
      data: {
        schoolId,
        title: String(title).trim(),
        description: description || null,
        meetingType: meetingType || 'GENERAL',
        classId: classId || null,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        location: location || null,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({ message: 'Meeting created', meeting });
  } catch (err) {
    console.error('POST /schools/parent-meetings error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// ---------------------------------------------------------------------------
// 21. GET /api/schools/:id/parent-meetings — Get parent meetings
// ---------------------------------------------------------------------------
router.get('/:id/parent-meetings', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const meetings = await prisma.parentMeeting.findMany({
      where: { schoolId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        creator: { select: { id: true, fullName: true } },
        class: { select: { id: true, name: true, level: true, section: true } },
      },
    });

    res.json({ meetings });
  } catch (err) {
    console.error('GET /schools/:id/parent-meetings error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// ---------------------------------------------------------------------------
// 22. GET /api/schools/:id/statistics — Get detailed school statistics
// ---------------------------------------------------------------------------
router.get('/:id/statistics', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, role: 'headteacher', status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const [
      studentCount,
      teacherCount,
      parentCount,
      classCount,
      eventCount,
      announcementCount,
    ] = await Promise.all([
      prisma.schoolMembership.count({ where: { schoolId, role: 'student', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId, role: 'teacher', status: 'active' } }),
      prisma.schoolMembership.count({ where: { schoolId, role: 'parent', status: 'active' } }),
      prisma.class.count({ where: { schoolId, isActive: true } }),
      prisma.schoolEvent.count({ where: { schoolId } }),
      prisma.schoolAnnouncement.count({ where: { schoolId } }),
    ]);

    const classStats = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        classMemberships: { where: { role: 'student', status: 'active' } },
        teacherAssignments: {
          where: { isActive: true },
          include: { subject: { select: { name: true, nameEn: true } } },
        },
      },
    });

    const classReports = classStats.map(c => ({
      id: c.id,
      name: c.name,
      level: c.level,
      section: c.section,
      studentCount: c.classMemberships.length,
      teacherCount: c.teacherAssignments.length,
      subjects: c.teacherAssignments.map(a => a.subject).filter(Boolean).map(s => s.nameEn || s.name),
    }));

    res.json({
      overview: { students: studentCount, teachers: teacherCount, parents: parentCount, classes: classCount, events: eventCount, announcements: announcementCount },
      classReports,
    });
  } catch (err) {
    console.error('GET /schools/:id/statistics error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ---------------------------------------------------------------------------
// 23. GET /api/schools/:id/class-reports — Get class-level reports
// ---------------------------------------------------------------------------
router.get('/:id/class-reports', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, role: 'headteacher', status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const classes = await prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        classMemberships: { where: { role: 'student', status: 'active' } },
        teacherAssignments: {
          where: { isActive: true },
          include: { subject: { select: { id: true, name: true, nameEn: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const reports = classes.map(c => ({
      id: c.id,
      name: c.name,
      level: c.level,
      section: c.section,
      studentCount: c.classMemberships.length,
      teachers: c.teacherAssignments.map(a => a.subject).filter(Boolean).map(s => s.nameEn || s.name),
    }));

    res.json({ classReports: reports });
  } catch (err) {
    console.error('GET /schools/:id/class-reports error:', err);
    res.status(500).json({ error: 'Failed to fetch class reports' });
  }
});

// ---------------------------------------------------------------------------
// 24. GET /api/schools/:id/news — Get school news (announcements)
// ---------------------------------------------------------------------------
router.get('/:id/news', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const category = req.query.category;
    const where = { schoolId };
    if (category && category !== 'all') {
      where.priority = category === 'important' ? 'urgent' : 'normal';
    }

    const announcements = await prisma.schoolAnnouncement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    const news = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.priority === 'urgent' ? 'important' : 'general',
      priority: a.priority,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt || a.createdAt,
      expiresAt: a.expiresAt,
    }));

    res.json({ news });
  } catch (err) {
    console.error('GET /schools/:id/news error:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// ---------------------------------------------------------------------------
// 25. GET /api/schools/:id/fees — Get school fee structure
// ---------------------------------------------------------------------------
router.get('/:id/fees', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const fees = await prisma.schoolFee.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ feeType: 'asc' }, { title: 'asc' }],
      include: { creator: { select: { id: true, fullName: true } } },
    });

    res.json({ fees });
  } catch (err) {
    console.error('GET /schools/:id/fees error:', err);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

// ---------------------------------------------------------------------------
// 26. GET /api/schools/:id/community — Get school parent community
// ---------------------------------------------------------------------------
router.get('/:id/community', requireAuth, async (req, res) => {
  try {
    const schoolId = req.params.id === 'my-school'
      ? (await prisma.schoolMembership.findFirst({ where: { userId: req.user.id, status: 'active' } }))?.schoolId
      : req.params.id;
    if (!schoolId) return res.status(404).json({ error: 'School not found' });

    const memberships = await prisma.schoolMembership.findMany({
      where: { schoolId, role: 'parent', status: 'active' },
      take: 100,
    });

    const parents = await Promise.all(memberships.map(async (m) => {
      const user = await prisma.user.findUnique({
        where: { id: m.userId },
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true },
      });
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId: m.userId },
        select: { occupation: true, relationship: true },
      });
      return {
        id: user?.id,
        name: user?.fullName || 'Unknown',
        email: user?.email || '',
        phone: user?.phone || '',
        avatarUrl: user?.avatarUrl || null,
        occupation: parentProfile?.occupation || null,
        relationship: parentProfile?.relationship || null,
      };
    }));

    res.json({ community: parents, total: parents.length });
  } catch (err) {
    console.error('GET /schools/:id/community error:', err);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

module.exports = router;
