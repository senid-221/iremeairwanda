var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var RecommendationEngine = {
  findRecommendedTutors: function(criteria) {
    var self = this;
    
    return this.findMatchingTutors(criteria)
      .then(function(tutors) {
        return tutors.map(function(tutor) {
          var matchScore = self.calculateMatchScore(tutor, criteria);
          return {
            tutor: tutor,
            matchScore: matchScore.score,
            matchPercentage: Math.round(matchScore.score),
            matchReasons: matchScore.reasons,
            subjectScores: self.getSubjectMatchScores(tutor, criteria.subjectIds),
            availabilityScore: self.getAvailabilityScore(tutor, criteria),
            locationScore: self.getLocationScore(tutor, criteria)
          };
        });
      })
      .then(function(results) {
        results.sort(function(a, b) {
          return b.matchScore - a.matchScore;
        });
        
        return results;
      });
  },

  findMatchingTutors: function(criteria) {
    var where = {
      isAvailable: true,
      profileApproved: true,
      verificationStatus: { in: ['verified', 'pending'] }
    };

    if (criteria.subjectIds && criteria.subjectIds.length > 0) {
      where.subjects = {
        some: {
          subjectId: { in: criteria.subjectIds }
        }
      };
    }

    if (criteria.lessonFormat) {
      where.lessonFormats = {
        has: criteria.lessonFormat
      };
    }

    if (criteria.maxHourlyRate) {
      where.hourlyRate = {
        lte: parseFloat(criteria.maxHourlyRate),
        not: null
      };
    }

    return prisma.tutorProfile.findMany({
      where: where,
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
          where: criteria.subjectIds ? {
            subjectId: { in: criteria.subjectIds }
          } : {},
          include: {
            subject: true,
            educationLevel: true
          }
        },
        serviceAreas: true,
        skillAssessments: {
          where: {
            skillCategory: 'subject'
          }
        },
        availability: true,
        reviews: {
          select: {
            rating: true
          }
        }
      },
      take: 50
    });
  },

  calculateMatchScore: function(tutor, criteria) {
    var score = 0;
    var reasons = [];

    var subjectScore = this.getSubjectMatchScore(tutor, criteria);
    score += subjectScore * 0.40;
    if (subjectScore > 70) {
      reasons.push('Strong subject expertise');
    } else if (subjectScore > 50) {
      reasons.push('Good subject knowledge');
    }

    var locationScore = this.getLocationScore(tutor, criteria);
    score += locationScore * 0.20;
    if (locationScore > 70) {
      reasons.push('Serves your area');
    } else if (locationScore > 50) {
      reasons.push('Location match');
    }

    var availabilityScore = this.getAvailabilityScore(tutor, criteria);
    score += availabilityScore * 0.15;
    if (availabilityScore > 70) {
      reasons.push('Available when you need');
    }

    var skillScore = this.getSkillScore(tutor, criteria);
    score += skillScore * 0.15;
    if (skillScore > 70) {
      reasons.push('Highly skilled');
    }

    var ratingScore = this.getRatingScore(tutor);
    score += ratingScore * 0.10;
    if (ratingScore > 70) {
      reasons.push('Well-rated by students');
    }

    if (tutor.verificationStatus === 'verified') {
      score += 5;
      reasons.push('Verified tutor');
    }

    if (tutor.cvAnalyzedAt) {
      score += 3;
      reasons.push('CV analyzed');
    }

    return {
      score: Math.min(score, 100),
      reasons: reasons
    };
  },

  getSubjectMatchScore: function(tutor, criteria) {
    if (!criteria.subjectIds || criteria.subjectIds.length === 0) {
      return 50;
    }

    var matchingSubjects = tutor.subjects.filter(function(subj) {
      return criteria.subjectIds.indexOf(subj.subjectId) !== -1;
    });

    if (matchingSubjects.length === 0) {
      return 0;
    }

    var totalScore = 0;
    matchingSubjects.forEach(function(subj) {
      var assessment = tutor.skillAssessments.find(function(a) {
        return a.skillName === subj.subject.code || a.skillName === subj.subject.nameEn.toLowerCase();
      });

      if (assessment) {
        totalScore += assessment.score;
      } else {
        totalScore += 50;
      }
    });

    return totalScore / matchingSubjects.length;
  },

  getSubjectMatchScores: function(tutor, subjectIds) {
    if (!subjectIds || subjectIds.length === 0) {
      return {};
    }

    var scores = {};
    tutor.subjects.forEach(function(subj) {
      if (subjectIds.indexOf(subj.subjectId) !== -1) {
        var assessment = tutor.skillAssessments.find(function(a) {
          return a.skillName === subj.subject.code || a.skillName === subj.subject.nameEn.toLowerCase();
        });

        scores[subj.subjectId] = {
          subjectName: subj.subject.nameEn,
          score: assessment ? assessment.score : 50,
          level: assessment ? assessment.level : 'developing',
          confidence: assessment ? assessment.confidence : 0.5
        };
      }
    });

    return scores;
  },

  getLocationScore: function(tutor, criteria) {
    if (!criteria.province && !criteria.district) {
      return 70;
    }

    if (criteria.lessonFormat === 'ONLINE' && tutor.lessonFormats.indexOf('ONLINE') !== -1) {
      return 90;
    }

    var matchingAreas = tutor.serviceAreas.filter(function(area) {
      if (criteria.village && area.village === criteria.village) return true;
      if (criteria.cell && area.cell === criteria.cell) return true;
      if (criteria.sector && area.sector === criteria.sector) return true;
      if (criteria.district && area.district === criteria.district) return true;
      if (criteria.province && area.province === criteria.province) return true;
      return false;
    });

    if (matchingAreas.length === 0) {
      return 20;
    }

    var bestMatch = matchingAreas[0];
    if (bestMatch.village && criteria.village && bestMatch.village === criteria.village) {
      return 100;
    }
    if (bestMatch.cell && criteria.cell && bestMatch.cell === criteria.cell) {
      return 85;
    }
    if (bestMatch.sector && criteria.sector && bestMatch.sector === criteria.sector) {
      return 70;
    }
    if (bestMatch.district && criteria.district && bestMatch.district === criteria.district) {
      return 60;
    }
    if (bestMatch.province && criteria.province && bestMatch.province === criteria.province) {
      return 50;
    }

    return 30;
  },

  getAvailabilityScore: function(tutor, criteria) {
    if (!criteria.preferredDays || criteria.preferredDays.length === 0) {
      return 70;
    }

    var matchingSlots = tutor.availability.filter(function(slot) {
      return criteria.preferredDays.indexOf(slot.dayOfWeek) !== -1;
    });

    if (matchingSlots.length === 0) {
      return 20;
    }

    var score = Math.min(matchingSlots.length * 20, 100);
    return score;
  },

  getSkillScore: function(tutor, criteria) {
    if (tutor.skillAssessments.length === 0) {
      return 50;
    }

    var totalScore = 0;
    tutor.skillAssessments.forEach(function(assessment) {
      totalScore += assessment.score;
    });

    return totalScore / tutor.skillAssessments.length;
  },

  getRatingScore: function(tutor) {
    if (!tutor.reviews || tutor.reviews.length === 0) {
      return 50;
    }

    var totalRating = 0;
    tutor.reviews.forEach(function(review) {
      totalRating += review.rating;
    });

    var avgRating = totalRating / tutor.reviews.length;
    return (avgRating / 5) * 100;
  },

  getTutorPublicProfile: function(tutorId) {
    return prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            gender: true
          }
        },
        subjects: {
          include: {
            subject: true,
            educationLevel: true
          }
        },
        serviceAreas: {
          include: {
            provinceRef: true,
            districtRef: true,
            sectorRef: true
          }
        },
        skillAssessments: {
          orderBy: { score: 'desc' }
        },
        availability: {
          orderBy: { dayOfWeek: 'asc' }
        },
        reviews: {
          where: {
            isAdminFlagged: false
          },
          include: {
            reviewerUser: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    }).then(function(profile) {
      if (!profile) {
        return null;
      }

      return {
        id: profile.id,
        name: profile.user.fullName,
        avatarUrl: profile.user.avatarUrl,
        gender: profile.user.gender,
        headline: profile.headline,
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        currency: profile.currency,
        experienceYears: profile.experienceYears,
        teachingPhilosophy: profile.teachingPhilosophy,
        languages: profile.languages,
        lessonFormats: profile.lessonFormats,
        isAvailable: profile.isAvailable,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        verificationStatus: profile.verificationStatus,
        subjects: profile.subjects.map(function(subj) {
          return {
            subject: subj.subject,
            educationLevel: subj.educationLevel,
            proficiencyLevel: subj.proficiencyLevel,
            aiScore: subj.aiScore
          };
        }),
        serviceAreas: profile.serviceAreas.map(function(area) {
          return {
            province: area.provinceRef ? area.provinceRef.nameEn : area.province,
            district: area.districtRef ? area.districtRef.nameEn : area.district,
            sector: area.sectorRef ? area.sectorRef.nameEn : area.sector,
            servesOnline: area.servesOnline
          };
        }),
        skillAssessments: profile.skillAssessments.map(function(assessment) {
          return {
            skillName: assessment.skillName,
            skillCategory: assessment.skillCategory,
            score: assessment.score,
            level: assessment.level,
            confidence: assessment.confidence
          };
        }),
        availability: profile.availability.map(function(slot) {
          return {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring
          };
        }),
        reviews: profile.reviews.map(function(review) {
          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            reviewerName: review.reviewerUser.fullName,
            createdAt: review.createdAt,
            punctuality: review.punctuality,
            professionalism: review.professionalism,
            knowledge: review.knowledge,
            communication: review.communication
          };
        })
      };
    });
  }
};

module.exports = RecommendationEngine;
