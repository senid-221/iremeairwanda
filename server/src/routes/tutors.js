var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth } = require('../middleware/auth');
var { uploadCV } = require('../middleware/upload');
var CVAnalysisService = require('../services/cv-analysis');
var path = require('path');

var prisma = new PrismaClient();

router.post('/profile', requireAuth, function(req, res) {
  var userId = req.user.id;
  var data = req.body;

  prisma.tutorProfile.upsert({
    where: { userId: userId },
    create: {
      userId: userId,
      headline: data.headline || null,
      bio: data.bio || null,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      currency: data.currency || 'RWF',
      experienceYears: data.experienceYears ? parseInt(data.experienceYears) : null,
      teachingPhilosophy: data.teachingPhilosophy || null,
      languages: data.languages || [],
      lessonFormats: data.lessonFormats || [],
      isAvailable: data.isAvailable !== false
    },
    update: {
      headline: data.headline || null,
      bio: data.bio || null,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      currency: data.currency || 'RWF',
      experienceYears: data.experienceYears ? parseInt(data.experienceYears) : null,
      teachingPhilosophy: data.teachingPhilosophy || null,
      languages: data.languages || [],
      lessonFormats: data.lessonFormats || [],
      isAvailable: data.isAvailable !== false
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      },
      subjects: {
        include: {
          subject: true,
          educationLevel: true
        }
      },
      serviceAreas: true,
      skillAssessments: true
    }
  }).then(function(profile) {
    res.json({
      success: true,
      profile: profile
    });
  }).catch(function(err) {
    console.error('Tutor profile error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save tutor profile'
    });
  });
});

router.get('/profile', requireAuth, function(req, res) {
  var userId = req.user.id;

  prisma.tutorProfile.findUnique({
    where: { userId: userId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true
        }
      },
      subjects: {
        include: {
          subject: true,
          educationLevel: true
        }
      },
      serviceAreas: true,
      skillAssessments: true,
      availability: true
    }
  }).then(function(profile) {
    if (!profile) {
      return res.json({
        success: true,
        profile: null,
        message: 'No tutor profile found'
      });
    }

    res.json({
      success: true,
      profile: profile
    });
  }).catch(function(err) {
    console.error('Get tutor profile error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tutor profile'
    });
  });
});

router.post('/upload-cv', requireAuth, function(req, res) {
  uploadCV(req, res, function(err) {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    var userId = req.user.id;
    var cvPath = req.file.path;
    var cvUrl = '/uploads/cvs/' + req.file.filename;

    prisma.tutorProfile.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        cvUrl: cvUrl
      },
      update: {
        cvUrl: cvUrl
      }
    }).then(function(profile) {
      return CVAnalysisService.analyzeCV(profile.id, cvPath);
    }).then(function(result) {
      res.json({
        success: true,
        message: 'CV uploaded and analyzed successfully',
        cvUrl: cvUrl,
        analysis: result.analysis
      });
    }).catch(function(err) {
      console.error('CV upload/analysis error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to process CV: ' + err.message
      });
    });
  });
});

router.post('/analyze-cv', requireAuth, function(req, res) {
  var userId = req.user.id;

  prisma.tutorProfile.findUnique({
    where: { userId: userId }
  }).then(function(profile) {
    if (!profile || !profile.cvUrl) {
      return res.status(400).json({
        success: false,
        error: 'No CV found. Please upload a CV first.'
      });
    }

    var cvPath = path.join(__dirname, '../../uploads', profile.cvUrl.replace('/uploads/', ''));
    return CVAnalysisService.analyzeCV(profile.id, cvPath);
  }).then(function(result) {
    if (result.success === false) {
      return res.status(500).json(result);
    }
    res.json(result);
  }).catch(function(err) {
    console.error('CV analysis error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze CV: ' + err.message
    });
  });
});

router.get('/skill-assessments', requireAuth, function(req, res) {
  var userId = req.user.id;

  prisma.tutorProfile.findUnique({
    where: { userId: userId }
  }).then(function(profile) {
    if (!profile) {
      return res.json({
        success: true,
        assessments: []
      });
    }

    return CVAnalysisService.getAnalysis(profile.id);
  }).then(function(result) {
    res.json(result);
  }).catch(function(err) {
    console.error('Get assessments error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assessments'
    });
  });
});

