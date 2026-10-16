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

module.exports = router;
