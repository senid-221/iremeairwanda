const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole, requireActive } = require('../middleware/auth');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helper: get unread notification count + recent notifications for a user
// ---------------------------------------------------------------------------
async function getNotifications(userId, limit = 10) {
  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        link: true,
        priority: true,
        createdAt: true,
      },
    }),
  ]);

  return { unreadCount, notifications };
}

// ===========================================================================
// 1. GET /student — Student dashboard data
// ===========================================================================
router.get(
  '/student',
  requireAuth,
  requireRole('STUDENT'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch student profile
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
      });

      if (!studentProfile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Fetch active enrollments with education level and subjects
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { studentProfileId: studentProfile.id, status: 'active' },
        include: {
          educationLevel: {
            select: { id: true, name: true, nameEn: true, code: true },
          },
          school: {
            select: { id: true, name: true, nameEn: true },
          },
          academicYear: {
            select: { id: true, name: true, isCurrent: true },
          },
        },
      });

      // Collect unique education level IDs to fetch subjects
      const levelIds = [...new Set(enrollments.map((e) => e.educationLevelId))];

      const levelSubjects = await prisma.levelSubject.findMany({
        where: { educationLevelId: { in: levelIds } },
        include: {
          subject: {
            select: { id: true, code: true, name: true, nameEn: true, iconUrl: true },
          },
          educationLevel: {
            select: { id: true, name: true, nameEn: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      // Build subjects array grouped by level
      const subjects = levelSubjects.map((ls) => ({
        id: ls.subject.id,
        code: ls.subject.code,
        name: ls.subject.name,
        nameEn: ls.subject.nameEn,
        iconUrl: ls.subject.iconUrl,
        isCore: ls.isCore,
        level: {
          id: ls.educationLevel.id,
          name: ls.educationLevel.name,
          nameEn: ls.educationLevel.nameEn,
        },
      }));

      // Video lesson progress
      const [videoProgress, videoStats] = await Promise.all([
        prisma.videoLessonProgress.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          include: {
            videoLesson: {
              select: {
                id: true,
                title: true,
                topicName: true,
                subjectId: true,
                educationLevelId: true,
                durationSeconds: true,
                status: true,
              },
            },
          },
        }),
        prisma.videoLessonProgress.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: {},
        }),
      ]);

      const totalVideoLessons = videoStats._count.id;
      const completedVideos = videoProgress.filter(
        (p) => p.completionPercent >= 100
      ).length;
      const inProgressVideos = totalVideoLessons - completedVideos;

      const videoLessons = {
        total: totalVideoLessons,
        completed: completedVideos,
        inProgress: inProgressVideos > 0 ? inProgressVideos : 0,
        recent: videoProgress.map((p) => ({
          id: p.id,
          lessonId: p.videoLesson.id,
          title: p.videoLesson.title || p.videoLesson.topicName,
          completionPercent: p.completionPercent,
          lastPositionSeconds: p.lastPositionSeconds,
          updatedAt: p.updatedAt,
        })),
      };

      // Game stats
      const [totalMatches, wins] = await Promise.all([
        prisma.gameMatch.count({
          where: { player1Id: userId },
        }),
        prisma.gameMatch.count({
          where: { player1Id: userId, result: 'win' },
        }),
      ]);

      const gameStats = {
        matchesPlayed: totalMatches,
        wins,
        winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      };

      // Recent activity from LearningActivityLog
      const recentActivity = await prisma.learningActivityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          activityType: true,
          activityTitle: true,
          subjectId: true,
          xpEarned: true,
          durationSeconds: true,
          createdAt: true,
        },
      });

      // Notifications
      const { unreadCount, notifications } = await getNotifications(userId);

      // Build user object
      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      res.json({
        user,
        profile: {
          studentId: studentProfile.studentId,
          admissionDate: studentProfile.admissionDate,
        },
        enrollments: enrollments.map((e) => ({
          id: e.id,
          school: { id: e.school.id, name: e.school.name, nameEn: e.school.nameEn },
          level: {
            id: e.educationLevel.id,
            name: e.educationLevel.name,
            nameEn: e.educationLevel.nameEn,
          },
          academicYear: { id: e.academicYear.id, name: e.academicYear.name, isCurrent: e.academicYear.isCurrent },
          status: e.status,
        })),
        subjects,
        videoLessons,
        gameStats,
        recentActivity,
        notifications,
        unreadNotificationCount: unreadCount,
      });
    } catch (error) {
      console.error('Student dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch student dashboard data' });
    }
  }
);