router.post('/subjects', requireAuth, function(req, res) {
  var userId = req.user.id;
  var subjects = req.body.subjects || [];

  prisma.tutorProfile.findUnique({
    where: { userId: userId }
  }).then(function(profile) {
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Tutor profile not found'
      });
    }

    return prisma.tutorSubject.deleteMany({
      where: { tutorProfileId: profile.id }
    }).then(function() {
      var createPromises = subjects.map(function(subj) {
        return prisma.tutorSubject.create({
          data: {
            tutorProfileId: profile.id,
            subjectId: subj.subjectId,
            educationLevelId: subj.educationLevelId || null,
            proficiencyLevel: subj.proficiencyLevel || 'proficient',
            hourlyRateOverride: subj.hourlyRateOverride ? parseFloat(subj.hourlyRateOverride) : null
          }
        });
      });

      return Promise.all(createPromises);
    });
  }).then(function() {
    res.json({
      success: true,
      message: 'Subjects updated successfully'
    });
  }).catch(function(err) {
    console.error('Update subjects error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update subjects'
    });
  });
});

router.post('/availability', requireAuth, function(req, res) {
  var userId = req.user.id;
  var availability = req.body.availability || [];

  prisma.tutorProfile.findUnique({
    where: { userId: userId }
  }).then(function(profile) {
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Tutor profile not found'
      });
    }

    return prisma.tutorAvailability.deleteMany({
      where: { tutorProfileId: profile.id }
    }).then(function() {
      var createPromises = availability.map(function(slot) {
        return prisma.tutorAvailability.create({
          data: {
            tutorProfileId: profile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring !== false
          }
        });
      });

      return Promise.all(createPromises);
    });
  }).then(function() {
    res.json({
      success: true,
      message: 'Availability updated successfully'
    });
  }).catch(function(err) {
    console.error('Update availability error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update availability'
    });
  });
});

router.post('/service-areas', requireAuth, function(req, res) {
  var userId = req.user.id;
  var areas = req.body.areas || [];

  prisma.tutorProfile.findUnique({
    where: { userId: userId }
  }).then(function(profile) {
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Tutor profile not found'
      });
    }

    return prisma.tutorServiceArea.deleteMany({
      where: { tutorProfileId: profile.id }
    }).then(function() {
      var createPromises = areas.map(function(area) {
        return prisma.tutorServiceArea.create({
          data: {
            tutorProfileId: profile.id,
            province: area.province || null,
            district: area.district || null,
            sector: area.sector || null,
            cell: area.cell || null,
            village: area.village || null,
            provinceId: area.provinceId || null,
            districtId: area.districtId || null,
            sectorId: area.sectorId || null,
            cellId: area.cellId || null,
            villageId: area.villageId || null,
            servesOnline: area.servesOnline || false
          }
        });
      });

      return Promise.all(createPromises);
    });
  }).then(function() {
    res.json({
      success: true,
      message: 'Service areas updated successfully'
    });
  }).catch(function(err) {
    console.error('Update service areas error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update service areas'
    });
  });
});

var RecommendationEngine = require('../services/recommendation');
var BookingService = require('../services/booking');

router.get('/recommendations', requireAuth, function(req, res) {
  var criteria = {
    subjectIds: req.query.subjectIds ? req.query.subjectIds.split(',') : [],
    educationLevelId: req.query.educationLevelId || null,
    province: req.query.province || null,
    district: req.query.district || null,
    sector: req.query.sector || null,
    cell: req.query.cell || null,
    village: req.query.village || null,
    lessonFormat: req.query.lessonFormat || null,
    preferredDays: req.query.preferredDays ? req.query.preferredDays.split(',').map(Number) : [],
    maxHourlyRate: req.query.maxHourlyRate ? parseFloat(req.query.maxHourlyRate) : null
  };

  RecommendationEngine.findRecommendedTutors(criteria)
    .then(function(results) {
      res.json({
        success: true,
        recommendations: results.map(function(result) {
          return {
            tutorId: result.tutor.id,
            tutorName: result.tutor.user.fullName,
            avatarUrl: result.tutor.user.avatarUrl,
            headline: result.tutor.headline,
            hourlyRate: result.tutor.hourlyRate,
            currency: result.tutor.currency,
            rating: result.tutor.rating,
            reviewCount: result.tutor.reviewCount,
            verificationStatus: result.tutor.verificationStatus,
            matchScore: result.matchScore,
            matchPercentage: result.matchPercentage,
            matchReasons: result.matchReasons,
            subjects: result.tutor.subjects.map(function(subj) {
              return {
                subjectId: subj.subjectId,
                subjectName: subj.subject.nameEn,
                educationLevel: subj.educationLevel ? subj.educationLevel.nameEn : null,
                proficiencyLevel: subj.proficiencyLevel
              };
            }),
            subjectScores: result.subjectScores,
            lessonFormats: result.tutor.lessonFormats,
            experienceYears: result.tutor.experienceYears,
            languages: result.tutor.languages
          };
        }),
        totalResults: results.length
      });
    })
    .catch(function(err) {
      console.error('Recommendation error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations'
      });
    });
});

