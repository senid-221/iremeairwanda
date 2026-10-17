/**
 * Educational Resources data - Framework for real books and learning materials
 * 
 * IMPORTANT: This is a framework for adding REAL educational resources.
 * Only add books with proper licensing (Open Educational Resources, Creative Commons,
 * public domain, or with explicit permission from copyright holders).
 * 
 * For Rwanda curriculum, refer to:
 * - Rwanda Education Board (REB) official materials
 * - Open Educational Resources (OER)
 * - Creative Commons licensed textbooks
 * - Public domain educational materials
 */

var educationalResources = [
  // === OPEN EDUCATIONAL RESOURCES (OER) ===
  // These are examples of the TYPE of content that should be added.
  // Only add resources with proper licensing and verification.
  
  /*
  {
    id: 'reb-math-p5-2024',
    title: 'Mathematics P5 Student Textbook',
    titleRw: 'Igitabo cy\'Imibare P5',
    subject: 'Mathematics',
    subjectCode: 'MATH',
    level: 'Primary 5',
    levelCode: 'P5',
    type: 'textbook',
    author: 'Rwanda Education Board',
    publisher: 'REB',
    year: 2024,
    license: 'OER - Open Educational Resource',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    language: ['en', 'rw'],
    format: 'pdf',
    url: 'https://reb.gov.rw/... (official REB URL)',
    coverImage: 'img/resources/reb-math-p5.jpg',
    description: 'Official Mathematics textbook for Primary 5, aligned with Rwanda competence-based curriculum',
    descriptionRw: 'Igitabo cy\'imibare cy\'abanyeshuri ba P5, gihuza na gahunda y\'ubumenyi bushingiye ku bushobozi',
    fileSize: '15.2 MB',
    pages: 240,
    isbn: '978-99946-...',
    tags: ['mathematics', 'primary', 'p5', 'textbook', 'reb'],
    verified: true,
    verifiedBy: 'REB',
    verifiedAt: '2024-01-15',
    downloadCount: 0,
    isActive: true
  },
  */
  
  // Add more verified, properly licensed resources here
];

/**
 * Get all active educational resources
 */
function getAllResources() {
  return educationalResources.filter(function(r) { return r.isActive; });
}

/**
 * Get resources by category
 */
function getResourcesByCategory(category) {
  return educationalResources.filter(function(r) {
    return r.isActive && r.type === category;
  });
}

/**
 * Get resources by subject
 */
function getResourcesBySubject(subjectCode) {
  return educationalResources.filter(function(r) {
    return r.isActive && r.subjectCode === subjectCode;
  });
}

/**
 * Get resources by level
 */
function getResourcesByLevel(levelCode) {
  return educationalResources.filter(function(r) {
    return r.isActive && r.levelCode === levelCode;
  });
}

/**
 * Search resources
 */
function searchResources(query) {
  var q = query.toLowerCase();
  return educationalResources.filter(function(r) {
    if (!r.isActive) return false;
    return r.title.toLowerCase().indexOf(q) !== -1 ||
           (r.titleRw && r.titleRw.toLowerCase().indexOf(q) !== -1) ||
           r.subject.toLowerCase().indexOf(q) !== -1 ||
           (r.description && r.description.toLowerCase().indexOf(q) !== -1) ||
           (r.author && r.author.toLowerCase().indexOf(q) !== -1);
  });
}

/**
 * Increment download count
 */
function incrementDownloadCount(resourceId) {
  var resource = educationalResources.find(function(r) { return r.id === resourceId; });
  if (resource) {
    resource.downloadCount = (resource.downloadCount || 0) + 1;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    educationalResources: educationalResources,
    getAllResources: getAllResources,
    getResourcesByCategory: getResourcesByCategory,
    getResourcesBySubject: getResourcesBySubject,
    getResourcesByLevel: getResourcesByLevel,
    searchResources: searchResources,
    incrementDownloadCount: incrementDownloadCount
  };
}
