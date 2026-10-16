/**
 * IREME Curriculum Data Structure
 * Complete Rwandan Curriculum: Primary (P1-P6), Secondary (S1-S6), TTC, and TVET
 * 
 * Sources: REB, NESA, MINEDUC, TVET Authority
 * Last Updated: 2026-10-15
 * Status: Structure defined, data pending official verification
 */

var IremeCurriculum = {
  version: "1.0.0",
  lastUpdated: "2026-10-15",
  sources: {
    reb: "https://www.reb.gov.rw/",
    rebElearning: "https://elearning.reb.rw/",
    nesa: "https://www.nesa.gov.rw/",
    tvet: "https://tvetmanagement.rtb.gov.rw/curricula",
    mineduc: "https://www.mineduc.gov.rw/"
  },

  // Education Pathways
  pathways: {
    primary: {
      id: "primary",
      name: "Primary Education",
      nameRw: "Amashuri Abanza",
      levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
      description: "Basic education for children ages 6-12"
    },
    secondary: {
      id: "secondary",
      name: "Secondary Education",
      nameRw: "Amashuri Yisumbuye",
      levels: {
        ordinary: ["S1", "S2", "S3"],
        advanced: ["S4", "S5", "S6"]
      },
      description: "Secondary education with ordinary and advanced cycles"
    },
    ttc: {
      id: "ttc",
      name: "Teacher Training College",
      nameRw: "Ishuri Ry'Abigisha",
      years: ["Year 1", "Year 2", "Year 3"],
      programmes: [], // To be populated with official TTC programmes
      description: "Professional teacher training programmes"
    },
    tvet: {
      id: "tvet",
      name: "Technical and Vocational Education",
      nameRw: "Ubumenyi N'Ubukorikori",
      rqfLevels: ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
      programmes: [], // To be populated with official TVET programmes
      description: "Technical and vocational qualifications at RQF Levels 1-5"
    }
  },

  // Subject Catalogue
  subjects: {
    // Primary Subjects (P1-P6)
    primary: {
      mathematics: {
        code: "MAT",
        name: "Mathematics",
        nameRw: "Imibare",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      english: {
        code: "ENG",
        name: "English",
        nameRw: "Icyongereza",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      kinyarwanda: {
        code: "KIN",
        name: "Kinyarwanda",
        nameRw: "Ikinyarwanda",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      science: {
        code: "SCI",
        name: "Science",
        nameRw: "Ubumenyi",
        levels: ["P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework",
        note: "Introduced at P4; P1-P3 use integrated Basic Activities"
      },
      socialStudies: {
        code: "SST",
        name: "Social Studies",
        nameRw: "Imibereho Y'abantu",
        levels: ["P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework",
        note: "Introduced at P4; P1-P3 use integrated Basic Activities"
      },
      french: {
        code: "FRE",
        name: "French",
        nameRw: "Igifaransa",
        levels: ["P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      religiousEducation: {
        code: "RED",
        name: "Religious Education",
        nameRw: "Uburezi Bukomoka Ku Myemerere",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      physicalEducation: {
        code: "PED",
        name: "Physical Education",
        nameRw: "Imyitozo Ngororamubiri",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      },
      creativeArts: {
        code: "ART",
        name: "Creative Arts",
        nameRw: "Ubuhanzi",
        levels: ["P1", "P2", "P3", "P4", "P5", "P6"],
        status: "verified",
        source: "REB Primary Curriculum Framework"
      }
    },

    // Secondary Subjects (S1-S6)
    secondary: {
      // Compulsory subjects
      mathematics: {
        code: "MAT",
        name: "Mathematics",
        nameRw: "Imibare",
        levels: ["S1", "S2", "S3", "S4", "S5", "S6"],
        compulsory: true,
        status: "verified",
        source: "REB Secondary Curriculum Framework"
      },
      english: {
        code: "ENG",
        name: "English",
        nameRw: "Icyongereza",
        levels: ["S1", "S2", "S3", "S4", "S5", "S6"],
        compulsory: true,
        status: "verified",
        source: "REB Secondary Curriculum Framework"
      },
      kinyarwanda: {
        code: "KIN",
        name: "Kinyarwanda",
        nameRw: "Ikinyarwanda",
        levels: ["S1", "S2", "S3"],
        compulsory: true,
        status: "verified",
        source: "REB Secondary Curriculum Framework",
        note: "Compulsory in Ordinary Level"
      },
      french: {
        code: "FRE",
        name: "French",
        nameRw: "Igifaransa",
        levels: ["S1", "S2", "S3", "S4", "S5", "S6"],
        compulsory: true,
        status: "verified",
        source: "REB Secondary Curriculum Framework"
      },
      
      // Sciences
      physics: {
        code: "PHY",
        name: "Physics",
        nameRw: "Fiziki",
        levels: ["S4", "S5", "S6"],
        combinations: ["PCM", "MEP"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      chemistry: {
        code: "CHE",
        name: "Chemistry",
        nameRw: "Shimi",
        levels: ["S4", "S5", "S6"],
        combinations: ["PCM", "MCB"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      biology: {
        code: "BIO",
        name: "Biology",
        nameRw: "Biyoloji",
        levels: ["S4", "S5", "S6"],
        combinations: ["MCB", "MGB"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      geography: {
        code: "GEO",
        name: "Geography",
        nameRw: "Geografi",
        levels: ["S4", "S5", "S6"],
        combinations: ["GEO", "HGE"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      history: {
        code: "HIS",
        name: "History",
        nameRw: "Amateka",
        levels: ["S4", "S5", "S6"],
        combinations: ["HGE", "HEL"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      economics: {
        code: "ECO",
        name: "Economics",
        nameRw: "Ubukungu",
        levels: ["S4", "S5", "S6"],
        combinations: ["MEC", "GEO"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      entrepreneurship: {
        code: "ENT",
        name: "Entrepreneurship",
        nameRw: "Ubucuruzi",
        levels: ["S4", "S5", "S6"],
        combinations: ["MEC", "HEL"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },
      computerScience: {
        code: "COM",
        name: "Computer Science",
        nameRw: "Ikoranabuhanga",
        levels: ["S4", "S5", "S6"],
        combinations: ["PCM", "MEP"],
        status: "verified",
        source: "REB Advanced Level Curriculum"
      },

      // Ordinary Level integrated science
      integratedScience: {
        code: "ISC",
        name: "Integrated Science",
        nameRw: "Ubumenyi Rusange",
        levels: ["S1", "S2", "S3"],
        status: "verified",
        source: "REB Ordinary Level Curriculum"
      },
      socialStudies: {
        code: "SST",
        name: "Social Studies",
        nameRw: "Imibereho Y'abantu",
        levels: ["S1", "S2", "S3"],
        status: "verified",
        source: "REB Ordinary Level Curriculum"
      }
    },

    // TTC Programmes (To be verified with official sources)
    ttc: {
      // Programmes to be populated after verification
      earlyChildhood: {
        code: "ECE",
        name: "Early Childhood Education",
        nameRw: "Uburezi Bw'Imfura",
        years: ["Year 1", "Year 2", "Year 3"],
        status: "pending_verification",
        source: "TBD - Requires official TTC curriculum documents"
      },
      primaryTeaching: {
        code: "PRT",
        name: "Primary Teacher Training",
        nameRw: "Amahugurwa Y'Abigisha B'amashuri Abanza",
        years: ["Year 1", "Year 2", "Year 3"],
        status: "pending_verification",
        source: "TBD - Requires official TTC curriculum documents"
      }
    },

    // TVET Programmes (To be verified with official sources)
    tvet: {
      // Programmes to be populated after verification from TVET Authority
      construction: {
        code: "CON",
        name: "Construction",
        nameRw: "Ubwubatsi",
        rqfLevels: ["Level 1", "Level 2", "Level 3", "Level 4"],
        status: "pending_verification",
        source: "TBD - Requires official TVET curriculum documents"
      },
      electricity: {
        code: "ELE",
        name: "Electrical Engineering",
        nameRw: "Amashanyarazi",
        rqfLevels: ["Level 1", "Level 2", "Level 3", "Level 4"],
        status: "pending_verification",
        source: "TBD - Requires official TVET curriculum documents"
      },
      agriculture: {
        code: "AGR",
        name: "Agriculture",
        nameRw: "Ubuhinzi",
        rqfLevels: ["Level 1", "Level 2", "Level 3", "Level 4"],
        status: "pending_verification",
        source: "TBD - Requires official TVET curriculum documents"
      }
    }
  },

  // Secondary Combinations (S4-S6)
  combinations: {
    PCM: {
      code: "PCM",
      name: "Physics, Chemistry, Mathematics",
      subjects: ["physics", "chemistry", "mathematics"],
      status: "verified"
    },
    MCB: {
      code: "MCB",
      name: "Mathematics, Chemistry, Biology",
      subjects: ["mathematics", "chemistry", "biology"],
      status: "verified"
    },
    MGB: {
      code: "MGB",
      name: "Mathematics, Geography, Biology",
      subjects: ["mathematics", "geography", "biology"],
      status: "verified"
    },
    MEP: {
      code: "MEP",
      name: "Mathematics, Economics, Physics",
      subjects: ["mathematics", "economics", "physics"],
      status: "verified"
    },
    MEC: {
      code: "MEC",
      name: "Mathematics, Economics, Computer Science",
      subjects: ["mathematics", "economics", "computerScience"],
      status: "verified"
    },
    GEO: {
      code: "GEO",
      name: "Geography, Economics, Entrepreneurship",
      subjects: ["geography", "economics", "entrepreneurship"],
      status: "verified"
    },
    HGE: {
      code: "HGE",
      name: "History, Geography, Economics",
      subjects: ["history", "geography", "economics"],
      status: "verified"
    },
    HEL: {
      code: "HEL",
      name: "History, Economics, Literature",
      subjects: ["history", "economics", "entrepreneurship"],
      status: "verified"
    }
  },

  // Helper Functions
  getSubjectsForLevel: function(pathway, level) {
    if (!this.subjects[pathway]) return [];
    
    var subjects = [];
    for (var key in this.subjects[pathway]) {
      var subject = this.subjects[pathway][key];
      if (subject.levels && subject.levels.indexOf(level) !== -1) {
        subjects.push({
          key: key,
          code: subject.code,
          name: subject.name,
          nameRw: subject.nameRw
        });
      }
    }
    return subjects;
  },

  getSubjectByCode: function(code) {
    for (var pathway in this.subjects) {
      for (var key in this.subjects[pathway]) {
        if (this.subjects[pathway][key].code === code) {
          return this.subjects[pathway][key];
        }
      }
    }
    return null;
  },

  getPathwayLevels: function(pathway) {
    if (!this.pathways[pathway]) return [];
    var p = this.pathways[pathway];
    if (Array.isArray(p.levels)) return p.levels;
    if (p.years) return p.years;
    if (p.rqfLevels) return p.rqfLevels;
    return [];
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IremeCurriculum;
}