router.get('/public-profile/:tutorId', function(req, res) {
  var tutorId = req.params.tutorId;

  RecommendationEngine.getTutorPublicProfile(tutorId)
    .then(function(profile) {
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Tutor not found'
        });
      }

      res.json({
        success: true,
        profile: profile
      });
    })
    .catch(function(err) {
      console.error('Get public profile error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get tutor profile'
      });
    });
});

router.post('/save', requireAuth, function(req, res) {
  var userId = req.user.id;
  var tutorId = req.body.tutorId;

  if (!tutorId) {
    return res.status(400).json({
      success: false,
      error: 'Tutor ID is required'
    });
  }

  prisma.tutorSave.upsert({
    where: {
      tutorProfileId_userId: {
        tutorProfileId: tutorId,
        userId: userId
      }
    },
    create: {
      tutorProfileId: tutorId,
      userId: userId
    },
    update: {}
  }).then(function() {
    res.json({
      success: true,
      message: 'Tutor saved successfully'
    });
  }).catch(function(err) {
    console.error('Save tutor error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save tutor'
    });
  });
});

router.delete('/save/:tutorId', requireAuth, function(req, res) {
  var userId = req.user.id;
  var tutorId = req.params.tutorId;

  prisma.tutorSave.deleteMany({
    where: {
      tutorProfileId: tutorId,
      userId: userId
    }
  }).then(function() {
    res.json({
      success: true,
      message: 'Tutor removed from saved list'
    });
  }).catch(function(err) {
    console.error('Unsave tutor error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to unsave tutor'
    });
  });
});

router.get('/saved', requireAuth, function(req, res) {
  var userId = req.user.id;

  prisma.tutorSave.findMany({
    where: { userId: userId },
    include: {
      tutorProfile: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          },
          subjects: {
            include: {
              subject: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }).then(function(saves) {
    res.json({
      success: true,
      savedTutors: saves.map(function(save) {
        return {
          id: save.tutorProfile.id,
          name: save.tutorProfile.user.fullName,
          avatarUrl: save.tutorProfile.user.avatarUrl,
          headline: save.tutorProfile.headline,
          hourlyRate: save.tutorProfile.hourlyRate,
          rating: save.tutorProfile.rating,
          subjects: save.tutorProfile.subjects.map(function(subj) {
            return subj.subject.nameEn;
          }),
          savedAt: save.createdAt
        };
      })
    });
  }).catch(function(err) {
    console.error('Get saved tutors error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get saved tutors'
    });
  });
});

router.post('/bookings/check-availability', requireAuth, function(req, res) {
  var tutorProfileId = req.body.tutorProfileId;
  var date = req.body.date;
  var startTime = req.body.startTime;
  var endTime = req.body.endTime;

  if (!tutorProfileId || !date || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      error: 'tutorProfileId, date, startTime, and endTime are required'
    });
  }

  BookingService.checkAvailability(tutorProfileId, date, startTime, endTime)
    .then(function(result) {
      res.json({
        success: true,
        available: result.available,
        reason: result.reason || null
      });
    })
    .catch(function(err) {
      console.error('Check availability error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability'
      });
    });
});

router.post('/bookings', requireAuth, function(req, res) {
  var userId = req.user.id;
  var data = req.body;

  if (!data.tutorProfileId || !data.scheduledDate || !data.startTime || !data.endTime || !data.lessonFormat) {
    return res.status(400).json({
      success: false,
      error: 'tutorProfileId, scheduledDate, startTime, endTime, and lessonFormat are required'
    });
  }

  var bookingData = {
    tutorProfileId: data.tutorProfileId,
    scheduledDate: data.scheduledDate,
    startTime: data.startTime,
    endTime: data.endTime,
    lessonFormat: data.lessonFormat,
    subjectId: data.subjectId || null,
    educationLevelId: data.educationLevelId || null,
    topicIds: data.topicIds || [],
    location: data.location || null,
    onlineMeetingUrl: data.onlineMeetingUrl || null,
    hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
    currency: data.currency || null,
    learningObjectives: data.learningObjectives || null,
    specialRequirements: data.specialRequirements || null
  };

  if (req.user.role === 'STUDENT') {
    prisma.studentProfile.findUnique({
      where: { userId: userId }
    }).then(function(studentProfile) {
      bookingData.studentUserId = userId;
      bookingData.studentProfileId = studentProfile ? studentProfile.id : null;
      return BookingService.createBooking(bookingData);
    }).then(function(booking) {
      res.json({
        success: true,
        message: 'Booking created successfully',
        booking: booking
      });
    }).catch(function(err) {
      console.error('Create booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to create booking'
      });
    });
  } else if (req.user.role === 'PARENT') {
    bookingData.studentUserId = data.studentUserId;
    bookingData.parentUserId = userId;
    BookingService.createBooking(bookingData)
      .then(function(booking) {
        res.json({
          success: true,
          message: 'Booking created successfully',
          booking: booking
        });
      })
      .catch(function(err) {
        console.error('Create booking error:', err);
        res.status(400).json({
          success: false,
          error: err.message || 'Failed to create booking'
        });
      });
  } else {
    return res.status(403).json({
      success: false,
      error: 'Only students and parents can create bookings'
    });
  }
});

