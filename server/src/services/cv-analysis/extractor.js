var CVExtractor = {
  educationKeywords: [
    'bachelor', 'master', 'phd', 'doctorate', 'degree', 'diploma', 'certificate',
    'university', 'college', 'institute', 'education', 'graduated', 'studied',
    'licence', 'mastère', 'doctorat', 'uburezi', 'ikirenga', 'amategeko'
  ],

  teachingKeywords: [
    'teacher', 'teaching', 'educator', 'instructor', 'tutor', 'lecturer',
    'professor', 'taught', 'teaches', 'classroom', 'students', 'pupils',
    'mwarimu', 'kwigisha', 'ishuri', 'abanyeshuri'
  ],

  subjectPatterns: {
    mathematics: ['math', 'mathematics', 'algebra', 'geometry', 'calculus', 'trigonometry', 'imatamatiki'],
    physics: ['physics', 'fisiki', 'mechanics', 'thermodynamics'],
    chemistry: ['chemistry', 'shimi', 'organic', 'inorganic', 'chemical'],
    biology: ['biology', 'bioloji', 'life science', 'ecology', 'genetics'],
    english: ['english', 'icyongereza', 'literature', 'grammar', 'writing'],
    french: ['french', 'igifaransa', 'français', 'littérature'],
    kinyarwanda: ['kinyarwanda', 'ikinayrwanda', 'ikirere', 'imvugo'],
    history: ['history', 'amateka', 'historical', 'civilization'],
    geography: ['geography', 'geografi', 'geographic', 'cartography'],
    economics: ['economics', 'ubukungu', 'economy', 'finance', 'business'],
    computer_science: ['computer', 'computing', 'ict', 'programming', 'software', 'informatique'],
    agriculture: ['agriculture', 'ubuhinzi', 'farming', 'agronomy'],
    entrepreneurship: ['entrepreneurship', 'ubucuruzi', 'business studies', 'enterprise']
  },

  levelPatterns: {
    primary: ['primary', 'elementary', 'primaire', 'amashuri abanza'],
    lower_secondary: ['o level', 'ordinary level', 'secondary', 'cycle inférieur', 'icyiciro cya mbere'],
    upper_secondary: ['a level', 'advanced level', 'senior secondary', 'cycle supérieur', 'icyiciro cya kabiri'],
    tvet: ['tvet', 'vocational', 'technical', 'forme technique'],
    ttc: ['ttc', 'teacher training', 'education college']
  },

  skillKeywords: [
    'communication', 'leadership', 'teamwork', 'problem-solving', 'critical thinking',
    'classroom management', 'lesson planning', 'assessment', 'evaluation',
    'curriculum development', 'student engagement', 'differentiated instruction',
    'technology', 'digital literacy', 'ict skills'
  ],

  extractEducation: function(text) {
    var education = [];
    var lines = text.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].toLowerCase();
      var hasEducationKeyword = this.educationKeywords.some(function(keyword) {
        return line.indexOf(keyword) !== -1;
      });
      
      if (hasEducationKeyword && line.length > 10 && line.length < 200) {
        education.push({
          text: lines[i].trim(),
          confidence: this.calculateConfidence(line, this.educationKeywords)
        });
      }
    }
    
    return education.slice(0, 10);
  },

  extractTeachingExperience: function(text) {
    var experience = [];
    var lines = text.split('\n');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].toLowerCase();
      var hasTeachingKeyword = this.teachingKeywords.some(function(keyword) {
        return line.indexOf(keyword) !== -1;
      });
      
      if (hasTeachingKeyword && line.length > 10 && line.length < 300) {
        experience.push({
          text: lines[i].trim(),
          confidence: this.calculateConfidence(line, this.teachingKeywords)
        });
      }
    }
    
    return experience.slice(0, 15);
  },

  extractSubjects: function(text) {
    var subjects = {};
    var lowerText = text.toLowerCase();
    
    for (var subject in this.subjectPatterns) {
      var patterns = this.subjectPatterns[subject];
      var matchCount = 0;
      var matchedTerms = [];
      
      for (var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        var regex = new RegExp('\\b' + pattern + '\\b', 'gi');
        var matches = lowerText.match(regex);
        if (matches) {
          matchCount += matches.length;
          matchedTerms.push(pattern);
        }
      }
      
      if (matchCount > 0) {
        subjects[subject] = {
          count: matchCount,
          terms: matchedTerms,
          confidence: Math.min(matchCount / 5, 1.0)
        };
      }
    }
    
    return subjects;
  },

  extractLevels: function(text) {
    var levels = {};
    var lowerText = text.toLowerCase();
    
    for (var level in this.levelPatterns) {
      var patterns = this.levelPatterns[level];
      var matchCount = 0;
      
      for (var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        var regex = new RegExp('\\b' + pattern + '\\b', 'gi');
        var matches = lowerText.match(regex);
        if (matches) {
          matchCount += matches.length;
        }
      }
      
      if (matchCount > 0) {
        levels[level] = {
          count: matchCount,
          confidence: Math.min(matchCount / 3, 1.0)
        };
      }
    }
    
    return levels;
  },

  extractSkills: function(text) {
    var skills = {};
    var lowerText = text.toLowerCase();
    
    for (var i = 0; i < this.skillKeywords.length; i++) {
      var skill = this.skillKeywords[i];
      var regex = new RegExp('\\b' + skill + '\\b', 'gi');
      var matches = lowerText.match(regex);
      
      if (matches) {
        skills[skill] = {
          count: matches.length,
          confidence: Math.min(matches.length / 3, 1.0)
        };
      }
    }
    
    return skills;
  },

  extractYearsOfExperience: function(text) {
    var patterns = [
      /(\d+)\+?\s*years?\s*(of)?\s*(teaching|experience)/gi,
      /experience\s*:\s*(\d+)\+?\s*years?/gi,
      /teaching\s*(for)?\s*(\d+)\s*years?/gi
    ];
    
    for (var i = 0; i < patterns.length; i++) {
      var match = patterns[i].exec(text);
      if (match) {
        return parseInt(match[1]) || parseInt(match[2]);
      }
    }
    
    return null;
  },

  calculateConfidence: function(text, keywords) {
    var matchCount = 0;
    var lowerText = text.toLowerCase();
    
    for (var i = 0; i < keywords.length; i++) {
      if (lowerText.indexOf(keywords[i]) !== -1) {
        matchCount++;
      }
    }
    
    return Math.min(matchCount / 3, 1.0);
  },

  extractAll: function(text) {
    return {
      education: this.extractEducation(text),
      teachingExperience: this.extractTeachingExperience(text),
      subjects: this.extractSubjects(text),
      levels: this.extractLevels(text),
      skills: this.extractSkills(text),
      yearsOfExperience: this.extractYearsOfExperience(text),
      rawText: text,
      wordCount: text.split(/\s+/).length
    };
  }
};

module.exports = CVExtractor;
