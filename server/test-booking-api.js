var http = require('http');

var TEACHER_ID = '36aec8e7-f753-484f-96df-60a9b3da1a7c';
var STUDENT_ID = '532fd6d9-20bb-4030-8a45-1051920b5a21';
var TUTOR_PROFILE_ID = '2eb80086-f0c2-49f6-8538-3b16eb913e34';
var SUBJECT_ID = '01c0711f-bb56-4a8d-8e5e-06b388792920';

function makeRequest(method, path, body, cookies) {
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    var req = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) {
        data += chunk;
      });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', function(err) {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function loginAsUser(email) {
  console.log('\nLogging in as', email, '...');
  var result = await makeRequest('POST', '/api/auth/login', {
    email: email,
    password: 'password123'
  });

  if (result.status === 200 && result.data.user) {
    var cookies = result.headers['set-cookie'];
    var sessionCookie = cookies ? cookies[0].split(';')[0] : '';
    console.log('Login successful. User:', result.data.user.fullName);
    return {
      user: result.data.user,
      cookie: sessionCookie
    };
  } else {
    console.log('Login failed:', result.data);
    return null;
  }
}

async function testBookingAPI() {
  console.log('=== Testing Booking API Endpoints ===\n');

  // Login as student
  var studentAuth = await loginAsUser('test-student@ireme.rw');
  if (!studentAuth) {
    console.log('Cannot proceed without student authentication');
    return;
  }

  // Login as teacher
  var teacherAuth = await loginAsUser('test-teacher@ireme.rw');
  if (!teacherAuth) {
    console.log('Cannot proceed without teacher authentication');
    return;
  }

  console.log('\n--- Test 1: Check Availability ---');
  var availabilityResult = await makeRequest('POST', '/api/tutors/bookings/check-availability', {
    tutorProfileId: TUTOR_PROFILE_ID,
    date: '2026-10-20', // Monday
    startTime: '10:00',
    endTime: '11:00'
  }, studentAuth.cookie);
  console.log('Status:', availabilityResult.status);
  console.log('Available:', availabilityResult.data.available);
  console.log('Reason:', availabilityResult.data.reason || 'N/A');

  console.log('\n--- Test 2: Create Booking ---');
  var bookingResult = await makeRequest('POST', '/api/tutors/bookings', {
    tutorProfileId: TUTOR_PROFILE_ID,
    subjectId: SUBJECT_ID,
    scheduledDate: '2026-10-20',
    startTime: '10:00',
    endTime: '11:00',
    lessonFormat: 'online',
    learningObjectives: 'Learn algebra basics',
    specialRequirements: 'Need help with homework'
  }, studentAuth.cookie);
  console.log('Status:', bookingResult.status);
  console.log('Success:', bookingResult.data.success);
  console.log('Message:', bookingResult.data.message);
  var bookingId = bookingResult.data.booking ? bookingResult.data.booking.id : null;
  console.log('Booking ID:', bookingId);
  console.log('Booking Number:', bookingResult.data.booking ? bookingResult.data.booking.bookingNumber : 'N/A');

  if (!bookingId) {
    console.log('Cannot proceed without booking ID');
    return;
  }

  console.log('\n--- Test 3: Get Bookings (Student) ---');
  var bookingsResult = await makeRequest('GET', '/api/tutors/bookings', null, studentAuth.cookie);
  console.log('Status:', bookingsResult.status);
  console.log('Total bookings:', bookingsResult.data.bookings ? bookingsResult.data.bookings.length : 0);
  if (bookingsResult.data.bookings && bookingsResult.data.bookings.length > 0) {
    console.log('First booking:', bookingsResult.data.bookings[0].bookingNumber);
  }

  console.log('\n--- Test 4: Get Booking Details ---');
  var bookingDetailsResult = await makeRequest('GET', '/api/tutors/bookings/' + bookingId, null, studentAuth.cookie);
  console.log('Status:', bookingDetailsResult.status);
  console.log('Booking Number:', bookingDetailsResult.data.booking ? bookingDetailsResult.data.booking.bookingNumber : 'N/A');
  console.log('Status:', bookingDetailsResult.data.booking ? bookingDetailsResult.data.booking.status : 'N/A');

  console.log('\n--- Test 5: Get Booking Notifications (Teacher) ---');
  var notificationsResult = await makeRequest('GET', '/api/tutors/bookings/notifications', null, teacherAuth.cookie);
  console.log('Status:', notificationsResult.status);
  console.log('Total notifications:', notificationsResult.data.notifications ? notificationsResult.data.notifications.length : 0);
  if (notificationsResult.data.notifications && notificationsResult.data.notifications.length > 0) {
    console.log('Latest notification:', notificationsResult.data.notifications[0].title);
  }

  console.log('\n--- Test 6: Accept Booking (Teacher) ---');
  var acceptResult = await makeRequest('POST', '/api/tutors/bookings/' + bookingId + '/accept', {}, teacherAuth.cookie);
  console.log('Status:', acceptResult.status);
  console.log('Success:', acceptResult.data.success);
  console.log('Message:', acceptResult.data.message);

  console.log('\n--- Test 7: Get Booking Details (After Accept) ---');
  var bookingAfterAccept = await makeRequest('GET', '/api/tutors/bookings/' + bookingId, null, studentAuth.cookie);
  console.log('Status:', bookingAfterAccept.data.booking ? bookingAfterAccept.data.booking.status : 'N/A');

  console.log('\n--- Test 8: Reschedule Booking ---');
  var rescheduleResult = await makeRequest('POST', '/api/tutors/bookings/' + bookingId + '/reschedule', {
    date: '2026-10-21', // Tuesday
    startTime: '14:00',
    endTime: '15:00'
  }, studentAuth.cookie);
  console.log('Status:', rescheduleResult.status);
  console.log('Success:', rescheduleResult.data.success);
  console.log('Message:', rescheduleResult.data.message);

  console.log('\n--- Test 9: Complete Booking (Teacher) ---');
  var completeResult = await makeRequest('POST', '/api/tutors/bookings/' + bookingId + '/complete', {}, teacherAuth.cookie);
  console.log('Status:', completeResult.status);
  console.log('Success:', completeResult.data.success);
  console.log('Message:', completeResult.data.message);

  console.log('\n--- Test 10: Create Another Booking for Cancellation Test ---');
  var booking2Result = await makeRequest('POST', '/api/tutors/bookings', {
    tutorProfileId: TUTOR_PROFILE_ID,
    subjectId: SUBJECT_ID,
    scheduledDate: '2026-10-22',
    startTime: '09:00',
    endTime: '10:00',
    lessonFormat: 'in-person',
    learningObjectives: 'Geometry fundamentals'
  }, studentAuth.cookie);
  var booking2Id = booking2Result.data.booking ? booking2Result.data.booking.id : null;
  console.log('Created booking:', booking2Id);

  if (booking2Id) {
    console.log('\n--- Test 11: Cancel Booking ---');
    var cancelResult = await makeRequest('POST', '/api/tutors/bookings/' + booking2Id + '/cancel', {
      reason: 'Student is sick'
    }, studentAuth.cookie);
    console.log('Status:', cancelResult.status);
    console.log('Success:', cancelResult.data.success);
    console.log('Message:', cancelResult.data.message);
  }

  console.log('\n=== Booking API Tests Complete ===');
}

testBookingAPI().catch(function(err) {
  console.error('Test error:', err);
  process.exit(1);
});
