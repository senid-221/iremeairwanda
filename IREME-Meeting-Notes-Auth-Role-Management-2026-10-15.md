# IREME Platform Authentication & Role-Based Management System - Meeting Notes

**Meeting Date:** 2026-10-15  
**Project:** IREME Rwanda Education Platform  
**Topic:** Complete Authentication System, Role-Based Login Pages and Dashboards Development

---

## 1. Meeting Objective

Develop a complete, production-ready authentication and dashboard system for the existing IREME Rwanda Education Platform. Extend the current application rather than rebuilding from scratch. Every user type must have the correct registration/login process, permissions, dashboard, and navigation.

---

## 2. User Roles & Dashboards (9 Portals)

### 2.1 Student Portal
- **Routes:** `/student/login`, `/student/register`, `/student/dashboard`
- **Core Features:**
  - Student profile (avatar, education level, class, school, language preference)
  - P1-P6, S1-S6, TTC, TVET programme support
  - AI Tutor and personalized learning recommendations
  - Quizzes, assignments, examinations, results, and progress reports
  - Educational games (Fighting by Questions, etc.)
  - Saved books, notes, revision plans, learning history
  - Notifications, achievements, account settings
  - Subscription/plan status
- **Permission Requirement:** Students must only access their own private records

### 2.2 Teacher Portal
- **Routes:** `/teacher/login`, `/teacher/register`, `/teacher/dashboard`
- **Core Features:**
  - Teacher profile (qualifications, assigned school, subjects, classes)
  - Class and student management
  - Create and manage assignments, quizzes, examinations
  - Upload learning resources and teaching materials
  - Grade submissions and provide feedback
  - Monitor student performance and identify learning gaps
  - AI Tutor and AI-assisted lesson preparation
  - Curriculum-aligned lesson plans and revision activities
- **Permission Requirement:** Teacher registrations must be verified before granting access to protected functions

### 2.3 Parent/Guardian Portal
- **Routes:** `/parent/login`, `/parent/register`, `/parent/dashboard`
- **Core Features:**
  - Manage guardian profile
  - Secure linking to student accounts (requires secure invitation or verified process)
  - View authorized children's academic progress, attendance, assignments, results
  - Receive school announcements and important notifications
  - View teacher feedback and upcoming assessments
  - Manage privacy, notification preferences, account security
- **Permission Requirement:** Parents must never link themselves to a child merely by entering a name. Use a secure invitation or verified school process.

### 2.4 School Owner/Administrator Portal
- **Routes:** `/school/login`, `/school/register`, `/school/dashboard`
- **Core Features:**
  - Claim an existing school profile or submit a new school for review
  - Verify school ownership and administrative authority
  - Manage school info (name, contact, location, education levels, subjects, facilities, photos)
  - Manage authorized staff, teachers, classes, student records
  - View school-level academic statistics and reports
  - Manage school announcements and learning activities
  - Submit school information changes for verification
  - View school verification status and audit history
- **Permission Requirement:** Claiming a school must not automatically grant administrative access. A school owner may manage only the school(s) for which they have been authorized.

### 2.5 TTC/TVET Learner Portal
- **Routes:** `/learner/login`, `/learner/register`, `/learner/dashboard`
- **Core Features:**
  - Programme, qualification, level, trade, module, and competency information
  - Practical learning records, assessments, and progress
  - Relevant learning resources and AI tutoring
  - Training history and verified achievements
- **Permission Requirement:** Reuse student authentication system but display the correct programme-specific dashboard and permissions

### 2.6 Content Manager Portal
- **Routes:** `/content-manager/login`, `/content-manager/dashboard`
- **Core Features:**
  - Manage approved learning resources, textbooks, teacher guides, assessments
  - Review content submissions and verify source information
  - Track approval status, publication history, changes
  - View records that need verification
- **Permission Requirement:** Limited permissions. Must not automatically receive access to user management, billing, security settings, or super-admin dashboard.

### 2.7 Curriculum Manager Portal
- **Routes:** `/curriculum-manager/login`, `/curriculum-manager/dashboard`
- **Core Features:**
  - Manage curriculum levels, subjects, programmes, modules, versions
  - Import and export curriculum data
  - Track approval status and change history
- **Permission Requirement:** Limited permissions. Must not automatically receive access to user management, billing, security settings, or super-admin dashboard.

