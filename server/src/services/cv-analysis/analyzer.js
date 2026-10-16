var CVAnalyzer = {
  RUBRIC_VERSION: '1.0',
  MODEL_VERSION: 'ireme-cv-analyzer-1.0',

  calculateSubjectScore: function(subjectData, extractedData) {
    if (!subjectData || subjectData.count === 0) {
      return {
        score: 0,
        level: 'beginner',
        confidence: 0,
        evidence: []
      };
    }

    var score = 0;
    var evidence = [];
    var confidence = subjectData.confidence || 0;

    if (subjectData.count >= 10) {
      score = 90;
      evidence.push('Strong subject presence (' + subjectData.count + ' mentions)');
    } else if (subjectData.count >= 5) {
      score = 75;
      evidence.push('Good subject coverage (' + subjectData.count + ' mentions)');
    } else if (subjectData.count >= 2) {
      score = 60;
      evidence.push('Moderate subject references (' + subjectData.count + ' mentions)');
    } else {
      score = 40;
      evidence.push('Limited subject evidence (' + subjectData.count + ' mentions)');
    }

    if (extractedData.teachingExperience && extractedData.teachingExperience.length > 0) {
      var teachingMentions = extractedData.teachingExperience.filter(function(exp) {
        return exp.text.toLowerCase().indexOf(subjectData.terms[0]) !== -1;
      });
      
      if (teachingMentions.length > 0) {
        score = Math.min(score + 15, 100);
        confidence = Math.min(confidence + 0.2, 1.0);
        evidence.push('Teaching experience in subject documented');
      }
    }

    if (extractedData.education && extractedData.education.length > 0) {
      var educationMentions = extractedData.education.filter(function(edu) {
        return edu.text.toLowerCase().indexOf(subjectData.terms[0]) !== -1;
      });
      
      if (educationMentions.length > 0) {
        score = Math.min(score + 10, 100);
        confidence = Math.min(confidence + 0.15, 1.0);
        evidence.push('Educational background in subject');
      }
    }

    return {
      score: Math.round(score),
      level: this.getLevel(score),
      confidence: Math.round(confidence * 100) / 100,
      evidence: evidence
    };
  },

  calculateSkillScore: function(skillData) {
    if (!skillData || skillData.count === 0) {
      return {
        score: 0,
        level: 'beginner',
        confidence: 0,
        evidence: []
      };
    }

    var score = 0;
    var evidence = [];
    var confidence = skillData.confidence || 0;

    if (skillData.count >= 5) {
      score = 85;
      evidence.push('Strong skill emphasis (' + skillData.count + ' mentions)');
    } else if (skillData.count >= 3) {
      score = 70;
      evidence.push('Good skill demonstration (' + skillData.count + ' mentions)');
    } else if (skillData.count >= 1) {
      score = 55;
      evidence.push('Skill mentioned (' + skillData.count + ' time)');
    } else {
      score = 30;
      evidence.push('Minimal skill evidence');
    }

    return {
      score: Math.round(score),
      level: this.getLevel(score),
      confidence: Math.round(confidence * 100) / 100,
      evidence: evidence
    };
  },

  getLevel: function(score) {
    if (score >= 80) return 'advanced';
    if (score >= 60) return 'proficient';
    if (score >= 40) return 'developing';
    return 'beginner';
  },

  calculateOverallTeachingScore: function(extractedData) {
    var score = 0;
    var factors = [];

    if (extractedData.yearsOfExperience) {
      if (extractedData.yearsOfExperience >= 10) {
        score += 30;
        factors.push('Extensive experience (' + extractedData.yearsOfExperience + ' years)');
      } else if (extractedData.yearsOfExperience >= 5) {
        score += 20;
        factors.push('Solid experience (' + extractedData.yearsOfExperience + ' years)');
      } else if (extractedData.yearsOfExperience >= 2) {
        score += 10;
        factors.push('Some experience (' + extractedData.yearsOfExperience + ' years)');
      }
    }

    if (extractedData.teachingExperience && extractedData.teachingExperience.length > 0) {
      var expCount = extractedData.teachingExperience.length;
      if (expCount >= 10) {
        score += 25;
        factors.push('Extensive teaching documentation (' + expCount + ' entries)');
      } else if (expCount >= 5) {
        score += 15;
        factors.push('Good teaching documentation (' + expCount + ' entries)');
      } else if (expCount >= 2) {
        score += 8;
        factors.push('Some teaching evidence (' + expCount + ' entries)');
      }
    }

    if (extractedData.education && extractedData.education.length > 0) {
      var eduCount = extractedData.education.length;
      if (eduCount >= 3) {
        score += 20;
        factors.push('Strong educational background (' + eduCount + ' qualifications)');
      } else if (eduCount >= 1) {
        score += 10;
        factors.push('Educational qualifications present');
      }
    }

    var subjectCount = Object.keys(extractedData.subjects || {}).length;
    if (subjectCount >= 5) {
      score += 15;
      factors.push('Multi-subject expertise (' + subjectCount + ' subjects)');
    } else if (subjectCount >= 2) {
      score += 8;
      factors.push('Subject specialization (' + subjectCount + ' subjects)');
    }

    var skillCount = Object.keys(extractedData.skills || {}).length;
    if (skillCount >= 8) {
      score += 10;
      factors.push('Comprehensive skill set (' + skillCount + ' skills)');
    } else if (skillCount >= 4) {
      score += 5;
      factors.push('Good skill diversity (' + skillCount + ' skills)');
    }

    return {
      score: Math.min(score, 100),
      level: this.getLevel(score),
      factors: factors
    };
  },

  analyze: function(extractedData) {
    var subjectAssessments = {};
    var skillAssessments = {};

    for (var subject in extractedData.subjects) {
      subjectAssessments[subject] = this.calculateSubjectScore(
        extractedData.subjects[subject],
        extractedData
      );
    }

    for (var skill in extractedData.skills) {
      skillAssessments[skill] = this.calculateSkillScore(extractedData.skills[skill]);
    }

    var overallTeaching = this.calculateOverallTeachingScore(extractedData);

    return {
      subjects: subjectAssessments,
      skills: skillAssessments,
      overallTeaching: overallTeaching,
      rubricVersion: this.RUBRIC_VERSION,
      modelVersion: this.MODEL_VERSION,
      assessedAt: new Date().toISOString(),
      summary: {
        totalSubjects: Object.keys(subjectAssessments).length,
        totalSkills: Object.keys(skillAssessments).length,
        yearsOfExperience: extractedData.yearsOfExperience,
        educationCount: (extractedData.education || []).length,
        teachingExperienceCount: (extractedData.teachingExperience || []).length
      }
    };
  }
};

module.exports = CVAnalyzer;
