const IremeComponents = {
    navItems: [
        { href: 'index.html', key: 'nav.home' },
        { href: 'about.html', key: 'nav.about' },
        { href: 'service.html', key: 'nav.services' },
        { href: 'project.html', key: 'nav.programs' },
        { href: 'game-setup.html', key: 'nav.game' },
        { href: 'contact.html', key: 'nav.contact' },
    ],

    renderNavbar(activePage) {
        const navLinks = this.navItems.map(item =>
            `<a href="${item.href}" class="nav-item nav-link${item.href === activePage ? ' active' : ''}" data-i18n="${item.key}"></a>`
        ).join('');

        return `
    <div class="container-fluid sticky-top">
        <div class="container">
            <nav class="navbar navbar-expand-lg navbar-dark p-0">
                <a href="index.html" class="navbar-brand">
                    <img src="img/ireme-logo.png" alt="IREME" style="height: 50px;">
                </a>
                <button type="button" class="navbar-toggler ms-auto me-0" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto align-items-lg-center">
                        ${navLinks}
                        <div class="lang-switcher ms-lg-3 d-flex rounded-pill border border-white-50 overflow-hidden">
                            <button class="lang-btn btn btn-sm text-white px-3 py-1 active" data-lang="en" onclick="setLanguage('en')">EN</button>
                            <button class="lang-btn btn btn-sm text-white-50 px-3 py-1" data-lang="rw" onclick="setLanguage('rw')">RW</button>
                        </div>
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
                        <a class="btn btn-outline-light btn-social" href=""><i class="fab fa-twitter"></i></a>
                        <a class="btn btn-outline-light btn-social" href=""><i class="fab fa-facebook-f"></i></a>
                        <a class="btn btn-outline-light btn-social" href=""><i class="fab fa-youtube"></i></a>
                        <a class="btn btn-outline-light btn-social" href=""><i class="fab fa-instagram"></i></a>
                        <a class="btn btn-outline-light btn-social" href=""><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 wow fadeIn" data-wow-delay="0.5s">
                    <h5 class="text-white mb-4" data-i18n="footer.quickLinks"></h5>
                    <a class="btn btn-link" href="about.html" data-i18n="footer.aboutUs"></a>
                    <a class="btn btn-link" href="service.html" data-i18n="footer.ourServices"></a>
                    <a class="btn btn-link" href="game-setup.html" data-i18n="footer.learningGame"></a>
                    <a class="btn btn-link" href="subscription.html" data-i18n="footer.plans"></a>
                    <a class="btn btn-link" href="contact.html" data-i18n="footer.contactUs"></a>
                    <a class="btn btn-link" href="" data-i18n="footer.privacy"></a>
                    <a class="btn btn-link" href="" data-i18n="footer.terms"></a>
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
                            <a href="" data-i18n="footer.cookies"></a>
                            <a href="" data-i18n="footer.help"></a>
                            <a href="" data-i18n="footer.faqs"></a>
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
    <div id="spinner" class="show bg-white position-fixed translate-middle w-100 vh-100 top-50 start-50 d-flex align-items-center justify-content-center">
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
            new WOW().init();
        });
    }
};
