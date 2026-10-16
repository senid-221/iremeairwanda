/**
 * IREME Auth — backend-backed authentication.
 *
 * Login, registration, logout, and session verification go through the
 * IREME backend API (cookie sessions). The session object is cached in
 * localStorage so page guards and the navbar can read it synchronously;
 * verifySession() reconciles the cache with the server on every page load.
 */
var IremeAuth = (function () {
    var SESSION_KEY = 'ireme-auth-session';
    var SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    var guardRequired = false;

    function readSession() {
        try {
            var raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            var session = JSON.parse(raw);
            if (!session || !session.expiresAt || session.expiresAt < Date.now()) {
                localStorage.removeItem(SESSION_KEY);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    function writeSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function sameRole(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    function sessionFromUser(user) {
        return {
            userId: user.id,
            email: user.email,
            name: user.fullName,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            avatarUrl: user.avatarUrl || null,
            expiresAt: Date.now() + SESSION_DURATION,
        };
    }

    function friendlyError(err) {
        if (!err) return 'Something went wrong. Please try again.';
        if (err.network) return 'Cannot connect to the server. Please check your internet connection.';
        if (err.timeout) return 'The server took too long to respond. Please try again.';
        return err.message || 'Something went wrong. Please try again.';
    }

    var DASHBOARDS = {
        student: 'student-dashboard.html',
        teacher: 'teacher-dashboard.html',
        parent: 'parent-dashboard.html',
        school_admin: 'school-dashboard.html',
        headteacher: 'school-dashboard.html',
        learner: 'learner-dashboard.html',
        content_manager: 'content-manager-dashboard.html',
        curriculum_manager: 'curriculum-manager-dashboard.html',
        admin: 'admin-dashboard.html',
        super_admin: 'super-admin-dashboard.html',
        support: 'support-dashboard.html',
        finance: 'finance-dashboard.html',
    };

    var ROLES = {
        student:            { label: 'Student',              dashboard: 'student-dashboard.html',            canRegister: true  },
        teacher:            { label: 'Teacher',              dashboard: 'teacher-dashboard.html',            canRegister: true  },
        parent:             { label: 'Parent/Guardian',      dashboard: 'parent-dashboard.html',             canRegister: true  },
        school_admin:       { label: 'School Administrator', dashboard: 'school-dashboard.html',             canRegister: false },
        headteacher:        { label: 'Head Teacher',         dashboard: 'school-dashboard.html',             canRegister: true  },
        learner:            { label: 'TTC/TVET Learner',     dashboard: 'learner-dashboard.html',            canRegister: false },
        content_manager:    { label: 'Content Manager',      dashboard: 'content-manager-dashboard.html',    canRegister: false },
        curriculum_manager: { label: 'Curriculum Manager',   dashboard: 'curriculum-manager-dashboard.html', canRegister: false },
        admin:              { label: 'Administrator',        dashboard: 'admin-dashboard.html',              canRegister: false },
        super_admin:        { label: 'Super Administrator',  dashboard: 'super-admin-dashboard.html',        canRegister: false },
        support:            { label: 'Support Staff',        dashboard: 'support-dashboard.html',            canRegister: false },
        finance:            { label: 'Finance Staff',        dashboard: 'finance-dashboard.html',            canRegister: false },
    };

    var PORTALS = [
        { id: 'student',      icon: 'fa-user-graduate',      color: 'primary' },
        { id: 'teacher',      icon: 'fa-chalkboard-teacher', color: 'success' },
        { id: 'parent',       icon: 'fa-users',              color: 'info' },
        { id: 'school_admin', icon: 'fa-school',             color: 'warning' },
        { id: 'learner',      icon: 'fa-book-open',          color: 'secondary' },
        { id: 'admin',        icon: 'fa-user-shield',        color: 'danger' },
    ];

    var api = function () {
        return (typeof IremeAPI !== 'undefined') ? IremeAPI : null;
    };

    return {
        login: function (email, password) {
            var client = api();
            if (!client) {
                return Promise.resolve({ success: false, error: 'Authentication service unavailable. Please refresh the page.' });
            }
            return client.login(email, password).then(function (res) {
                var user = res.user;
                if (user.status === 'PENDING') {
                    return { success: false, error: 'pending', user: user };
                }
                if (user.status === 'SUSPENDED') {
                    return { success: false, error: 'suspended', user: user };
                }
                if (user.status !== 'ACTIVE') {
                    return { success: false, error: 'Your account is not active. Please contact support.' };
                }
                var session = sessionFromUser(user);
                writeSession(session);
                return { success: true, session: session };
            }).catch(function (err) {
                return { success: false, error: friendlyError(err) };
            });
        },

        register: function (data) {
            var client = api();
            if (!client) {
                return Promise.resolve({ success: false, error: 'Authentication service unavailable. Please refresh the page.' });
            }
            var payload = {
                fullName: data.fullName,
                email: data.email,
                password: data.password,
                role: String(data.role || 'student').toUpperCase(),
            };
            return client.register(payload).then(function (res) {
                if (res.user && res.user.status === 'ACTIVE') {
                    writeSession(sessionFromUser(res.user));
                }
                return {
                    success: true,
                    requiresVerification: !!res.requiresVerification,
                    user: res.user,
                };
            }).catch(function (err) {
                return { success: false, error: friendlyError(err) };
            });
        },

        logout: function () {
            clearSession();
            var client = api();
            if (client) {
                return client.logout().catch(function () { });
            }
            return Promise.resolve();
        },

        getSession: readSession,

        isLoggedIn: function () {
            return !!readSession();
        },

        currentUser: function () {
            var s = readSession();
            if (!s) return null;
            var fullName = s.name || s.fullName || '';
            return {
                id: s.userId,
                name: fullName,
                fullName: fullName,
                email: s.email,
                role: s.role,
                status: s.status,
            };
        },

        hasRole: function (role) {
            var s = readSession();
            return !!s && sameRole(s.role, role);
        },

        hasAnyRole: function (roles) {
            var s = readSession();
            if (!s) return false;
            for (var i = 0; i < roles.length; i++) {
                if (sameRole(s.role, roles[i])) return true;
            }
            return false;
        },

        getDashboardUrl: function (role) {
            if (!role) return 'index.html';
            var key = String(role).trim().toLowerCase();
            return DASHBOARDS[key] || 'index.html';
        },

        redirectToDashboard: function () {
            var s = readSession();
            window.location.href = s ? this.getDashboardUrl(s.role) : 'login.html';
        },

        ROLES: ROLES,
        PORTALS: PORTALS,

        requireAuth: function (redirectUrl) {
            guardRequired = true;
            var self = this;
            this.verifySession().then(function () {
                if (!self.isLoggedIn()) {
                    window.location.href = redirectUrl || 'login.html';
                }
            });
            return this.isLoggedIn();
        },

        requireRole: function (role) {
            guardRequired = true;
            var self = this;
            this.verifySession().then(function () {
                if (!self.isLoggedIn()) {
                    window.location.href = 'login.html';
                } else if (!self.hasRole(role)) {
                    window.location.href = 'access-denied.html';
                }
            });
            return this.isLoggedIn() && this.hasRole(role);
        },

        requireAnyRole: function (roles) {
            guardRequired = true;
            var self = this;
            this.verifySession().then(function () {
                if (!self.isLoggedIn()) {
                    window.location.href = 'login.html';
                } else if (!self.hasAnyRole(roles)) {
                    window.location.href = 'access-denied.html';
                }
            });
            return this.isLoggedIn() && this.hasAnyRole(roles);
        },

        /**
         * Reconciles the cached session with the server. Runs on every page
         * load: refreshes role/status changes made server-side, and ends the
         * local session when the server reports no authentication.
         */
        verifySession: function () {
            var self = this;
            var client = api();
            if (!client) return Promise.resolve();
            return client.getAuthStatus().then(function (status) {
                if (status && status.authenticated && status.user) {
                    var existing = readSession();
                    var fresh = sessionFromUser({
                        id: status.user.id,
                        email: existing ? existing.email : '',
                        fullName: status.user.fullName,
                        role: status.user.role,
                        status: status.user.status,
                    });
                    if (existing && existing.email) fresh.email = existing.email;
                    if (existing && existing.avatarUrl) fresh.avatarUrl = existing.avatarUrl;
                    writeSession(fresh);

                    if (guardRequired && fresh.status === 'SUSPENDED') {
                        clearSession();
                        window.location.href = 'account-suspended.html';
                    } else if (guardRequired && fresh.status === 'PENDING') {
                        clearSession();
                        window.location.href = 'account-pending.html';
                    }
                } else {
                    clearSession();
                }
            }).catch(function () {
            });
        },

        updateProfile: function (updates) {
            var client = api();
            if (!client) {
                return Promise.resolve({ success: false, error: 'Authentication service unavailable.' });
            }
            return client.patch('/api/auth/profile', updates).then(function (res) {
                var existing = readSession();
                if (existing && res.user && res.user.fullName) {
                    existing.name = res.user.fullName;
                    existing.fullName = res.user.fullName;
                    writeSession(existing);
                }
                return { success: true, user: res.user };
            }).catch(function (err) {
                return { success: false, error: friendlyError(err) };
            });
        },

        changePassword: function (currentPassword, newPassword) {
            return Promise.resolve({ success: false, error: 'Password change is currently unavailable. Please contact support.' });
        },

        requestPasswordReset: function (email) {
            return Promise.resolve({ success: false, error: 'Please contact support to reset your password.' });
        },

        resetPassword: function (token, newPassword) {
            return Promise.resolve({ success: false, error: 'Password reset is currently unavailable. Please contact support.' });
        },

        getAllUsers: function (filters) {
            var client = api();
            if (!client) {
                return Promise.resolve({ success: false, error: 'Admin service unavailable.' });
            }
            var params = [];
            if (filters && filters.role) params.push('role=' + encodeURIComponent(filters.role.toUpperCase()));
            if (filters && filters.status) params.push('status=' + encodeURIComponent(filters.status.toUpperCase()));
            if (filters && filters.search) params.push('search=' + encodeURIComponent(filters.search));
            if (filters && filters.limit) params.push('limit=' + encodeURIComponent(filters.limit));
            if (filters && filters.page) params.push('page=' + encodeURIComponent(filters.page));
            var qs = params.length ? '?' + params.join('&') : '';
            return client.get('/api/admin/users' + qs).then(function (res) {
                var users = (res.users || []).map(function (u) {
                    return {
                        id: u.id,
                        email: u.email,
                        fullName: u.fullName,
                        name: u.fullName,
                        role: String(u.role).toLowerCase(),
                        status: String(u.status).toLowerCase(),
                        createdAt: u.createdAt,
                    };
                });
                return { success: true, users: users, pagination: res.pagination || null };
            }).catch(function (err) {
                return { success: false, error: friendlyError(err) };
            });
        },

        approveUser: function (userId) {
            var client = api();
            if (!client) return Promise.resolve({ success: false, error: 'Admin service unavailable.' });
            return client.patch('/api/admin/users/' + userId + '/status', { status: 'ACTIVE' })
                .then(function () { return { success: true }; })
                .catch(function (err) { return { success: false, error: friendlyError(err) }; });
        },

        suspendUser: function (userId) {
            var client = api();
            if (!client) return Promise.resolve({ success: false, error: 'Admin service unavailable.' });
            return client.patch('/api/admin/users/' + userId + '/status', { status: 'SUSPENDED' })
                .then(function () { return { success: true }; })
                .catch(function (err) { return { success: false, error: friendlyError(err) }; });
        },

        deleteUser: function (userId) {
            return Promise.resolve({ success: false, error: 'User deletion is currently unavailable. Please contact a super administrator.' });
        },

        getStats: function () {
            return this.getAllUsers({ limit: 1000 }).then(function (res) {
                if (!res.success) return { success: false, error: res.error };
                var users = res.users;
                var byRole = {};
                var byStatus = {};
                users.forEach(function (u) {
                    byRole[u.role] = (byRole[u.role] || 0) + 1;
                    byStatus[u.status] = (byStatus[u.status] || 0) + 1;
                });
                return { success: true, stats: { total: users.length, byRole: byRole, byStatus: byStatus } };
            });
        },
    };
})();