### 2.8 Platform Administrator Portal
- **Routes:** `/admin/login`, `/admin/dashboard`
- **Core Features:**
  - Manage users, roles, account status, access requests
  - Review and approve teacher, school, privileged-account applications
  - Verify school claims and manage the school directory
  - Manage curriculum catalogues, content approvals, educational resources
  - Manage subscriptions, payment records, platform configuration
  - View platform usage statistics, audit logs, errors, system health
  - Manage notifications and support requests
  - Configure permissions and administrative workflows
  - Export authorized reports

### 2.9 Super Administrator Portal
- **Routes:** `/super-admin/login`, `/super-admin/dashboard`
- **Core Features:**
  - Manage administrator accounts and assign administrative roles
  - Configure role permissions and security policies
  - Review sensitive audit logs and security events
  - Manage system-wide settings and integrations
  - Monitor database, API, and background-job health
  - Manage administrative access and account recovery procedures
- **Permission Requirements:**
  - Highest level of platform access
  - Granted only through a secure, controlled provisioning process
  - Never create public super-admin registration
  - Never expose a default administrator password

### 2.10 Support & Finance Portals (Optional)
- **Routes:** `/support/login`, `/support/dashboard`, `/finance/login`, `/finance/dashboard`
- **Support Staff:** May manage authorized support tickets and account assistance but must not access private educational records unnecessarily
- **Finance Staff:** May manage authorized subscription, payment, and transaction records but must not have unrestricted access to academic or security administration

---

## 3. Authentication Pages

Each role requires the following pages:
- Login page
- Registration page (where permitted)
- Email/phone verification
- Forgot password
- Secure password reset
- Logout
- Session expiration and renewal
- Unauthorized and access-denied pages
- Account pending approval page
- Account suspended/disabled page
- Account recovery and security settings

**Requirements:**
- Each login page must clearly identify the relevant portal
- Provide navigation to appropriate login/registration pages
- Avoid duplicating authentication logic unnecessarily
- Use shared, reusable authentication components
- Preserve role-specific routes and content

---

## 4. Role-Based Access Control (RBAC)

### Core Requirements:
1. **Server-Side Validation:** Every protected API and sensitive operation must validate role permissions on the server
2. **Explicit Role Assignment:** Each account must have an explicit role and account status
3. **Prevent Privilege Escalation:**
   - Prevent users from changing their own role or privileges through requests, browser tools, or modified form data
   - Prevent horizontal privilege escalation between students, parents, teachers, and schools
4. **Account Approval Verification:** Verify account approval status before granting privileged access
5. **High-Risk Operation Verification:** Require strong additional verification for high-risk administrative actions
6. **Audit Log:** Record important administrative and security events
7. **No Public Privileged Registration:** Public registration must never allow a visitor to create an administrator, super administrator, or other privileged account directly

---

## 5. Login Redirects & Navigation

### Redirect Rules:
- Student -> `/student/dashboard`
- Teacher -> `/teacher/dashboard`
- Parent -> `/parent/dashboard`
- School Administrator -> `/school/dashboard`
- TTC/TVET Learner -> `/learner/dashboard`
- Content Manager -> `/content-manager/dashboard`
- Curriculum Manager -> `/curriculum-manager/dashboard`
- Support Staff -> `/support/dashboard`
- Finance Staff -> `/finance/dashboard`
- Administrator -> `/admin/dashboard`
- Super Administrator -> `/super-admin/dashboard`

### Security Requirements:
- Validate redirect destinations server-side
- Prevent open redirects
- Prevent users from entering another role's dashboard simply by changing the URL
- If a user has more than one explicitly authorized role, provide a secure portal switcher

---

## 6. Database & API Integration

### Models and Relationships to Implement/Extend:
- Users and profiles
- Roles and permissions
- Schools and school memberships
- Student-guardian relationships
- Teacher assignments and school affiliations
- Verification and approval requests
- Sessions, verification tokens, password-reset tokens
- Notifications
- Audit events
- Subscription and payment records (where supported)

### Database Requirements:
- Safe database migrations
- Unique constraints
- Index optimization
- Input validation
- Appropriate foreign key relationships

### Data Requirements:
- Every dashboard must display real data retrieved through authenticated APIs or server-side database queries
- Do not use fabricated statistics, demo users, static buttons, or placeholder functionality

---

## 7. UI & User Experience

### Design Requirements:
- Preserve IREME's existing branding, colors, fonts, layout principles, and animations
- Create clean, responsive login pages and dashboards for desktop, tablet, and mobile
- Use consistent spacing, readable typography, real icons from a maintained icon library, accessible form controls
- Add search, filters, pagination, loading indicators, empty states, validation messages, and error handling where needed
- Use role-specific sidebar navigation and dashboard widgets
- Ensure each button and menu item performs its intended action
- Keep dashboards compact, organized, and easy to navigate
- Support IREME's existing English and Kinyarwanda language requirements

