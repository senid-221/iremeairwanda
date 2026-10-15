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

  // Create education levels
  console.log('Creating education levels...');
  const educationLevels = [
    { code: 'P1-P6', name: 'Primary', nameEn: 'Primary (P1-P6)', nameRw: 'Primari (P1-P6)', levelType: 'primary', gradeRange: 'P1-P6', displayOrder: 1 },
    { code: 'S1-S3', name: 'Lower Secondary', nameEn: 'Lower Secondary (S1-S3)', nameRw: 'Secondaire Inferieur (S1-S3)', levelType: 'secondary', gradeRange: 'S1-S3', displayOrder: 2 },
    { code: 'S4-S6', name: 'Upper Secondary', nameEn: 'Upper Secondary (S4-S6)', nameRw: 'Secondaire Superieur (S4-S6)', levelType: 'secondary', gradeRange: 'S4-S6', displayOrder: 3 },
    { code: 'TTC', name: 'TTC', nameEn: 'Teacher Training College', nameRw: 'Ishuri ry\'Abarezi', levelType: 'tvett', displayOrder: 4 },
    { code: 'TVET', name: 'TVET', nameEn: 'Technical and Vocational Education', nameRw: 'Imyuga n\'Ubumeni', levelType: 'tvett', displayOrder: 5 },
  ];

  for (const level of educationLevels) {
    await prisma.educationLevel.upsert({
      where: { code: level.code },
      update: level,
      create: level,
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
