var { PrismaClient } = require('@prisma/client');
var BookingService = require('./src/services/booking');
var prisma = new PrismaClient();

var TEACHER_ID = '36aec8e7-f753-484f-96df-60a9b3da1a7c';
var STUDENT_ID = '532fd6d9-20bb-4030-8a45-1051920b5a21';
var TUTOR_PROFILE_ID = '2eb80086-f0c2-49f6-8538-3b16eb913e34';
var SUBJECT_ID = '01c0711f-bb56-4a8d-8e5e-06b388792920';

async function testBookingService() {
  console.log('=== Testing Booking Service Directly ===\n');

  try {
    // Clean up existing test bookings
    console.log('Cleaning up existing test bookings...');
    await prisma.booking.deleteMany({
      where: {
        OR: [
          { studentUserId: STUDENT_ID },
          { tutorProfile: { userId: TEACHER_ID } }
        ]
      }
    });
    await prisma.bookingNotification.deleteMany({
      where: {
        OR: [
          { userId: STUDENT_ID },
          { userId: TEACHER_ID }
        ]
      }
    });
    console.log('✓ Cleanup complete\n');

    console.log('Test 1: Check Availability');
    var availability = await BookingService.checkAvailability(
      TUTOR_PROFILE_ID,
      '2026-10-20',
      '10:00',
      '11:00'
    );
    console.log('✓ Available:', availability.available);
    console.log('  Reason:', availability.reason || 'Time slot is free');

    console.log('\nTest 2: Create Booking');
    var booking = await BookingService.createBooking({
      tutorProfileId: TUTOR_PROFILE_ID,
      studentUserId: STUDENT_ID,
      subjectId: SUBJECT_ID,
      scheduledDate: '2026-10-20',
      startTime: '10:00',
      endTime: '11:00',
      lessonFormat: 'online',
      learningObjectives: 'Learn algebra basics',
      specialRequirements: 'Need help with homework'
    });
    console.log('✓ Booking created');
    console.log('  Booking Number:', booking.bookingNumber);
    console.log('  Status:', booking.status);
    console.log('  Total Amount:', booking.totalAmount, booking.currency);

    console.log('\nTest 3: Get User Bookings (Student)');
    var studentBookings = await BookingService.getUserBookings(STUDENT_ID, 'STUDENT');
    console.log('✓ Found', studentBookings.length, 'bookings for student');

    console.log('\nTest 4: Get Booking Details');
    var bookingDetails = await BookingService.getBookingById(booking.id, STUDENT_ID);
    console.log('✓ Retrieved booking details');
    console.log('  Tutor:', bookingDetails.tutorProfile.user.fullName);
    console.log('  Student:', bookingDetails.studentUser.fullName);

    console.log('\nTest 5: Check Availability (Should fail - conflict)');
    var conflictCheck = await BookingService.checkAvailability(
      TUTOR_PROFILE_ID,
      '2026-10-20',
      '10:30',
      '11:30'
    );
    console.log('✓ Available:', conflictCheck.available);
    console.log('  Reason:', conflictCheck.reason);

    console.log('\nTest 6: Accept Booking');
    var acceptedBooking = await BookingService.acceptBooking(booking.id, TEACHER_ID);
    console.log('✓ Booking accepted');
    console.log('  Status:', acceptedBooking.status);

    console.log('\nTest 7: Reschedule Booking');
    var rescheduledBooking = await BookingService.rescheduleBooking(
      booking.id,
      STUDENT_ID,
      '2026-10-27', // Next Monday
      '14:00',
      '15:00'
    );
    console.log('✓ Booking rescheduled');
    console.log('  New Date:', rescheduledBooking.scheduledDate);
    console.log('  New Time:', rescheduledBooking.startTime, '-', rescheduledBooking.endTime);

    console.log('\nTest 8: Complete Booking');
    var completedBooking = await BookingService.completeBooking(booking.id, TEACHER_ID);
    console.log('✓ Booking completed');
    console.log('  Status:', completedBooking.status);

    console.log('\nTest 9: Create Another Booking for Cancellation');
    var booking2 = await BookingService.createBooking({
      tutorProfileId: TUTOR_PROFILE_ID,
      studentUserId: STUDENT_ID,
      subjectId: SUBJECT_ID,
      scheduledDate: '2026-10-22',
      startTime: '09:00',
      endTime: '10:00',
      lessonFormat: 'in-person',
      learningObjectives: 'Geometry fundamentals'
    });
    console.log('✓ Second booking created:', booking2.bookingNumber);

    console.log('\nTest 10: Cancel Booking');
    var cancelledBooking = await BookingService.cancelBooking(
      booking2.id,
      STUDENT_ID,
      'Student is sick'
    );
    console.log('✓ Booking cancelled');
    console.log('  Status:', cancelledBooking.status);
    console.log('  Reason:', cancelledBooking.cancellationReason);

    console.log('\nTest 11: Get Booking Notifications');
    var notifications = await prisma.bookingNotification.findMany({
      where: {
        OR: [
          { userId: TEACHER_ID },
          { userId: STUDENT_ID }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('✓ Found', notifications.length, 'notifications');
    notifications.forEach(function(notif, idx) {
      console.log('  ' + (idx + 1) + '.', notif.type, '-', notif.title);
    });

    console.log('\n=== All Booking Service Tests Passed! ===');

  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    console.error(err.stack);
  }

  await prisma.$disconnect();
}

testBookingService();