### Prohibited:
- Do not replace existing animations
- Do not redesign unrelated pages

---

## 8. Privacy & Security

### Security Measures:
1. **Password Security:** Hash passwords using a recognized secure password-hashing algorithm
2. **Session Security:** Use secure, appropriately configured sessions or authentication tokens
3. **CSRF Protection:** Apply CSRF protection where applicable, rate limits, and brute-force protections
4. **Input Validation:** Validate and sanitize user inputs on the server
5. **File Upload Security:** Protect uploaded profile pictures and documents with file-type, size, authorization, and storage checks
6. **Secret Protection:** Keep secrets and privileged credentials out of frontend code and version control
7. **Least-Privilege Access:** Apply least-privilege access to children's educational information
8. **API Security:** Do not expose private records through public APIs or dashboard statistics
9. **Privacy Controls:** Add appropriate account deletion, retention, and privacy controls

---

## 9. Implementation Workflow

### 10-Step Implementation Plan:

1. **Audit Existing System**
   - Audit existing repository, routes, database, authentication, permissions
   - Identify existing functional components and reuse them

2. **Create Role-Permission Matrix**
   - Create a role-permission matrix before implementation

3. **Implement Database Changes**
   - Implement database changes and migrations

4. **Implement Authentication APIs**
   - Implement authentication, verification, and authorization APIs

5. **Build Login/Registration Pages**
   - Build role-specific login and registration pages

6. **Build Dashboards**
   - Build dashboards connected to real backend data

7. **Connect Education Modules**
   - Connect each dashboard to the existing IREME education modules

8. **Test Permissions & Access**
   - Test account approval, redirects, permissions, and cross-role access

9. **Run Migrations & Tests**
   - Run migrations, automated tests, production build

10. **Deployment Checks**
    - Deployment checks and validation

### Prohibited:
- Do not remove existing functionality
- Do not introduce a second authentication system that conflicts with the current one

---

## 10. Acceptance Criteria

Implementation is complete only when ALL of the following are met:

- [ ] Every required role has the correct login page and dashboard
- [ ] Public registration cannot create privileged accounts
- [ ] Protected routes and APIs enforce server-side permissions
- [ ] Users are redirected to the correct dashboard
- [ ] School ownership, parent-child relationships, and privileged roles are verified
- [ ] Dashboards load real database-backed information
- [ ] Unauthorized access attempts are denied
- [ ] Password recovery, verification, logout, and session expiry work correctly
- [ ] Existing IREME features remain functional
- [ ] Automated tests and the production build pass

---

## 11. Documentation Requirements

Must document the following:
- Route listing
- Role definitions
- Permission matrix
- Database migrations
- Environment variables
- Test coverage

---

## 12. Key Decisions & Constraints

### Must Follow:
1. **Extend Existing Application** - Do not create a separate application or rebuild from scratch
2. **Server-Side Security** - Do not rely on hidden buttons, frontend checks, or URL obscurity as security
3. **Real Data** - Dashboards must display real data; no demo data or placeholders
4. **Design Consistency** - Preserve IREME's existing branding and design system
5. **Bilingual Support** - Support English and Kinyarwanda

### Security Red Lines:
1. Public registration must never create privileged accounts
2. Super admin can only be provisioned through a secure, controlled process
3. Parents cannot link to a child merely by entering a name
4. School claiming must not automatically grant administrative access
5. Prevent all forms of privilege escalation (vertical and horizontal)

---

## 13. Next Steps

### Immediate Action Items:
1. Audit existing repository authentication and database schema
2. Create detailed role-permission matrix
3. Design database models and migration plan
4. Identify reusable existing components

### Technical Decisions Pending:
- Authentication provider selection (custom vs third-party)
- Session management strategy (JWT vs Session)
- File storage solution
- Email/SMS verification service

---

## 14. Meeting Summary

This meeting defined the detailed specification for IREME platform's complete authentication and role-based management system. The system will support 9 major user portals, each with specific features, permissions, and dashboards.

**Core Principles:**
- Security first (server-side validation, RBAC, audit logs)
- Real data (no demo data, no placeholders)
- Design consistency (preserve IREME branding)
- User experience (responsive, bilingual, easy navigation)

**Final Instruction:** Implement this in the existing IREME repository as a working, secure, database-connected education platform. Do not deliver only UI mockups or static dashboards.

---

**Document Date:** 2026-10-15  
**Version:** 1.0  
**Status:** Pending Implementation