// ===========================================================================
// 2. GET /teacher — Teacher dashboard data
// ===========================================================================
router.get(
  '/teacher',
  requireAuth,
  requireRole('TEACHER'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch staff profile with school
      const staffProfile = await prisma.schoolStaffProfile.findUnique({
        where: { userId },
        include: {
          school: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEn: true,
              schoolType: true,
            },
          },
        },
      });

      // Fetch teacher assignments with class and subject details
      const assignments = await prisma.teacherAssignment.findMany({
        where: { schoolStaffProfileId: staffProfile?.id, isActive: true },
        include: {
          class: {
            select: { id: true, name: true, level: true, section: true },
          },
          subject: {
            select: { id: true, code: true, name: true, nameEn: true },
          },
          school: {
            select: { id: true, name: true, nameEn: true },
          },
        },
      });

      // Get unique class IDs from assignments
      const classIds = [
        ...new Set(assignments.map((a) => a.classId).filter(Boolean)),
      ];

      // Fetch classes
      const classes = await prisma.class.findMany({
        where: { id: { in: classIds } },
        select: {
          id: true,
          name: true,
          level: true,
          section: true,
          isActive: true,
        },
      });

      // Fetch students in those classes via ClassMembership
      let students = [];
      if (classIds.length > 0) {
        const memberships = await prisma.classMembership.findMany({
          where: {
            classId: { in: classIds },
            role: 'student',
            status: 'active',
          },
          select: {
            id: true,
            classId: true,
            userId: true,
          },
        });

        const studentUserIds = [...new Set(memberships.map((m) => m.userId))];

        if (studentUserIds.length > 0) {
          const studentUsers = await prisma.user.findMany({
            where: { id: { in: studentUserIds } },
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          });

          // Map memberships to include student info + class info
          students = memberships.map((m) => {
            const user = studentUsers.find((u) => u.id === m.userId);
            const cls = classes.find((c) => c.id === m.classId);
            return {
              id: m.id,
              userId: m.userId,
              fullName: user?.fullName || null,
              email: user?.email || null,
              avatarUrl: user?.avatarUrl || null,
              class: cls
                ? { id: cls.id, name: cls.name, level: cls.level, section: cls.section }
                : null,
            };
          });
        }
      }

      // Recent activity
      const recentActivity = await prisma.learningActivityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          activityType: true,
          activityTitle: true,
          subjectId: true,
          xpEarned: true,
          durationSeconds: true,
          createdAt: true,
        },
      });

      // Notifications
      const { unreadCount, notifications } = await getNotifications(userId);

      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      const school = staffProfile?.school
        ? {
            id: staffProfile.school.id,
            code: staffProfile.school.code,
            name: staffProfile.school.name,
            nameEn: staffProfile.school.nameEn,
            schoolType: staffProfile.school.schoolType,
          }
        : null;

      res.json({
        user,
        school,
        staffProfile: staffProfile
          ? {
              id: staffProfile.id,
              position: staffProfile.position,
              department: staffProfile.department,
              employmentType: staffProfile.employmentType,
            }
          : null,
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          section: c.section,
          isActive: c.isActive,
        })),
        assignments: assignments.map((a) => ({
          id: a.id,
          subject: a.subject
            ? { id: a.subject.id, name: a.subject.name, nameEn: a.subject.nameEn }
            : null,
          class: a.class
            ? { id: a.class.id, name: a.class.name, level: a.class.level, section: a.class.section }
            : null,
        })),
        students,
        studentCount: students.length,
        recentActivity,
        notifications,
        unreadNotificationCount: unreadCount,
      });
    } catch (error) {
      console.error('Teacher dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch teacher dashboard data' });
    }
  }
);

