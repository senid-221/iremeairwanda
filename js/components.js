const IremeComponents = {
    /** Links shown to logged-out visitors */
    publicNavItems: [
        { href: 'index.html', key: 'nav.home' },
        {
            key: 'nav.student',
            children: [
                { href: 'video-lessons.html', key: 'nav.student.lessons' },
                { href: 'quizzes.html', key: 'nav.student.quizzes' },
                { href: 'exams.html', key: 'nav.student.exams' },
                { href: 'national-exams.html', key: 'nav.student.nationalExams' },
                { href: 'ai-tutor.html', key: 'nav.student.ai' },
                { href: 'resources.html', key: 'nav.student.books' },
                { href: 'game-setup.html', key: 'nav.student.game' },
                { href: 'check-results.html', key: 'nav.student.results' },
                { href: 'online-learning.html', key: 'nav.student.onlineLearning' },
                { href: 'test-skills.html', key: 'nav.student.testSkills' },
            ]
        },
        {
            key: 'nav.teacher',
            children: [
                { href: 'lesson-planner.html', key: 'nav.teacher.lessonPlanner' },
                { href: 'stream-lesson.html', key: 'nav.teacher.streamLesson' },
                { href: 'teacher-jobs.html', key: 'nav.teacher.jobs' },
                { href: 'umwarimu-sacco.html', key: 'nav.teacher.sacco' },
                { href: 'student-report.html', key: 'nav.teacher.studentReport' },
                { href: 'prepare-exam.html', key: 'nav.teacher.prepareExam' },
                { href: 'staff-meeting.html', key: 'nav.teacher.staffMeeting' },
                { href: 'report-to-parent.html', key: 'nav.teacher.reportParent' },
                { href: 'report-to-head.html', key: 'nav.teacher.reportHead' },
            ]
        },
        {
            key: 'nav.headteacher',
            children: [
                { href: 'register-school.html', key: 'nav.headteacher.registerSchool' },
                { href: 'register-teacher.html', key: 'nav.headteacher.registerTeacher' },
                { href: 'ask-teacher-report.html', key: 'nav.headteacher.askReport' },
                { href: 'available-teachers.html', key: 'nav.headteacher.availableTeachers' },
                { href: 'absent-teachers.html', key: 'nav.headteacher.absentTeachers' },
                { href: 'school-events.html', key: 'nav.headteacher.events' },
                { href: 'parent-meetings.html', key: 'nav.headteacher.parentMeetings' },
                { href: 'school-statistics.html', key: 'nav.headteacher.statistics' },
            ]
        },
        {
            key: 'nav.parents',
            children: [
                { href: 'monitor-learning.html', key: 'nav.parents.monitorLearning' },
                { href: 'view-grades.html', key: 'nav.parents.viewGrades' },
                { href: 'booking-management.html', key: 'nav.parents.bookTutor' },
                { href: 'school-news.html', key: 'nav.parents.schoolNews' },
                { href: 'contact-teacher.html', key: 'nav.parents.contactTeacher' },
                { href: 'school-fees.html', key: 'nav.parents.schoolFees' },
                { href: 'parent-community.html', key: 'nav.parents.community' },
            ]
        },
        { href: 'schools.html', key: 'nav.schools' },
        { href: 'about.html', key: 'nav.about' },
        { href: 'contact.html', key: 'nav.contact' },
    ],

    /** Role-specific links shown to logged-in users */
    roleNavItems: {
        student: [
            { href: 'student-dashboard.html', key: 'nav.dashboard' },
            { href: 'video-lessons.html',     key: 'nav.videoLessons' },
            { href: 'game-setup.html',        key: 'nav.game' },
            { href: 'booking-management.html', key: 'nav.booking' },
            { href: 'resources.html',         key: 'nav.resources' },
            { href: 'ai-tutor.html',          key: 'nav.aiTutor' },
        ],
        teacher: [
            { href: 'teacher-dashboard.html', key: 'nav.dashboard' },
            { href: 'teacher-dashboard.html#classes',       key: 'nav.classes' },
            { href: 'teacher-dashboard.html#assessments',   key: 'nav.assessments' },
            { href: 'booking-management.html', key: 'nav.booking' },
            { href: 'resources.html',         key: 'nav.resources' },
        ],
        parent: [
            { href: 'parent-dashboard.html',  key: 'nav.dashboard' },
            { href: 'parent-dashboard.html#children', key: 'nav.children' },
            { href: 'booking-management.html', key: 'nav.booking' },
            { href: 'resources.html',         key: 'nav.resources' },
        ],
        headteacher: [
            { href: 'school-dashboard.html',  key: 'nav.schoolDashboard' },
            { href: 'school-dashboard.html#staff',      key: 'nav.staff' },
            { href: 'school-dashboard.html#students',   key: 'nav.students' },
            { href: 'school-profile.html',    key: 'nav.schoolProfile' },
        ],
        school_admin: [
            { href: 'school-dashboard.html',  key: 'nav.schoolDashboard' },
            { href: 'school-dashboard.html#staff',      key: 'nav.staff' },
            { href: 'school-dashboard.html#students',   key: 'nav.students' },
            { href: 'school-profile.html',    key: 'nav.schoolProfile' },
        ],
        admin: [
            { href: 'admin-dashboard.html',         key: 'nav.adminDashboard' },
            { href: 'admin-dashboard.html#users',   key: 'nav.users' },
            { href: 'schools.html',                 key: 'nav.schools' },
            { href: 'curriculum-management.html',   key: 'nav.curriculum' },
        ],
        super_admin: [
            { href: 'super-admin-dashboard.html', key: 'nav.adminDashboard' },
            { href: 'admin-dashboard.html#users', key: 'nav.users' },
            { href: 'schools.html',               key: 'nav.schools' },
            { href: 'curriculum-management.html', key: 'nav.curriculum' },
        ],
        learner: [
            { href: 'learner-dashboard.html', key: 'nav.dashboard' },
            { href: 'video-lessons.html',     key: 'nav.videoLessons' },
            { href: 'resources.html',         key: 'nav.resources' },
        ],
        content_manager: [
            { href: 'content-manager-dashboard.html', key: 'nav.dashboard' },
            { href: 'resources.html',  key: 'nav.resources' },
        ],
        curriculum_manager: [
            { href: 'curriculum-manager-dashboard.html', key: 'nav.dashboard' },
            { href: 'curriculum-management.html', key: 'nav.curriculum' },
            { href: 'resources.html',             key: 'nav.resources' },
        ],
        finance: [
            { href: 'finance-dashboard.html',  key: 'nav.dashboard' },
            { href: 'subscription.html',       key: 'nav.subscriptions' },
        ],
        support: [
            { href: 'support-dashboard.html',  key: 'nav.dashboard' },
            { href: 'contact.html',            key: 'nav.contact' },
        ],
    },

    /** Return the array of nav items appropriate for the current viewer */
    getNavItems() {
        if (typeof IremeAuth !== 'undefined' && IremeAuth.isLoggedIn()) {
            var session = IremeAuth.getSession();
            var role = session && session.role ? String(session.role).trim().toLowerCase() : '';
            if (this.roleNavItems[role]) return this.roleNavItems[role];
        }
        return this.publicNavItems;
    },

    renderNavbar(activePage) {
        var items = this.getNavItems();
        var showLoginRegister = !(typeof IremeAuth !== 'undefined' && IremeAuth.isLoggedIn());
        
        const navLinks = items.map(item => {
            // If item has children, render as dropdown
            if (item.children && item.children.length > 0) {
                const dropdownItems = item.children.map(child => 
                    `<li><a class="dropdown-item" href="${child.href}">` +
                    (child.icon ? `<i class="fa ${child.icon} me-2 text-primary"></i>` : '') +
                    `<span data-i18n="${child.key}">${child.key}</span></a></li>`
                ).join('');
                
                return `<div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-i18n="${item.key}">${item.key}</a>
                    <ul class="dropdown-menu">
                        ${dropdownItems}
                    </ul>
                </div>`;
            }
            // Otherwise render as regular link
            return `<a href="${item.href}" class="nav-item nav-link${item.href === activePage ? ' active' : ''}" data-i18n="${item.key}">${item.key}</a>`;
        }).join('');

        var authSection = '';
        if (typeof IremeAuth !== 'undefined' && IremeAuth.isLoggedIn()) {
            var session = IremeAuth.getSession();
            var initials = session.name ? session.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substr(0, 2) : 'U';
            var dashboardUrl = IremeAuth.getDashboardUrl(session.role);
            authSection = `
                <div class="nav-item dropdown ms-lg-3">
                    <a class="btn btn-sm btn-light rounded-pill px-3 dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="btn-square bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center" style="width:28px;height:28px;font-size:11px;font-weight:700;">${initials}</span>
                        <span class="d-none d-lg-inline text-dark">${session.name.split(' ')[0]}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><h6 class="dropdown-header text-truncate" style="max-width:200px;">${session.name}</h6></li>
                        <li><a class="dropdown-item" href="${dashboardUrl}"><i class="fa fa-tachometer-alt me-2"></i><span data-i18n="auth.goDashboard">Dashboard</span></a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="IremeAuth.logout().then(function() { window.location.href = 'index.html'; }); return false;"><i class="fa fa-sign-out-alt me-2"></i><span data-i18n="auth.logout">Log Out</span></a></li>
                    </ul>
                </div>`;
        } else {
            authSection = `
                <a href="login.html" class="btn btn-sm btn-primary rounded-pill px-3 py-1 ms-lg-3" data-i18n="auth.login">Log In</a>
                <a href="register.html" class="btn btn-sm btn-primary rounded-pill px-3 py-1 ms-lg-2" data-i18n="auth.register">Register</a>`;
        }

        return `
    <div class="container-fluid sticky-top">
        <div class="container">
            <nav class="navbar navbar-expand-lg navbar-dark p-0">
                <a href="index.html" class="navbar-brand">
                    <img src="img/ireme-logo.png" alt="IREME" style="height: 50px;">
                </a>
                <div class="navbar-header-controls d-lg-none">
                    <div class="lang-switcher d-flex rounded-pill border border-white-50 overflow-hidden">
                        <button class="lang-btn btn btn-sm text-white px-2 py-0 active" data-lang="en" onclick="setLanguage('en')">EN</button>
                        <button class="lang-btn btn btn-sm text-white-50 px-2 py-0" data-lang="rw" onclick="setLanguage('rw')">RW</button>
                    </div>
                    <button type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                </div>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto align-items-lg-center">
                        ${navLinks}
                        <div class="lang-switcher ms-lg-3 d-none d-lg-flex rounded-pill border border-white-50 overflow-hidden">
                            <button class="lang-btn btn btn-sm text-white px-3 py-1 active" data-lang="en" onclick="setLanguage('en')">EN</button>
                            <button class="lang-btn btn btn-sm text-white-50 px-3 py-1" data-lang="rw" onclick="setLanguage('rw')">RW</button>
                        </div>
                        ${authSection}
                    </div>
                </div>
            </nav>
        </div>
    </div>`;
    },

    renderFooter() {
        return `
    <div class="container-fluid bg-dark text-white-50 footer pt-5">
        <div class="container py-5">
            <div class="row g-5">
                <div class="col-md-6 col-lg-3 wow fadeIn" data-wow-delay="0.1s">
                    <a href="index.html" class="d-inline-block mb-3">
                        <img src="img/ireme-logo.png" alt="IREME" style="height: 45px;">
                    </a>
                    <p class="mb-0" data-i18n="footer.desc"></p>
                </div>
                <div class="col-md-6 col-lg-3 wow fadeIn" data-wow-delay="0.3s">
                    <h5 class="text-white mb-4" data-i18n="footer.getInTouch"></h5>
                    <p><i class="fa fa-map-marker-alt me-3"></i><span data-i18n="footer.location"></span></p>
                    <p><i class="fa fa-phone-alt me-3"></i><a href="tel:+250791537354" class="text-white-50 text-decoration-none">+250 791 537 354</a></p>
                    <p><i class="fa fa-envelope me-3"></i><a href="mailto:info@iremerwanda.com" class="text-white-50 text-decoration-none">info@iremerwanda.com</a></p>
                    <div class="d-flex pt-2">
                        <a class="btn btn-outline-light btn-social" href="https://twitter.com/ireme_rw" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a>
                        <a class="btn btn-outline-light btn-social" href="https://facebook.com/iremerwanda" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a>
                        <a class="btn btn-outline-light btn-social" href="https://youtube.com/@iremerwanda" target="_blank" rel="noopener"><i class="fab fa-youtube"></i></a>
                        <a class="btn btn-outline-light btn-social" href="https://instagram.com/ireme_rw" target="_blank" rel="noopener"><i class="fab fa-instagram"></i></a>
                        <a class="btn btn-outline-light btn-social" href="https://linkedin.com/company/ireme-rwanda" target="_blank" rel="noopener"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 wow fadeIn" data-wow-delay="0.5s">
                    <h5 class="text-white mb-4" data-i18n="footer.quickLinks"></h5>
                    <a class="btn btn-link" href="about.html" data-i18n="footer.aboutUs"></a>
                    <a class="btn btn-link" href="service.html" data-i18n="footer.ourServices"></a>
                    <a class="btn btn-link" href="game-setup.html" data-i18n="footer.learningGame"></a>
                    <a class="btn btn-link" href="subscription.html" data-i18n="footer.plans"></a>
                    <a class="btn btn-link" href="contact.html" data-i18n="footer.contactUs"></a>
                    <a class="btn btn-link" href="privacy.html" data-i18n="footer.privacy"></a>
                    <a class="btn btn-link" href="terms.html" data-i18n="footer.terms"></a>
                    <a class="btn btn-link" href="career.html" data-i18n="footer.career"></a>
                </div>
                <div class="col-md-6 col-lg-3 wow fadeIn" data-wow-delay="0.7s">
                    <h5 class="text-white mb-4" data-i18n="footer.ourServices"></h5>
                    <a class="btn btn-link" href="service.html" data-i18n="footer.aiAssistant"></a>
                    <a class="btn btn-link" href="resources.html" data-i18n="footer.curriculum"></a>
                    <a class="btn btn-link" href="student-dashboard.html" data-i18n="footer.studentHub"></a>
                    <a class="btn btn-link" href="teacher-dashboard.html" data-i18n="footer.teacherTools"></a>
                    <a class="btn btn-link" href="project.html" data-i18n="footer.educationPrograms"></a>
                </div>
            </div>
        </div>
        <div class="container wow fadeIn" data-wow-delay="0.1s">
            <div class="copyright">
                <div class="row">
                    <div class="col-md-6 text-center text-md-start mb-3 mb-md-0">
                        &copy; <a class="border-bottom" href="index.html">IREME</a>, <span data-i18n="footer.rights"></span>
                    </div>
                    <div class="col-md-6 text-center text-md-end">
                        <div class="footer-menu">
                            <a href="index.html" data-i18n="nav.home"></a>
                            <a href="subscription.html" data-i18n="footer.cookies"></a>
                            <a href="contact.html" data-i18n="footer.help"></a>
                            <a href="faqs.html" data-i18n="footer.faqs"></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    },

    renderBackToTop() {
        return `<a href="#" class="btn btn-lg btn-primary btn-lg-square back-to-top pt-2"><i class="bi bi-arrow-up"></i></a>`;
    },

    renderSpinner() {
        return `
    <div id="spinner" class="bg-white position-fixed translate-middle w-100 vh-100 top-50 start-50 d-flex align-items-center justify-content-center">
        <div class="spinner-grow text-primary" style="width: 3rem; height: 3rem;" role="status">
            <span class="sr-only" data-i18n="spinner.loading">Loading...</span>
        </div>
    </div>`;
    },

    renderHero(titleKey, breadcrumbKeys) {
        const crumbs = breadcrumbKeys.map((key, i) => {
            const isLast = i === breadcrumbKeys.length - 1;
            const href = isLast ? '#' : (i === 0 ? 'index.html' : '#');
            return `<li class="breadcrumb-item${isLast ? ' text-white active' : ''}"><a class="text-white" href="${href}" data-i18n="${key}"></a></li>`;
        }).join('');

        return `
    <div class="container-fluid pt-5 bg-primary hero-header">
        <div class="container pt-5">
            <div class="row g-5 pt-5">
                <div class="col-lg-6 align-self-center text-center text-lg-start mb-lg-5">
                    <h1 class="display-4 text-white mb-4 animated slideInRight" data-i18n="${titleKey}"></h1>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb justify-content-center justify-content-lg-start mb-0">${crumbs}</ol>
                    </nav>
                </div>
                <div class="col-lg-6 align-self-end text-center text-lg-end">
                    <img class="img-fluid" src="img/hero-img.png" alt="" style="max-height: 300px;">
                </div>
            </div>
        </div>
    </div>`;
    },

    renderScriptTags(extraScripts) {
        const scripts = [
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js',
            'https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js',
            'lib/wow/wow.min.js',
            'lib/easing/easing.min.js',
            'lib/waypoints/waypoints.min.js',
            'js/main.js',
            'js/i18n.js',
            'js/config.js',
            'js/api-client.js',
            'js/auth.js',
            'js/components.js',
        ];
        if (extraScripts) scripts.push(...extraScripts);
        return scripts.map(s => `<script src="${s}"></script>`).join('\n    ');
    },

    initPage(activePage, extraScripts) {
        document.addEventListener('DOMContentLoaded', () => {
            const spinner = document.getElementById('component-spinner');
            if (spinner) spinner.outerHTML = this.renderSpinner();

            const navbar = document.getElementById('component-navbar');
            if (navbar) navbar.outerHTML = this.renderNavbar(activePage);

            const footer = document.getElementById('component-footer');
            if (footer) footer.outerHTML = this.renderFooter();

            const btt = document.getElementById('component-backtotop');
            if (btt) btt.outerHTML = this.renderBackToTop();

            if (typeof initLanguage === 'function') initLanguage();
            if (typeof IremeAuth !== 'undefined' && IremeAuth.verifySession) IremeAuth.verifySession();
            new WOW().init();
        });
    }
};
