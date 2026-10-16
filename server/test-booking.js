var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

async function testBookingAPI() {
  console.log('=== Testing Booking API ===\n');

  // Check for existing users
  console.log('1. Checking for existing users...');
  var teacher = await prisma.user.findFirst({
    where: { role: 'TEACHER' }
  });

  var student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });

  if (!teacher) {
    console.log('No teacher found. Creating test teacher...');
    teacher = await prisma.user.create({
      data: {
        email: 'test-teacher@ireme.rw',
        emailNormalized: 'test-teacher@ireme.rw',
        passwordHash: 'hashedpassword',
        fullName: 'Test Teacher',
        role: 'TEACHER',
        status: 'ACTIVE'
      }
    });
    console.log('Created teacher:', teacher.id);
  } else {
    console.log('Found teacher:', teacher.id, teacher.fullName);
  }

  if (!student) {
    console.log('No student found. Creating test student...');
    student = await prisma.user.create({
      data: {
        email: 'test-student@ireme.rw',
        emailNormalized: 'test-student@ireme.rw',
        passwordHash: 'hashedpassword',
        fullName: 'Test Student',
        role: 'STUDENT',
        status: 'ACTIVE'
      }
    });
    console.log('Created student:', student.id);
  } else {
    console.log('Found student:', student.id, student.fullName);
  }

  // Check for tutor profile
  console.log('\n2. Checking for tutor profile...');
  var tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: teacher.id }
  });

  if (!tutorProfile) {
    console.log('No tutor profile found. Creating test tutor profile...');
    tutorProfile = await prisma.tutorProfile.create({
      data: {
        userId: teacher.id,
        headline: 'Experienced Mathematics Teacher',
        bio: 'I have 5 years of experience teaching mathematics.',
        hourlyRate: 15000,
        currency: 'RWF',
        experienceYears: 5,
        isAvailable: true,
        languages: ['English', 'Kinyarwanda'],
        lessonFormats: ['online', 'in-person']
      }
    });
    console.log('Created tutor profile:', tutorProfile.id);
  } else {
    console.log('Found tutor profile:', tutorProfile.id);
  }

  // Check for tutor availability
  console.log('\n3. Checking tutor availability...');
  var availability = await prisma.tutorAvailability.findFirst({
    where: { tutorProfileId: tutorProfile.id }
  });

  if (!availability) {
    console.log('No availability found. Creating test availability...');
    availability = await prisma.tutorAvailability.create({
      data: {
        tutorProfileId: tutorProfile.id,
        dayOfWeek: 1, // Monday
        startTime: '08:00',
        endTime: '17:00',
        isRecurring: true
      }
    });
    console.log('Created availability for Monday 8:00-17:00');
  } else {
    console.log('Found availability:', availability.dayOfWeek, availability.startTime, '-', availability.endTime);
  }

  // Check for subjects
  console.log('\n4. Checking for subjects...');
  var subject = await prisma.subject.findFirst();

  if (!subject) {
    console.log('No subjects found in database.');
  } else {
    console.log('Found subject:', subject.id, subject.nameEn);

    // Check if tutor teaches this subject
    var tutorSubject = await prisma.tutorSubject.findFirst({
      where: {
        tutorProfileId: tutorProfile.id,
        subjectId: subject.id
      }
    });

    if (!tutorSubject) {
      console.log('Linking subject to tutor...');
      await prisma.tutorSubject.create({
        data: {
          tutorProfileId: tutorProfile.id,
          subjectId: subject.id,
          proficiencyLevel: 'advanced'
        }
      });
      console.log('Linked subject to tutor');
    } else {
      console.log('Tutor already teaches this subject');
    }
  }

  console.log('\n=== Test Data Setup Complete ===');
  console.log('Teacher ID:', teacher.id);
  console.log('Student ID:', student.id);
  console.log('Tutor Profile ID:', tutorProfile.id);
  console.log('Subject ID:', subject ? subject.id : 'N/A');

  await prisma.$disconnect();
}

testBookingAPI().catch(function(err) {
  console.error('Error:', err);
  process.exit(1);
});