router.get('/bookings', requireAuth, function(req, res) {
  var userId = req.user.id;
  var role = req.user.role;

  BookingService.getUserBookings(userId, role)
    .then(function(bookings) {
      res.json({
        success: true,
        bookings: bookings.map(function(booking) {
          return {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            scheduledDate: booking.scheduledDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            durationMinutes: booking.durationMinutes,
            lessonFormat: booking.lessonFormat,
            hourlyRate: booking.hourlyRate,
            totalAmount: booking.totalAmount,
            currency: booking.currency,
            tutorName: booking.tutorProfile.user.fullName,
            tutorAvatar: booking.tutorProfile.user.avatarUrl,
            studentName: booking.studentUser.fullName,
            subjectName: booking.subject ? booking.subject.nameEn : null,
            learningObjectives: booking.learningObjectives,
            location: booking.location,
            onlineMeetingUrl: booking.onlineMeetingUrl,
            createdAt: booking.createdAt
          };
        })
      });
    })
    .catch(function(err) {
      console.error('Get bookings error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get bookings'
      });
    });
});

router.get('/bookings/notifications', requireAuth, function(req, res) {
  var userId = req.user.id;

  prisma.bookingNotification.findMany({
    where: { userId: userId },
    include: {
      booking: {
        select: {
          bookingNumber: true,
          scheduledDate: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  }).then(function(notifications) {
    res.json({
      success: true,
      notifications: notifications
    });
  }).catch(function(err) {
    console.error('Get notifications error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  });
});

router.get('/bookings/:bookingId', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;

  BookingService.getBookingById(bookingId, userId)
    .then(function(booking) {
      res.json({
        success: true,
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this booking'
        });
      }
      if (err.message === 'Booking not found') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }
      console.error('Get booking error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get booking'
      });
    });
});

router.post('/bookings/:bookingId/accept', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;

  BookingService.acceptBooking(bookingId, userId)
    .then(function(booking) {
      res.json({
        success: true,
        message: 'Booking accepted',
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to accept this booking'
        });
      }
      console.error('Accept booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to accept booking'
      });
    });
});

router.post('/bookings/:bookingId/decline', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;
  var reason = req.body.reason || null;

  BookingService.declineBooking(bookingId, userId, reason)
    .then(function(booking) {
      res.json({
        success: true,
        message: 'Booking declined',
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to decline this booking'
        });
      }
      console.error('Decline booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to decline booking'
      });
    });
});

router.post('/bookings/:bookingId/cancel', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;
  var reason = req.body.reason || null;

  BookingService.cancelBooking(bookingId, userId, reason)
    .then(function(booking) {
      res.json({
        success: true,
        message: 'Booking cancelled',
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to cancel this booking'
        });
      }
      console.error('Cancel booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to cancel booking'
      });
    });
});

router.post('/bookings/:bookingId/complete', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;

  BookingService.completeBooking(bookingId, userId)
    .then(function(booking) {
      res.json({
        success: true,
        message: 'Booking completed',
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to complete this booking'
        });
      }
      console.error('Complete booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to complete booking'
      });
    });
});

router.post('/bookings/:bookingId/reschedule', requireAuth, function(req, res) {
  var userId = req.user.id;
  var bookingId = req.params.bookingId;
  var newDate = req.body.date;
  var newStartTime = req.body.startTime;
  var newEndTime = req.body.endTime;

  if (!newDate || !newStartTime || !newEndTime) {
    return res.status(400).json({
      success: false,
      error: 'date, startTime, and endTime are required'
    });
  }

  BookingService.rescheduleBooking(bookingId, userId, newDate, newStartTime, newEndTime)
    .then(function(booking) {
      res.json({
        success: true,
        message: 'Booking rescheduled',
        booking: booking
      });
    })
    .catch(function(err) {
      if (err.message === 'Unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to reschedule this booking'
        });
      }
      console.error('Reschedule booking error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to reschedule booking'
      });
    });
});

module.exports = router;
