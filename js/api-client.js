/**
 * IREME API Client
 * Centralized HTTP client for backend communication
 */
var IremeAPI = (function() {
  var BASE_URL = (typeof window !== 'undefined' && window.IREME_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) ||
    '';

  var REQUEST_TIMEOUT = 15000;

  function request(method, path, options) {
    options = options || {};
    var url = BASE_URL + path;
    var fetchOptions = {
      method: method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    if (options.headers) {
      Object.keys(options.headers).forEach(function(key) {
        fetchOptions.headers[key] = options.headers[key];
      });
    }

    var controller = null;
    var timeoutId = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timeoutId = setTimeout(function() {
        controller.abort();
      }, REQUEST_TIMEOUT);
    }

    return fetch(url, fetchOptions).then(function(response) {
      if (timeoutId) clearTimeout(timeoutId);
      var contentType = response.headers.get('content-type') || '';
      if (contentType.indexOf('application/json') === -1) {
        if (!response.ok) {
          var err = new Error('Server error (' + response.status + ')');
          err.status = response.status;
          return Promise.reject(err);
        }
        return {};
      }
      return response.json().then(function(data) {
        if (!response.ok) {
          var error = new Error(data.error || 'Request failed');
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      });
    }).catch(function(err) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        var timeoutErr = new Error('Request timed out. Please check your connection and try again.');
        timeoutErr.status = 0;
        timeoutErr.timeout = true;
        return Promise.reject(timeoutErr);
      }
      if (err.status) return Promise.reject(err);
      var networkErr = new Error('Cannot connect to server. Please check your internet connection.');
      networkErr.status = 0;
      networkErr.network = true;
      return Promise.reject(networkErr);
    });
  }

  return {
    configure: function(baseUrl) {
      BASE_URL = baseUrl;
    },

    getBaseUrl: function() {
      return BASE_URL;
    },

    get: function(path) {
      return request('GET', path);
    },

    post: function(path, body, headers) {
      return request('POST', path, { body: body, headers: headers });
    },

    patch: function(path, body) {
      return request('PATCH', path, { body: body });
    },

    delete: function(path) {
      return request('DELETE', path);
    },

    getHealth: function() {
      return this.get('/api/health');
    },

    getAuthStatus: function() {
      return this.get('/api/auth/status');
    },

    getCurrentUser: function() {
      return this.get('/api/auth/me');
    },

    login: function(email, password) {
      return this.post('/api/auth/login', { email: email, password: password });
    },

    register: function(data) {
      return this.post('/api/auth/register', data);
    },

    registerSchool: function(data) {
      return this.post('/api/schools/register', data);
    },

    googleLoginUrl: function(role) {
      return BASE_URL + '/api/auth/google?role=' + encodeURIComponent(role || 'STUDENT');
    },

    logout: function() {
      return this.post('/api/auth/logout');
    },

    exchangeToken: function(token) {
      return this.post('/api/auth/exchange-token', { token: token });
    },

    getMatchHistory: function(page, limit) {
      var params = '';
      if (page) params += '?page=' + page;
      if (limit) params += (params ? '&' : '?') + 'limit=' + limit;
      return this.get('/api/game/history' + params);
    },

    getGameStats: function() {
      return this.get('/api/game/stats');
    },

    saveMatch: function(matchData) {
      return this.post('/api/game/match', matchData);
    },

    getGameQuestions: function(params) {
      var qs = '?subjectCode=' + (params.subjectCode || params.subject || 'MAT');
      if (params.level) qs += '&level=' + encodeURIComponent(params.level);
      if (params.topic) qs += '&topic=' + encodeURIComponent(params.topic);
      if (params.difficulty) qs += '&difficulty=' + encodeURIComponent(params.difficulty);
      if (params.count) qs += '&count=' + params.count;
      return this.get('/api/game/questions' + qs);
    },

    findMatch: function(matchParams) {
      return this.post('/api/game/find-match', matchParams);
    },

    getGameMatch: function(matchId) {
      return this.get('/api/game/matches/' + matchId);
    },

    submitGameAnswer: function(matchId, answerData) {
      return this.post('/api/game/matches/' + matchId + '/answer', answerData);
    },

    completeMatch: function(matchId, resultData) {
      return this.post('/api/game/matches/' + matchId + '/complete', resultData);
    },

    getGameLeaderboard: function(limit) {
      return this.get('/api/game/leaderboard' + (limit ? '?limit=' + limit : ''));
    },

    getCurriculumLevels: function() {
      return this.get('/api/curriculum/levels');
    },

    getCurriculumSubjects: function(levelId) {
      return this.get('/api/curriculum/subjects' + (levelId ? '?levelId=' + encodeURIComponent(levelId) : ''));
    },

    getQuestions: function(params) {
      var query = [];
      if (params.subjectId) query.push('subjectId=' + encodeURIComponent(params.subjectId));
      if (params.level) query.push('level=' + encodeURIComponent(params.level));
      if (params.difficulty) query.push('difficulty=' + encodeURIComponent(params.difficulty));
      if (params.limit) query.push('limit=' + params.limit);
      var qs = query.length > 0 ? '?' + query.join('&') : '';
      return this.get('/api/assessments/questions' + qs);
    },

    requestVideoLesson: function(body) {
      return this.post('/api/video-lessons', body);
    },

    getVideoLessons: function() {
      return this.get('/api/video-lessons');
    },

    getVideoLesson: function(id) {
      return this.get('/api/video-lessons/' + encodeURIComponent(id));
    },

    getVideoTopics: function(subjectId, levelId) {
      var q = '?subjectId=' + encodeURIComponent(subjectId || '') + '&educationLevelId=' + encodeURIComponent(levelId || '');
      return this.get('/api/video-lessons/topics' + q);
    },

    getVideoJob: function(jobId) {
      return this.get('/api/video-lessons/jobs/' + encodeURIComponent(jobId));
    },

    cancelVideoJob: function(jobId) {
      return this.post('/api/video-lessons/jobs/' + encodeURIComponent(jobId) + '/cancel');
    },

    retryVideoJob: function(jobId) {
      return this.post('/api/video-lessons/jobs/' + encodeURIComponent(jobId) + '/retry');
    },

    saveVideoProgress: function(lessonId, body) {
      return this.post('/api/video-lessons/' + encodeURIComponent(lessonId) + '/progress', body);
    },

    submitVideoQuiz: function(lessonId, answers) {
      return this.post('/api/video-lessons/' + encodeURIComponent(lessonId) + '/quiz', { answers: answers });
    },

    toggleVideoLibrary: function(lessonId) {
      return this.post('/api/video-lessons/' + encodeURIComponent(lessonId) + '/library');
    },

    getDashboard: function(role) {
      var endpoint = role === 'super_admin' ? 'super-admin' : String(role || '').toLowerCase();
      return this.get('/api/dashboard/' + endpoint);
    },

    getSchool: function(schoolId) {
      return this.get('/api/schools/' + encodeURIComponent(schoolId));
    },

    getMySchool: function() {
      return this.get('/api/schools/my-school');
    },

    getSchoolStats: function(schoolId) {
      return this.get('/api/schools/' + encodeURIComponent(schoolId) + '/stats');
    },

    getSchoolMembers: function(schoolId) {
      return this.get('/api/schools/' + encodeURIComponent(schoolId) + '/members');
    },

    getCurriculumCombinations: function(levelId) {
      return this.get('/api/curriculum/combinations' + (levelId ? '?levelId=' + encodeURIComponent(levelId) : ''));
    },

    getCurriculumProgrammes: function(levelId, type) {
      var params = [];
      if (levelId) params.push('levelId=' + encodeURIComponent(levelId));
      if (type) params.push('type=' + encodeURIComponent(type));
      var qs = params.length ? '?' + params.join('&') : '';
      return this.get('/api/curriculum/programmes' + qs);
    },

    getCurriculumStats: function() {
      return this.get('/api/curriculum/stats');
    },

    getResources: function(params) {
      var qs = [];
      if (params) {
        if (params.category) qs.push('category=' + encodeURIComponent(params.category));
        if (params.subject) qs.push('subject=' + encodeURIComponent(params.subject));
        if (params.level) qs.push('level=' + encodeURIComponent(params.level));
        if (params.search) qs.push('search=' + encodeURIComponent(params.search));
        if (params.limit) qs.push('limit=' + params.limit);
        if (params.offset) qs.push('offset=' + params.offset);
      }
      var query = qs.length ? '?' + qs.join('&') : '';
      return this.get('/api/resources' + query);
    },

    getResource: function(resourceId) {
      return this.get('/api/resources/' + encodeURIComponent(resourceId));
    },

    getResourceStats: function() {
      return this.get('/api/resources/stats/overview');
    },

    createResource: function(data) {
      return this.post('/api/resources', data);
    },

    updateResource: function(resourceId, data) {
      return this.put('/api/resources/' + encodeURIComponent(resourceId), data);
    },

    deleteResource: function(resourceId) {
      return this.delete('/api/resources/' + encodeURIComponent(resourceId));
    },

    recordResourceDownload: function(resourceId) {
      return this.post('/api/resources/' + encodeURIComponent(resourceId) + '/download');
    },

    // Enhanced AI Capabilities
    createTask: function(data) {
      return this.post('/api/ai-enhanced/tasks', data);
    },

    getTasks: function(filters) {
      var qs = [];
      if (filters) {
        if (filters.status) qs.push('status=' + encodeURIComponent(filters.status));
        if (filters.taskType) qs.push('taskType=' + encodeURIComponent(filters.taskType));
        if (filters.subject) qs.push('subject=' + encodeURIComponent(filters.subject));
        if (filters.limit) qs.push('limit=' + filters.limit);
      }
      var query = qs.length ? '?' + qs.join('&') : '';
      return this.get('/api/ai-enhanced/tasks' + query);
    },

    updateTask: function(taskId, data) {
      return this.put('/api/ai-enhanced/tasks/' + encodeURIComponent(taskId), data);
    },

    generateImage: function(data) {
      return this.post('/api/ai-enhanced/generate-image', data);
    },

    getGeneratedImages: function(limit) {
      return this.get('/api/ai-enhanced/images' + (limit ? '?limit=' + limit : ''));
    },

    searchContent: function(query) {
      return this.post('/api/ai-enhanced/search', { query: query });
    },

    askAI: function(data) {
      return this.post('/api/ai-enhanced/ask', data);
    },

    getRecommendations: function() {
      return this.get('/api/ai-enhanced/recommendations');
    },

    getAIUsage: function() {
      return this.get('/api/ai-enhanced/usage');
    },

    createSubject: function(data) {
      return this.post('/api/curriculum/subjects', data);
    },

    linkSubjectToLevel: function(data) {
      return this.post('/api/curriculum/subjects/link', data);
    },

    unlinkSubjectFromLevel: function(subjectId, levelId) {
      return this.delete('/api/curriculum/subjects/link?subjectId=' + encodeURIComponent(subjectId) + '&educationLevelId=' + encodeURIComponent(levelId));
    },

    createCombination: function(data) {
      return this.post('/api/curriculum/combinations', data);
    },

    createProgramme: function(data) {
      return this.post('/api/curriculum/programmes', data);
    },

    getConversations: function() {
      return this.get('/api/ai-tutor/conversations');
    },

    getConversation: function(id) {
      return this.get('/api/ai-tutor/conversations/' + encodeURIComponent(id));
    },

    startConversation: function(data) {
      return this.post('/api/ai-tutor/conversations', data);
    },

    sendMessage: function(conversationId, content) {
      return this.post('/api/ai-tutor/conversations/' + encodeURIComponent(conversationId) + '/messages', { content: content });
    },

    archiveConversation: function(id) {
      return this.delete('/api/ai-tutor/conversations/' + encodeURIComponent(id));
    },

    getProgressOverview: function() {
      return this.get('/api/progress/overview');
    },

    getProgressSubjects: function() {
      return this.get('/api/progress/subjects');
    },

    getProgressActivity: function(params) {
      var qs = '';
      if (params) {
        var parts = [];
        if (params.limit) parts.push('limit=' + params.limit);
        if (params.offset) parts.push('offset=' + params.offset);
        if (params.subjectId) parts.push('subjectId=' + encodeURIComponent(params.subjectId));
        if (parts.length) qs = '?' + parts.join('&');
      }
      return this.get('/api/progress/activity' + qs);
    },

    getProgressMastery: function(subjectId) {
      return this.get('/api/progress/mastery' + (subjectId ? '?subjectId=' + encodeURIComponent(subjectId) : ''));
    },

    getLearningGaps: function() {
      return this.get('/api/progress/gaps');
    },

    getRecommendations: function() {
      return this.get('/api/progress/recommendations');
    },

    getAssessments: function(params) {
      var qs = '';
      if (params) {
        var parts = [];
        if (params.subjectId) parts.push('subjectId=' + encodeURIComponent(params.subjectId));
        if (params.educationLevelId) parts.push('educationLevelId=' + encodeURIComponent(params.educationLevelId));
        if (params.type) parts.push('type=' + encodeURIComponent(params.type));
        if (parts.length) qs = '?' + parts.join('&');
      }
      return this.get('/api/assessments' + qs);
    },

    getAssessment: function(id) {
      return this.get('/api/assessments/' + encodeURIComponent(id));
    },

    startAssessment: function(id) {
      return this.post('/api/assessments/' + encodeURIComponent(id) + '/start');
    },

    submitAssessment: function(id, attemptId, answers) {
      return this.post('/api/assessments/' + encodeURIComponent(id) + '/submit', { attemptId: attemptId, answers: answers });
    },

    getAssessmentHistory: function() {
      return this.get('/api/assessments/history');
    },

    getUpcomingAssessments: function(limit) {
      var qs = limit ? '?limit=' + limit : '';
      return this.get('/api/assessments/upcoming' + qs);
    },

    getTutorProfile: function() {
      return this.get('/api/tutors/profile');
    },

    saveTutorProfile: function(data) {
      return this.post('/api/tutors/profile', data);
    },

    analyzeTutorCV: function() {
      return this.post('/api/tutors/analyze-cv');
    },

    getTutorSkillAssessments: function() {
      return this.get('/api/tutors/skill-assessments');
    },

    updateTutorSubjects: function(subjects) {
      return this.post('/api/tutors/subjects', { subjects: subjects });
    },

    updateTutorAvailability: function(availability) {
      return this.post('/api/tutors/availability', { availability: availability });
    },

    updateTutorServiceAreas: function(areas) {
      return this.post('/api/tutors/service-areas', { areas: areas });
    },

    getTutorRecommendations: function(criteria) {
      var params = [];
      if (criteria.subjectIds && criteria.subjectIds.length > 0) {
        params.push('subjectIds=' + criteria.subjectIds.join(','));
      }
      if (criteria.educationLevelId) {
        params.push('educationLevelId=' + encodeURIComponent(criteria.educationLevelId));
      }
      if (criteria.province) {
        params.push('province=' + encodeURIComponent(criteria.province));
      }
      if (criteria.district) {
        params.push('district=' + encodeURIComponent(criteria.district));
      }
      if (criteria.sector) {
        params.push('sector=' + encodeURIComponent(criteria.sector));
      }
      if (criteria.cell) {
        params.push('cell=' + encodeURIComponent(criteria.cell));
      }
      if (criteria.village) {
        params.push('village=' + encodeURIComponent(criteria.village));
      }
      if (criteria.lessonFormat) {
        params.push('lessonFormat=' + encodeURIComponent(criteria.lessonFormat));
      }
      if (criteria.preferredDays && criteria.preferredDays.length > 0) {
        params.push('preferredDays=' + criteria.preferredDays.join(','));
      }
      if (criteria.maxHourlyRate) {
        params.push('maxHourlyRate=' + criteria.maxHourlyRate);
      }
      var qs = params.length > 0 ? '?' + params.join('&') : '';
      return this.get('/api/tutors/recommendations' + qs);
    },

    getTutorPublicProfile: function(tutorId) {
      return this.get('/api/tutors/public-profile/' + encodeURIComponent(tutorId));
    },

    saveTutor: function(tutorId) {
      return this.post('/api/tutors/save', { tutorId: tutorId });
    },

    unsaveTutor: function(tutorId) {
      return this.delete('/api/tutors/save/' + encodeURIComponent(tutorId));
    },

    getSavedTutors: function() {
      return this.get('/api/tutors/saved');
    },

    checkBookingAvailability: function(tutorProfileId, date, startTime, endTime) {
      return this.post('/api/tutors/bookings/check-availability', {
        tutorProfileId: tutorProfileId,
        date: date,
        startTime: startTime,
        endTime: endTime
      });
    },

    createBooking: function(data) {
      return this.post('/api/tutors/bookings', data);
    },

    getBookings: function() {
      return this.get('/api/tutors/bookings');
    },

    getBookingNotifications: function() {
      return this.get('/api/tutors/bookings/notifications');
    },

    getBooking: function(bookingId) {
      return this.get('/api/tutors/bookings/' + encodeURIComponent(bookingId));
    },

    acceptBooking: function(bookingId) {
      return this.post('/api/tutors/bookings/' + encodeURIComponent(bookingId) + '/accept');
    },

    declineBooking: function(bookingId, reason) {
      return this.post('/api/tutors/bookings/' + encodeURIComponent(bookingId) + '/decline', { reason: reason });
    },

    cancelBooking: function(bookingId, reason) {
      return this.post('/api/tutors/bookings/' + encodeURIComponent(bookingId) + '/cancel', { reason: reason });
    },

    completeBooking: function(bookingId) {
      return this.post('/api/tutors/bookings/' + encodeURIComponent(bookingId) + '/complete');
    },

    rescheduleBooking: function(bookingId, date, startTime, endTime) {
      return this.post('/api/tutors/bookings/' + encodeURIComponent(bookingId) + '/reschedule', {
        date: date,
        startTime: startTime,
        endTime: endTime
      });
    },

    saveQuizAttempt: function(data) {
      return this.post('/api/assessments/quiz-attempt', data);
    },

    getStudentResults: function() {
      return this.get('/api/assessments/my-results');
    },

    getSchoolDocuments: function() {
      return this.get('/api/parents/school-documents');
    },

    getNationalExams: function(params) {
      var qs = '';
      if (params) {
        var parts = [];
        if (params.level) parts.push('level=' + encodeURIComponent(params.level));
        if (params.year) parts.push('year=' + encodeURIComponent(params.year));
        if (params.subjectId) parts.push('subjectId=' + encodeURIComponent(params.subjectId));
        if (parts.length) qs = '?' + parts.join('&');
      }
      return this.get('/api/assessments/national-exams' + qs);
    },

    getNationalExam: function(id) {
      return this.get('/api/assessments/national-exams/' + encodeURIComponent(id));
    },

    getLessonPlans: function() {
      return this.get('/api/teachers/lesson-plans');
    },

    createLessonPlan: function(data) {
      return this.post('/api/teachers/lesson-plans', data);
    },

    updateLessonPlan: function(id, data) {
      return this.patch('/api/teachers/lesson-plans/' + encodeURIComponent(id), data);
    },

    deleteLessonPlan: function(id) {
      return this.delete('/api/teachers/lesson-plans/' + encodeURIComponent(id));
    },

    getTeacherJobs: function(params) {
      var qs = '';
      if (params) {
        var parts = [];
        if (params.search) parts.push('search=' + encodeURIComponent(params.search));
        if (params.location) parts.push('location=' + encodeURIComponent(params.location));
        if (params.type) parts.push('type=' + encodeURIComponent(params.type));
        if (parts.length) qs = '?' + parts.join('&');
      }
      return this.get('/api/teachers/jobs' + qs);
    },

    getSaccoInfo: function() {
      return this.get('/api/teachers/sacco');
    },

    submitStudentReport: function(data) {
      return this.post('/api/teachers/student-reports', data);
    },

    getStudentReports: function() {
      return this.get('/api/teachers/student-reports');
    },

    createTeacherExam: function(data) {
      return this.post('/api/teachers/exams', data);
    },

    getTeacherExams: function() {
      return this.get('/api/teachers/exams');
    },

    getMeetings: function() {
      return this.get('/api/teachers/meetings');
    },

    createMeeting: function(data) {
      return this.post('/api/teachers/meetings', data);
    },

    sendReportToParent: function(data) {
      return this.post('/api/teachers/reports/parent', data);
    },

    sendReportToHead: function(data) {
      return this.post('/api/teachers/reports/head', data);
    },

    getTeacherReports: function() {
      return this.get('/api/teachers/reports');
    },

    registerSchool: function(data) {
      return this.post('/api/schools/register', data);
    },

    getSchoolTeachers: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/teachers');
    },

    registerTeacherAtSchool: function(schoolId, data) {
      var id = schoolId || 'my-school';
      return this.post('/api/schools/' + encodeURIComponent(id) + '/teachers', data);
    },

    getSchoolAbsentTeachers: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/absent-teachers');
    },

    requestTeacherReport: function(data) {
      return this.post('/api/schools/request-teacher-report', data);
    },

    createSchoolEvent: function(data) {
      return this.post('/api/schools/events', data);
    },

    getSchoolEvents: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/events');
    },

    deleteSchoolEvent: function(eventId) {
      return this.delete('/api/schools/events/' + encodeURIComponent(eventId));
    },

    createParentMeeting: function(data) {
      return this.post('/api/schools/parent-meetings', data);
    },

    getParentMeetings: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/parent-meetings');
    },

    getSchoolStatistics: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/statistics');
    },

    getSchoolClassReports: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/class-reports');
    },

    getChildren: function() {
      return this.get('/api/parents/children');
    },

    getChildProgress: function(childId) {
      return this.get('/api/parents/children/' + encodeURIComponent(childId) + '/progress');
    },

    getChildGrades: function(childId) {
      return this.get('/api/parents/children/' + encodeURIComponent(childId) + '/grades');
    },

    getSchoolNews: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/news');
    },

    sendMessageToTeacher: function(data) {
      return this.post('/api/parents/message-teacher', data);
    },

    getParentMessages: function() {
      return this.get('/api/parents/messages');
    },

    getSchoolFees: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/fees');
    },

    getPaymentHistory: function() {
      return this.get('/api/parents/payments');
    },

    initiatePayment: function(data) {
      return this.post('/api/parents/payments', data);
    },

    getParentCommunity: function(schoolId) {
      var id = schoolId || 'my-school';
      return this.get('/api/schools/' + encodeURIComponent(id) + '/community');
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IremeAPI;
}
