var IremeAuth = (function () {
    var STORAGE_KEY = 'ireme-auth-session';
    var USERS_KEY = 'ireme-auth-users';

    var ROLES = {
        student:          { label: 'Student',           dashboard: 'student-dashboard.html',          canRegister: true  },
        teacher:          { label: 'Teacher',           dashboard: 'teacher-dashboard.html',          canRegister: true  },
        parent:           { label: 'Parent/Guardian',   dashboard: 'parent-dashboard.html',           canRegister: true  },
        school_admin:     { label: 'School Administrator', dashboard: 'school-dashboard.html',        canRegister: true  },
        learner:          { label: 'TTC/TVET Learner',  dashboard: 'learner-dashboard.html',          canRegister: true  },
        content_manager:  { label: 'Content Manager',   dashboard: 'content-manager-dashboard.html',  canRegister: false },
        curriculum_manager:{ label: 'Curriculum Manager', dashboard: 'curriculum-manager-dashboard.html', canRegister: false },
        admin:            { label: 'Administrator',     dashboard: 'admin-dashboard.html',            canRegister: false },
        super_admin:      { label: 'Super Administrator', dashboard: 'super-admin-dashboard.html',    canRegister: false },
        support:          { label: 'Support Staff',     dashboard: 'support-dashboard.html',          canRegister: false },
        finance:          { label: 'Finance Staff',     dashboard: 'finance-dashboard.html',          canRegister: false }
    };

    var PORTALS = [
        { id: 'student',    icon: 'fa-user-graduate', color: 'primary' },
        { id: 'teacher',    icon: 'fa-chalkboard-teacher', color: 'success' },
        { id: 'parent',     icon: 'fa-users', color: 'info' },
        { id: 'school_admin', icon: 'fa-school', color: 'warning' },
        { id: 'learner',    icon: 'fa-book-open', color: 'secondary' },
        { id: 'admin',      icon: 'fa-user-shield', color: 'danger' }
    ];

    var STATUS = {
        PENDING: 'pending',
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        DISABLED: 'disabled'
    };

    function hashPassword(pw) {
        var hash = 0;
        var salted = 'ireme_salt_' + pw + '_2026';
        for (var i = 0; i < salted.length; i++) {
            var chr = salted.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return 'hashed_' + Math.abs(hash).toString(36) + '_' + salted.length;
    }

    function generateId() {
        return 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getUsers() {
        try {
            var data = localStorage.getItem(USERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getSession() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;
            var session = JSON.parse(data);
            if (session && session.expiresAt && Date.now() > session.expiresAt) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    function saveSession(user) {
        var session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            avatar: user.avatar || '',
            school: user.school || '',
            language: user.language || 'en',
            loginAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    function findUserByEmail(email) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].email.toLowerCase() === email.toLowerCase()) {
                return users[i];
            }
        }
        return null;
    }

    function findUserById(id) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === id) {
                return users[i];
            }
        }
        return null;
    }

    function ensureSeedAdmin() {
        var users = getUsers();
        var hasSuperAdmin = false;
        for (var i = 0; i < users.length; i++) {
            if (users[i].role === 'super_admin') {
                hasSuperAdmin = true;
                break;
            }
        }
        if (!hasSuperAdmin) {
            users.push({
                id: generateId(),
                email: 'admin@ireme.rw',
                name: 'System Administrator',
                password: hashPassword('Ireme@Admin2026'),
                role: 'super_admin',
                status: STATUS.ACTIVE,
                avatar: '',
                school: '',
                language: 'en',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                verified: true
            });
            saveUsers(users);
        }
    }

    function register(data) {
        if (!data || !data.email || !data.password || !data.name || !data.role) {
            return { success: false, error: 'All fields are required' };
        }
        if (!ROLES[data.role]) {
            return { success: false, error: 'Invalid role' };
        }
        if (!ROLES[data.role].canRegister) {
            return { success: false, error: 'Public registration is not available for this role' };
        }
        if (data.password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { success: false, error: 'Invalid email address' };
        }
        if (findUserByEmail(data.email)) {
            return { success: false, error: 'An account with this email already exists' };
        }

        var needsVerification = (data.role === 'teacher' || data.role === 'school_admin');

        var user = {
            id: generateId(),
            email: data.email,
            name: data.name,
            password: hashPassword(data.password),
            role: data.role,
            status: needsVerification ? STATUS.PENDING : STATUS.ACTIVE,
            avatar: '',
            school: data.school || '',
            phone: data.phone || '',
            language: data.language || 'en',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            verified: !needsVerification,
            profile: data.profile || {}
        };

        var users = getUsers();
        users.push(user);
        saveUsers(users);

        return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status }, needsVerification: needsVerification };
    }

    function login(email, password) {
        if (!email || !password) {
            return { success: false, error: 'Email and password are required' };
        }
        var user = findUserByEmail(email);
        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }
        if (user.password !== hashPassword(password)) {
            return { success: false, error: 'Invalid email or password' };
        }
        if (user.status === STATUS.SUSPENDED) {
            return { success: false, error: 'suspended' };
        }
        if (user.status === STATUS.DISABLED) {
            return { success: false, error: 'disabled' };
        }
        if (user.status === STATUS.PENDING) {
            return { success: false, error: 'pending' };
        }

        user.updatedAt = Date.now();
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === user.id) {
                users[i] = user;
                break;
            }
        }
        saveUsers(users);

        var session = saveSession(user);
        return { success: true, session: session };
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function currentUser() {
        var session = getSession();
        if (!session) return null;
        var user = findUserById(session.userId);
        return user;
    }

    function isLoggedIn() {
        return getSession() !== null;
    }

    function hasRole(role) {
        var session = getSession();
        if (!session) return false;
        return session.role === role;
    }

    function hasAnyRole(roles) {
        var session = getSession();
        if (!session) return false;
        return roles.indexOf(session.role) !== -1;
    }

    function requireAuth(redirectPage) {
        if (!isLoggedIn()) {
            var target = redirectPage || window.location.pathname.split('/').pop();
            window.location.href = 'login.html?redirect=' + encodeURIComponent(target);
            return false;
        }
        var session = getSession();
        if (session.status !== STATUS.ACTIVE) {
            if (session.status === STATUS.PENDING) {
                window.location.href = 'account-pending.html';
            } else {
                window.location.href = 'account-suspended.html';
            }
            return false;
        }
        return true;
    }

    function requireRole(role) {
        if (!requireAuth()) return false;
        if (!hasRole(role)) {
            window.location.href = 'access-denied.html';
            return false;
        }
        return true;
    }

    function requireAnyRole(roles) {
        if (!requireAuth()) return false;
        if (!hasAnyRole(roles)) {
            window.location.href = 'access-denied.html';
            return false;
        }
        return true;
    }

    function getDashboardUrl(role) {
        if (ROLES[role]) {
            return ROLES[role].dashboard;
        }
        return 'index.html';
    }

    function redirectToDashboard() {
        var session = getSession();
        if (session) {
            window.location.href = getDashboardUrl(session.role);
        } else {
            window.location.href = 'login.html';
        }
    }

    function updateProfile(updates) {
        var session = getSession();
        if (!session) return { success: false, error: 'Not logged in' };
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === session.userId) {
                if (updates.name) users[i].name = updates.name;
                if (updates.phone) users[i].phone = updates.phone;
                if (updates.avatar !== undefined) users[i].avatar = updates.avatar;
                if (updates.school) users[i].school = updates.school;
                if (updates.language) users[i].language = updates.language;
                if (updates.profile) users[i].profile = Object.assign(users[i].profile || {}, updates.profile);
                users[i].updatedAt = Date.now();
                saveUsers(users);
                saveSession(users[i]);
                return { success: true };
            }
        }
        return { success: false, error: 'User not found' };
    }

    function changePassword(currentPassword, newPassword) {
        var session = getSession();
        if (!session) return { success: false, error: 'Not logged in' };
        if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' };
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === session.userId) {
                if (users[i].password !== hashPassword(currentPassword)) {
                    return { success: false, error: 'Current password is incorrect' };
                }
                users[i].password = hashPassword(newPassword);
                users[i].updatedAt = Date.now();
                saveUsers(users);
                return { success: true };
            }
        }
        return { success: false, error: 'User not found' };
    }

    function requestPasswordReset(email) {
        var user = findUserByEmail(email);
        if (!user) {
            return { success: true, message: 'If the email exists, a reset link has been sent' };
        }
        var token = 'reset_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 12);
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === user.id) {
                users[i].resetToken = token;
                users[i].resetTokenExpiry = Date.now() + (60 * 60 * 1000);
                break;
            }
        }
        saveUsers(users);
        return { success: true, message: 'If the email exists, a reset link has been sent', token: token };
    }

    function resetPassword(token, newPassword) {
        if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' };
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].resetToken === token && users[i].resetTokenExpiry > Date.now()) {
                users[i].password = hashPassword(newPassword);
                users[i].resetToken = null;
                users[i].resetTokenExpiry = null;
                users[i].updatedAt = Date.now();
                saveUsers(users);
                return { success: true };
            }
        }
        return { success: false, error: 'Invalid or expired reset token' };
    }

    function getAllUsers(filters) {
        var users = getUsers();
        if (!filters) return users;
        return users.filter(function(u) {
            if (filters.role && u.role !== filters.role) return false;
            if (filters.status && u.status !== filters.status) return false;
            if (filters.search) {
                var s = filters.search.toLowerCase();
                if (u.name.toLowerCase().indexOf(s) === -1 && u.email.toLowerCase().indexOf(s) === -1) return false;
            }
            return true;
        });
    }

    function approveUser(userId) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === userId) {
                users[i].status = STATUS.ACTIVE;
                users[i].verified = true;
                users[i].updatedAt = Date.now();
                saveUsers(users);
                return { success: true };
            }
        }
        return { success: false, error: 'User not found' };
    }

    function suspendUser(userId) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === userId) {
                users[i].status = STATUS.SUSPENDED;
                users[i].updatedAt = Date.now();
                saveUsers(users);
                return { success: true };
            }
        }
        return { success: false, error: 'User not found' };
    }

    function deleteUser(userId) {
        var users = getUsers();
        var filtered = users.filter(function(u) { return u.id !== userId; });
        if (filtered.length === users.length) {
            return { success: false, error: 'User not found' };
        }
        saveUsers(filtered);
        return { success: true };
    }

    function getStats() {
        var users = getUsers();
        var stats = { total: users.length, byRole: {}, byStatus: {} };
        users.forEach(function(u) {
            stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
            stats.byStatus[u.status] = (stats.byStatus[u.status] || 0) + 1;
        });
        return stats;
    }

    ensureSeedAdmin();

    return {
        ROLES: ROLES,
        PORTALS: PORTALS,
        STATUS: STATUS,
        register: register,
        login: login,
        logout: logout,
        currentUser: currentUser,
        isLoggedIn: isLoggedIn,
        hasRole: hasRole,
        hasAnyRole: hasAnyRole,
        requireAuth: requireAuth,
        requireRole: requireRole,
        requireAnyRole: requireAnyRole,
        getDashboardUrl: getDashboardUrl,
        redirectToDashboard: redirectToDashboard,
        getSession: getSession,
        updateProfile: updateProfile,
        changePassword: changePassword,
        requestPasswordReset: requestPasswordReset,
        resetPassword: resetPassword,
        getAllUsers: getAllUsers,
        approveUser: approveUser,
        suspendUser: suspendUser,
        deleteUser: deleteUser,
        getStats: getStats,
        findUserById: findUserById,
        findUserByEmail: findUserByEmail
    };
})();
