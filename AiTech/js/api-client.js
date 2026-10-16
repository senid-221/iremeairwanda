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

    getCurriculumLevels: function() {
      return this.get('/api/curriculum/levels');
    },

    getCurriculumSubjects: function(levelId) {
      return this.get('/api/curriculum/subjects' + (levelId ? '?levelId=' + encodeURIComponent(levelId) : ''));
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
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IremeAPI;
}
