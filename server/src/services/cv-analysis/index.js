var fs = require('fs');
var path = require('path');
var CVParser = require('./parser');
var CVExtractor = require('./extractor');
var CVAnalyzer = require('./analyzer');
var { PrismaClient } = require('@prisma/client');

var prisma = new PrismaClient();

var CVAnalysisService = {
  analyzeCV: function(tutorProfileId, cvFilePath) {
    var self = this;
    
    return CVParser.parse(cvFilePath)
      .then(function(parseResult) {
        var extractedData = CVExtractor.extractAll(parseResult.text);
        var analysis = CVAnalyzer.analyze(extractedData);
        
        return self.saveAnalysis(tutorProfileId, analysis, extractedData);
      })
      .then(function(savedAnalysis) {
        return self.updateTutorProfile(tutorProfileId, savedAnalysis);
      })
      .then(function(updatedProfile) {
        return {
          success: true,
          profile: updatedProfile,
          analysis: updatedProfile.skillAssessments
        };
      })
      .catch(function(err) {
        console.error('CV analysis error:', err);
        return {
          success: false,
          error: err.message
        };
      });
  },

  saveAnalysis: function(tutorProfileId, analysis, extractedData) {
    var assessments = [];

    for (var subject in analysis.subjects) {
      var subjectAssessment = analysis.subjects[subject];
      assessments.push(
        prisma.tutorSkillAssessment.upsert({
          where: {
            tutorProfileId_skillName: {
              tutorProfileId: tutorProfileId,
              skillName: subject
            }
          },
          create: {
            tutorProfileId: tutorProfileId,
            skillName: subject,
            skillCategory: 'subject',
            score: subjectAssessment.score,
            level: subjectAssessment.level,
            confidence: subjectAssessment.confidence,
            evidence: subjectAssessment.evidence,
            rubricVersion: analysis.rubricVersion,
            modelVersion: analysis.modelVersion,
            assessedAt: new Date(analysis.assessedAt)
          },
          update: {
            score: subjectAssessment.score,
            level: subjectAssessment.level,
            confidence: subjectAssessment.confidence,
            evidence: subjectAssessment.evidence,
            rubricVersion: analysis.rubricVersion,
            modelVersion: analysis.modelVersion,
            assessedAt: new Date(analysis.assessedAt)
          }
        })
      );
    }

    for (var skill in analysis.skills) {
      var skillAssessment = analysis.skills[skill];
      assessments.push(
        prisma.tutorSkillAssessment.upsert({
          where: {
            tutorProfileId_skillName: {
              tutorProfileId: tutorProfileId,
              skillName: skill
            }
          },
          create: {
            tutorProfileId: tutorProfileId,
            skillName: skill,
            skillCategory: this.categorizeSkill(skill),
            score: skillAssessment.score,
            level: skillAssessment.level,
            confidence: skillAssessment.confidence,
            evidence: skillAssessment.evidence,
            rubricVersion: analysis.rubricVersion,
            modelVersion: analysis.modelVersion,
            assessedAt: new Date(analysis.assessedAt)
          },
          update: {
            score: skillAssessment.score,
            level: skillAssessment.level,
            confidence: skillAssessment.confidence,
            evidence: skillAssessment.evidence,
            rubricVersion: analysis.rubricVersion,
            modelVersion: analysis.modelVersion,
            assessedAt: new Date(analysis.assessedAt)
          }
        })
      );
    }

    return Promise.all(assessments).then(function(results) {
      return {
        assessments: results,
        analysis: analysis,
        extractedData: {
          education: extractedData.education,
          teachingExperience: extractedData.teachingExperience,
          subjects: Object.keys(extractedData.subjects),
          levels: Object.keys(extractedData.levels),
          skills: Object.keys(extractedData.skills),
          yearsOfExperience: extractedData.yearsOfExperience,
          wordCount: extractedData.wordCount
        }
      };
    });
  },

  categorizeSkill: function(skill) {
    var pedagogySkills = ['classroom management', 'lesson planning', 'assessment', 'evaluation', 
                          'curriculum development', 'student engagement', 'differentiated instruction'];
    var softSkills = ['communication', 'leadership', 'teamwork', 'problem-solving', 'critical thinking'];
    var techSkills = ['technology', 'digital literacy', 'ict skills'];

    if (pedagogySkills.indexOf(skill) !== -1) return 'pedagogy';
    if (softSkills.indexOf(skill) !== -1) return 'communication';
    if (techSkills.indexOf(skill) !== -1) return 'technology';
    return 'other';
  },

  updateTutorProfile: function(tutorProfileId, savedAnalysis) {
    return prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: {
        cvAnalyzedAt: new Date(),
        cvAnalysisVersion: savedAnalysis.analysis.modelVersion
      },
      include: {
        skillAssessments: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });
  },

  getAnalysis: function(tutorProfileId) {
    return prisma.tutorSkillAssessment.findMany({
      where: { tutorProfileId: tutorProfileId },
      orderBy: { score: 'desc' }
    }).then(function(assessments) {
      return {
        success: true,
        assessments: assessments
      };
    }).catch(function(err) {
      console.error('Get analysis error:', err);
      return {
        success: false,
        error: err.message
      };
    });
  },

  getSubjectAssessments: function(tutorProfileId) {
    return prisma.tutorSkillAssessment.findMany({
      where: {
        tutorProfileId: tutorProfileId,
        skillCategory: 'subject'
      },
      orderBy: { score: 'desc' }
    });
  },

  getSkillAssessments: function(tutorProfileId) {
    return prisma.tutorSkillAssessment.findMany({
      where: {
        tutorProfileId: tutorProfileId,
        skillCategory: { not: 'subject' }
      },
      orderBy: { score: 'desc' }
    });
  }
};

module.exports = CVAnalysisService;