// ===========================================================================
// 3. GET /parent — Parent dashboard data
// ===========================================================================
router.get(
  '/parent',
  requireAuth,
  requireRole('PARENT'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch parent profile
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId },
      });

      if (!parentProfile) {
        return res.status(404).json({ error: 'Parent profile not found' });
      }

      // Fetch guardian links to find children
      const guardianLinks = await prisma.studentGuardian.findMany({
        where: { parentProfileId: parentProfile.id, status: 'active' },
        include: {
          studentProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
              studentEnrollments: {
                where: { status: 'active' },
                take: 1,
                include: {
                  school: {
                    select: { id: true, name: true, nameEn: true },
                  },
                  educationLevel: {
                    select: { id: true, name: true, nameEn: true },
                  },
                },
              },
            },
          },
        },
      });

      const children = guardianLinks.map((link) => {
        const sp = link.studentProfile;
        const enrollment = sp.studentEnrollments[0];
        return {
          id: sp.id,
          userId: sp.userId,
          studentId: sp.studentId,
          fullName: sp.user?.fullName || null,
          email: sp.user?.email || null,
          avatarUrl: sp.user?.avatarUrl || null,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          school: enrollment
            ? { id: enrollment.school.id, name: enrollment.school.name, nameEn: enrollment.school.nameEn }
            : null,
          level: enrollment
            ? { id: enrollment.educationLevel.id, name: enrollment.educationLevel.name, nameEn: enrollment.educationLevel.nameEn }
            : null,
        };
      });

      // Notifications
      const { unreadCount, notifications } = await getNotifications(userId);

      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      res.json({
        user,
        children,
        childrenCount: children.length,
        notifications,
        unreadNotificationCount: unreadCount,
      });
    } catch (error) {
      console.error('Parent dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch parent dashboard data' });
    }
  }
);

// ===========================================================================
// 4. GET /headteacher — Headteacher dashboard data
// ===========================================================================
router.get(
  '/headteacher',
  requireAuth,
  requireRole('HEADTEACHER'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Fetch active leadership appointment
      const appointment = await prisma.schoolLeadershipAppointment.findFirst({
        where: { userId, status: 'active' },
        orderBy: { startDate: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              code: true,
              name: true,
              nameEn: true,
              schoolType: true,
              registrationStatus: true,
              isVerified: true,
            },
          },
        },
      });

      let school = null;
      let appointmentStatus = null;
      let stats = { students: 0, teachers: 0, classes: 0 };
      let pendingTasks = [];

      if (appointment) {
        school = {
          id: appointment.school.id,
          code: appointment.school.code,
          name: appointment.school.name,
          nameEn: appointment.school.nameEn,
          schoolType: appointment.school.schoolType,
          registrationStatus: appointment.school.registrationStatus,
          isVerified: appointment.school.isVerified,
        };

        appointmentStatus = {
          position: appointment.position,
          status: appointment.status,
          startDate: appointment.startDate,
          endDate: appointment.endDate,
        };

        // Count stats in parallel
        const [studentCount, teacherCount, classCount] = await Promise.all([
          prisma.studentEnrollment.count({
            where: { schoolId: appointment.schoolId, status: 'active' },
          }),
          prisma.schoolStaffProfile.count({
            where: { schoolId: appointment.schoolId, isActive: true },
          }),
          prisma.class.count({
            where: { schoolId: appointment.schoolId, isActive: true },
          }),
        ]);

        stats = {
          students: studentCount,
          teachers: teacherCount,
          classes: classCount,
        };

        // Pending tasks: pending membership requests, unverified staff, etc.
        const [pendingMemberships, pendingAppointments] = await Promise.all([
          prisma.schoolMembership.count({
            where: { schoolId: appointment.schoolId, status: 'pending' },
          }),
          prisma.schoolLeadershipAppointment.count({
            where: { schoolId: appointment.schoolId, status: 'pending' },
          }),
        ]);

        if (pendingMemberships > 0) {
          pendingTasks.push({
            type: 'pending_memberships',
            title: 'Pending membership requests',
            count: pendingMemberships,
          });
        }
        if (pendingAppointments > 0) {
          pendingTasks.push({
            type: 'pending_appointments',
            title: 'Pending leadership appointments',
            count: pendingAppointments,
          });
        }
      }

      // Notifications
      const { unreadCount, notifications } = await getNotifications(userId);

      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      res.json({
        user,
        school,
        appointmentStatus,
        stats,
        pendingTasks,
        notifications,
        unreadNotificationCount: unreadCount,
      });
    } catch (error) {
      console.error('Headteacher dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch headteacher dashboard data' });
    }
  }
);

