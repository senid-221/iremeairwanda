require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create system roles
  const roles = [
    { name: 'STUDENT', displayName: 'Student', description: 'Regular student user', isSystem: true },
    { name: 'TEACHER', displayName: 'Teacher', description: 'Teacher user with classroom management', isSystem: true },
    { name: 'PARENT', displayName: 'Parent', description: 'Parent or guardian user', isSystem: true },
    { name: 'HEADTEACHER', displayName: 'Headteacher', description: 'School administrator', isSystem: true },
    { name: 'ADMIN', displayName: 'Administrator', description: 'Platform administrator', isSystem: true },
    { name: 'SUPER_ADMIN', displayName: 'Super Administrator', description: 'Super admin with full system access', isSystem: true },
  ];

  console.log('Creating system roles...');
  for (const role of roles) {
    await prisma.roleDefinition.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  // Create permissions
  const permissions = [
    // User management
    { name: 'users.view', displayName: 'View Users', resource: 'users', action: 'view' },
    { name: 'users.create', displayName: 'Create Users', resource: 'users', action: 'create' },
    { name: 'users.update', displayName: 'Update Users', resource: 'users', action: 'update' },
    { name: 'users.delete', displayName: 'Delete Users', resource: 'users', action: 'delete' },
    
    // School management
    { name: 'schools.view', displayName: 'View Schools', resource: 'schools', action: 'view' },
    { name: 'schools.create', displayName: 'Create Schools', resource: 'schools', action: 'create' },
    { name: 'schools.update', displayName: 'Update Schools', resource: 'schools', action: 'update' },
    { name: 'schools.verify', displayName: 'Verify Schools', resource: 'schools', action: 'verify' },
    
    // Curriculum management
    { name: 'curriculum.view', displayName: 'View Curriculum', resource: 'curriculum', action: 'view' },
    { name: 'curriculum.manage', displayName: 'Manage Curriculum', resource: 'curriculum', action: 'manage' },
    { name: 'curriculum.import', displayName: 'Import Curriculum', resource: 'curriculum', action: 'import' },
    
    // Game management
    { name: 'games.play', displayName: 'Play Games', resource: 'games', action: 'play' },
    { name: 'games.manage', displayName: 'Manage Games', resource: 'games', action: 'manage' },
    { name: 'games.view_leaderboard', displayName: 'View Leaderboard', resource: 'games', action: 'view_leaderboard' },
    
    // Assessment management
    { name: 'assessments.view', displayName: 'View Assessments', resource: 'assessments', action: 'view' },
    { name: 'assessments.create', displayName: 'Create Assessments', resource: 'assessments', action: 'create' },
    { name: 'assessments.grade', displayName: 'Grade Assessments', resource: 'assessments', action: 'grade' },
    
    // Resource management
    { name: 'resources.view', displayName: 'View Resources', resource: 'resources', action: 'view' },
    { name: 'resources.upload', displayName: 'Upload Resources', resource: 'resources', action: 'upload' },
    { name: 'resources.verify', displayName: 'Verify Resources', resource: 'resources', action: 'verify' },
    
    // Admin functions
    { name: 'admin.access', displayName: 'Access Admin Panel', resource: 'admin', action: 'access' },
    { name: 'admin.manage_roles', displayName: 'Manage Roles', resource: 'admin', action: 'manage_roles' },
    { name: 'admin.manage_permissions', displayName: 'Manage Permissions', resource: 'admin', action: 'manage_permissions' },
    { name: 'admin.view_audit_logs', displayName: 'View Audit Logs', resource: 'admin', action: 'view_audit_logs' },
    { name: 'admin.manage_settings', displayName: 'Manage Settings', resource: 'admin', action: 'manage_settings' },
    { name: 'admin.manage_feature_flags', displayName: 'Manage Feature Flags', resource: 'admin', action: 'manage_feature_flags' },
  ];

  console.log('Creating permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
  }

  // Assign permissions to roles
  console.log('Assigning permissions to roles...');
  
  const studentRole = await prisma.roleDefinition.findUnique({ where: { name: 'STUDENT' } });
  const teacherRole = await prisma.roleDefinition.findUnique({ where: { name: 'TEACHER' } });
  const parentRole = await prisma.roleDefinition.findUnique({ where: { name: 'PARENT' } });
  const headteacherRole = await prisma.roleDefinition.findUnique({ where: { name: 'HEADTEACHER' } });
  const adminRole = await prisma.roleDefinition.findUnique({ where: { name: 'ADMIN' } });
  const superAdminRole = await prisma.roleDefinition.findUnique({ where: { name: 'SUPER_ADMIN' } });

  // Student permissions
  const studentPermissions = [
    'games.play', 'games.view_leaderboard',
    'assessments.view',
    'resources.view',
    'curriculum.view',
  ];
  
  for (const permName of studentPermissions) {
    const permission = await prisma.permission.findUnique({ where: { name: permName } });
    if (permission && studentRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: studentRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: studentRole.id, permissionId: permission.id },
      });
    }
  }

  // Teacher permissions
  const teacherPermissions = [
    ...studentPermissions,
    'assessments.create', 'assessments.grade',
    'resources.upload',
    'schools.view',
  ];
  
  for (const permName of teacherPermissions) {
    const permission = await prisma.permission.findUnique({ where: { name: permName } });
    if (permission && teacherRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: teacherRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: teacherRole.id, permissionId: permission.id },
      });
    }
  }

  // Parent permissions
  const parentPermissions = [
    'games.view_leaderboard',
    'resources.view',
    'schools.view',
  ];
  
  for (const permName of parentPermissions) {
    const permission = await prisma.permission.findUnique({ where: { name: permName } });
    if (permission && parentRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: parentRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: parentRole.id, permissionId: permission.id },
      });
    }
  }

  // Headteacher permissions
  const headteacherPermissions = [
    ...teacherPermissions,
    'schools.update',
    'curriculum.manage',
  ];
  
  for (const permName of headteacherPermissions) {
    const permission = await prisma.permission.findUnique({ where: { name: permName } });
    if (permission && headteacherRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: headteacherRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: headteacherRole.id, permissionId: permission.id },
      });
    }
  }

  // Admin permissions
  const adminPermissions = [
    ...headteacherPermissions,
    'users.view', 'users.create', 'users.update',
    'schools.create', 'schools.verify',
    'resources.verify',
    'games.manage',
    'admin.access', 'admin.view_audit_logs',
  ];
  
  for (const permName of adminPermissions) {
    const permission = await prisma.permission.findUnique({ where: { name: permName } });
    if (permission && adminRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }
  }

  // Super admin gets all permissions
  if (superAdminRole) {
    for (const permission of permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permission.name } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: superAdminRole.id, permissionId: perm.id },
        });
      }
    }
  }

  // Create education levels (granular, matching the game and lesson selectors)
  console.log('Creating education levels...');
  const educationLevels = [
    { code: 'P1', name: 'Primary 1', nameEn: 'Primary 1', nameRw: 'Umwaka wa 1 Ubanza', levelType: 'primary', gradeRange: 'P1', displayOrder: 1 },
    { code: 'P2', name: 'Primary 2', nameEn: 'Primary 2', nameRw: 'Umwaka wa 2 Ubanza', levelType: 'primary', gradeRange: 'P2', displayOrder: 2 },
    { code: 'P3', name: 'Primary 3', nameEn: 'Primary 3', nameRw: 'Umwaka wa 3 Ubanza', levelType: 'primary', gradeRange: 'P3', displayOrder: 3 },
    { code: 'P4', name: 'Primary 4', nameEn: 'Primary 4', nameRw: 'Umwaka wa 4 Ubanza', levelType: 'primary', gradeRange: 'P4', displayOrder: 4 },
    { code: 'P5', name: 'Primary 5', nameEn: 'Primary 5', nameRw: 'Umwaka wa 5 Ubanza', levelType: 'primary', gradeRange: 'P5', displayOrder: 5 },
    { code: 'P6', name: 'Primary 6', nameEn: 'Primary 6', nameRw: 'Umwaka wa 6 Ubanza', levelType: 'primary', gradeRange: 'P6', displayOrder: 6 },
    { code: 'S1', name: 'Lower Secondary 1', nameEn: 'Senior 1', nameRw: 'Umwaka wa 1 wungirije', levelType: 'secondary', gradeRange: 'S1 (Ordinary)', displayOrder: 7 },
    { code: 'S2', name: 'Lower Secondary 2', nameEn: 'Senior 2', nameRw: 'Umwaka wa 2 wungirije', levelType: 'secondary', gradeRange: 'S2 (Ordinary)', displayOrder: 8 },
    { code: 'S3', name: 'Lower Secondary 3', nameEn: 'Senior 3', nameRw: 'Umwaka wa 3 wungirije', levelType: 'secondary', gradeRange: 'S3 (Ordinary)', displayOrder: 9 },
    { code: 'S4', name: 'Upper Secondary 1', nameEn: 'Senior 4', nameRw: 'Umwaka wa 4 wungirije', levelType: 'secondary', gradeRange: 'S4 (Advanced)', displayOrder: 10 },
    { code: 'S5', name: 'Upper Secondary 2', nameEn: 'Senior 5', nameRw: 'Umwaka wa 5 wungirije', levelType: 'secondary', gradeRange: 'S5 (Advanced)', displayOrder: 11 },
    { code: 'S6', name: 'Upper Secondary 3', nameEn: 'Senior 6', nameRw: 'Umwaka wa 6 wungirije', levelType: 'secondary', gradeRange: 'S6 (Advanced)', displayOrder: 12 },
    { code: 'TTC', name: 'Teacher Training College', nameEn: 'Teacher Training College', nameRw: "Ishuri ry'Abarezi", levelType: 'ttc', gradeRange: 'Year 1-3', displayOrder: 13 },
    { code: 'TVET', name: 'Technical and Vocational Education', nameEn: 'Technical and Vocational Education', nameRw: "Imyuga n'Ubumeni", levelType: 'tvet', gradeRange: 'RQF Level 1-5', displayOrder: 14 },
  ];

  for (const level of educationLevels) {
    await prisma.educationLevel.upsert({
      where: { code: level.code },
      update: level,
      create: level,
    });
  }

  // Deactivate legacy grouped level rows from earlier seeds, if present
  for (const legacyCode of ['P1-P6', 'S1-S3', 'S4-S6']) {
    await prisma.educationLevel.updateMany({ where: { code: legacyCode }, data: { isActive: false } });
  }

  // Create subjects from the REB-sourced curriculum catalogue (AiTech/js/curriculum-data.js)
  // verificationStatus/sourceName are carried over from the catalogue's review status.
  console.log('Creating subjects...');
  const REVIEWED_AT = new Date('2026-10-15');
  const REB_PRIMARY = 'REB Primary Curriculum Framework';
  const REB_ORDINARY = 'REB Ordinary Level Curriculum';
  const REB_ADVANCED = 'REB Advanced Level Curriculum';

  const subjects = [
    { code: 'MAT', name: 'Mathematics', nameEn: 'Mathematics', nameRw: 'Imibare', subjectType: 'mathematics', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'], coreLevels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    { code: 'ENG', name: 'English', nameEn: 'English', nameRw: 'Icyongereza', subjectType: 'language', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'], coreLevels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    { code: 'KIN', name: 'Kinyarwanda', nameEn: 'Kinyarwanda', nameRw: 'Ikinyarwanda', subjectType: 'language', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'], coreLevels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3'] },
    { code: 'FRE', name: 'French', nameEn: 'French', nameRw: 'Igifaransa', subjectType: 'language', sourceName: REB_PRIMARY, levels: ['P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'], coreLevels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    { code: 'SCI', name: 'Science', nameEn: 'Science', nameRw: 'Ubumenyi', subjectType: 'science', sourceName: REB_PRIMARY, levels: ['P4', 'P5', 'P6'], coreLevels: [] },
    { code: 'ISC', name: 'Integrated Science', nameEn: 'Integrated Science', nameRw: 'Ubumenyi Rusange', subjectType: 'science', sourceName: REB_ORDINARY, levels: ['S1', 'S2', 'S3'], coreLevels: [] },
    { code: 'SST', name: 'Social Studies', nameEn: 'Social Studies', nameRw: "Imibereho Y'abantu", subjectType: 'social', sourceName: REB_PRIMARY, levels: ['P4', 'P5', 'P6', 'S1', 'S2', 'S3'], coreLevels: [] },
    { code: 'PHY', name: 'Physics', nameEn: 'Physics', nameRw: 'Fiziki', subjectType: 'science', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'CHE', name: 'Chemistry', nameEn: 'Chemistry', nameRw: 'Shimi', subjectType: 'science', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'BIO', name: 'Biology', nameEn: 'Biology', nameRw: 'Biyoloji', subjectType: 'science', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'GEO', name: 'Geography', nameEn: 'Geography', nameRw: 'Geografi', subjectType: 'social', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'HIS', name: 'History', nameEn: 'History', nameRw: 'Amateka', subjectType: 'social', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'ECO', name: 'Economics', nameEn: 'Economics', nameRw: 'Ubukungu', subjectType: 'commerce', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'ENT', name: 'Entrepreneurship', nameEn: 'Entrepreneurship', nameRw: 'Ubucuruzi', subjectType: 'commerce', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'COM', name: 'Computer Science', nameEn: 'Computer Science', nameRw: 'Ikoranabuhanga', subjectType: 'vocational', sourceName: REB_ADVANCED, levels: ['S4', 'S5', 'S6'], coreLevels: [] },
    { code: 'RED', name: 'Religious Education', nameEn: 'Religious Education', nameRw: 'Uburezi Bukomoka Ku Myemerere', subjectType: 'social', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], coreLevels: [] },
    { code: 'PED', name: 'Physical Education', nameEn: 'Physical Education', nameRw: 'Imyitozo Ngororamubiri', subjectType: 'arts', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], coreLevels: [] },
    { code: 'ART', name: 'Creative Arts', nameEn: 'Creative Arts', nameRw: 'Ubuhanzi', subjectType: 'arts', sourceName: REB_PRIMARY, levels: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], coreLevels: [] },
  ];

  const levelByCode = {};
  for (const level of educationLevels) {
    levelByCode[level.code] = await prisma.educationLevel.findUnique({ where: { code: level.code } });
  }

  for (const subject of subjects) {
    const saved = await prisma.subject.upsert({
      where: { code: subject.code },
      update: {
        name: subject.name,
        nameEn: subject.nameEn,
        nameRw: subject.nameRw,
        subjectType: subject.subjectType,
        sourceName: subject.sourceName,
        verificationStatus: 'verified',
        lastReviewedAt: REVIEWED_AT,
        isActive: true,
      },
      create: {
        code: subject.code,
        name: subject.name,
        nameEn: subject.nameEn,
        nameRw: subject.nameRw,
        subjectType: subject.subjectType,
        sourceName: subject.sourceName,
        verificationStatus: 'verified',
        lastReviewedAt: REVIEWED_AT,
      },
    });

    let displayOrder = 0;
    for (const levelCode of subject.levels) {
      displayOrder++;
      const level = levelByCode[levelCode];
      if (!level) continue;
      const existing = await prisma.levelSubject.findFirst({
        where: { educationLevelId: level.id, subjectId: saved.id, academicYearId: null },
      });
      const isCore = subject.coreLevels.includes(levelCode);
      if (existing) {
        await prisma.levelSubject.update({ where: { id: existing.id }, data: { isCore, displayOrder } });
      } else {
        await prisma.levelSubject.create({
          data: { educationLevelId: level.id, subjectId: saved.id, isCore, displayOrder },
        });
      }
    }
  }

  // TTC and TVET programmes are pending verification against official documents
  console.log('Creating TTC/TVET programmes (pending verification)...');
  const programmes = [
    { educationLevelCode: 'TTC', code: 'ECE', name: 'Early Childhood Education', nameEn: 'Early Childhood Education', nameRw: "Uburezi Bw'Imfura", programmeType: 'ttc', verificationStatus: 'pending' },
    { educationLevelCode: 'TTC', code: 'PRT', name: 'Primary Teacher Training', nameEn: 'Primary Teacher Training', nameRw: "Amahugurwa Y'Abigisha B'amashuri Abanza", programmeType: 'ttc', verificationStatus: 'pending' },
    { educationLevelCode: 'TVET', code: 'CON', name: 'Construction', nameEn: 'Construction', nameRw: 'Ubwubatsi', programmeType: 'tvet', verificationStatus: 'pending' },
    { educationLevelCode: 'TVET', code: 'ELE', name: 'Electrical Engineering', nameEn: 'Electrical Engineering', nameRw: 'Amashanyarazi', programmeType: 'tvet', verificationStatus: 'pending' },
    { educationLevelCode: 'TVET', code: 'AGR', name: 'Agriculture', nameEn: 'Agriculture', nameRw: 'Ubuhinzi', programmeType: 'tvet', verificationStatus: 'pending' },
  ];

  for (const programme of programmes) {
    const level = levelByCode[programme.educationLevelCode];
    if (!level) continue;
    await prisma.curriculumProgramme.upsert({
      where: { code: programme.code },
      update: {
        name: programme.name,
        nameEn: programme.nameEn,
        nameRw: programme.nameRw,
        programmeType: programme.programmeType,
        verificationStatus: programme.verificationStatus,
        description: 'Pending verification against official curriculum documents.',
      },
      create: {
        educationLevelId: level.id,
        code: programme.code,
        name: programme.name,
        nameEn: programme.nameEn,
        nameRw: programme.nameRw,
        programmeType: programme.programmeType,
        verificationStatus: programme.verificationStatus,
        description: 'Pending verification against official curriculum documents.',
      },
    });
  }

  // Create game modes
  console.log('Creating game modes...');
  const gameModes = [
    { code: 'quick', name: 'Quick Match', nameEn: 'Quick Match', nameRw: 'Umukino wa Vuba', gameType: 'quick', minPlayers: 2, maxPlayers: 2, totalRounds: 10, roundTimeSeconds: 30 },
    { code: '1v1', name: '1v1 Battle', nameEn: '1v1 Battle', nameRw: 'Intambara 1v1', gameType: 'battle', minPlayers: 2, maxPlayers: 2, totalRounds: 15, roundTimeSeconds: 45 },
    { code: 'ai', name: 'AI Practice', nameEn: 'AI Practice', nameRw: 'Kwitoza na AI', gameType: 'practice', minPlayers: 1, maxPlayers: 1, totalRounds: 10, roundTimeSeconds: 60 },
    { code: 'revision', name: 'Revision Battle', nameEn: 'Revision Battle', nameRw: 'Intambara y\'Icyumweru', gameType: 'revision', minPlayers: 2, maxPlayers: 4, totalRounds: 20, roundTimeSeconds: 30 },
  ];

  for (const mode of gameModes) {
    await prisma.gameMode.upsert({
      where: { code: mode.code },
      update: mode,
      create: mode,
    });
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