// ===========================================================================
// 5. GET /admin — Admin dashboard data
// ===========================================================================
router.get(
  '/admin',
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Aggregate stats in parallel
      const [
        totalUsers,
        totalSchools,
        pendingSchools,
        pendingTeachers,
        totalMatches,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.school.count(),
        prisma.school.count({
          where: { registrationStatus: 'pending' },
        }),
        prisma.schoolStaffProfile.count({
          where: { isActive: false },
        }),
        prisma.gameMatch.count(),
      ]);

      // Role breakdown
      const roleCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      const userRoles = {};
      for (const rc of roleCounts) {
        userRoles[rc.role] = rc._count.id;
      }

      // Recent activity from audit logs
      const recentActivity = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          creator: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Notifications
      const { unreadCount, notifications } = await getNotifications(userId);

      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      res.json({
        user,
        stats: {
          totalUsers,
          totalSchools,
          pendingSchools,
          pendingTeachers,
          totalMatches,
          userRoles,
        },
        recentActivity,
        notifications,
        unreadNotificationCount: unreadCount,
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
    }
  }
);

// ===========================================================================
// 6. GET /super-admin — Super admin dashboard data
// ===========================================================================
router.get(
  '/super-admin',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  requireActive,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Aggregate stats in parallel
      const [
        totalUsers,
        totalSchools,
        activeSchools,
        pendingVerifications,
        totalMatches,
        pendingApprovalRequests,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.school.count(),
        prisma.school.count({
          where: { isVerified: true, status: 'active' },
        }),
        prisma.school.count({
          where: { registrationStatus: 'pending' },
        }),
        prisma.gameMatch.count(),
        prisma.adminApprovalRequest.count({
          where: { status: 'pending' },
        }),
      ]);

      // System health: check DB connectivity, count recent errors
      let systemHealth = {
        database: 'healthy',
        pendingJobs: 0,
        pendingApprovals: pendingApprovalRequests,
      };

      try {
        // Quick DB check
        await prisma.$queryRaw`SELECT 1`;
        systemHealth.database = 'healthy';
      } catch {
        systemHealth.database = 'degraded';
      }

      // Count pending background jobs
      systemHealth.pendingJobs = await prisma.backgroundJob.count({
        where: { status: { in: ['pending', 'running'] } },
      });

      // Role breakdown
      const roleCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      const userRoles = {};
      for (const rc of roleCounts) {
        userRoles[rc.role] = rc._count.id;
      }

      // Recent activity from audit logs
      const recentActivity = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          creator: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      const user = {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      };

      res.json({
        user,
        stats: {
          totalUsers,
          totalSchools,
          activeSchools,
          pendingVerifications,
          totalMatches,
          userRoles,
        },
        systemHealth,
        recentActivity,
      });
    } catch (error) {
      console.error('Super admin dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch super admin dashboard data' });
    }
  }
);

module.exports = router;
