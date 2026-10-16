var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();

var BookingService = {
  generateBookingNumber: function() {
    var timestamp = Date.now().toString(36).toUpperCase();
    var random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return 'BK-' + timestamp + '-' + random;
  },

  checkAvailability: function(tutorId, date, startTime, endTime, excludeBookingId) {
    var dateObj = new Date(date);
    var dayOfWeek = dateObj.getDay();
    
    var whereClause = {
      tutorProfileId: tutorId,
      scheduledDate: dateObj,
      status: { in: ['pending', 'accepted'] }
    };

    if (excludeBookingId) {
      whereClause.id = { not: excludeBookingId };
    }

    return prisma.booking.findMany({
      where: whereClause
    }).then(function(bookings) {
      for (var i = 0; i < bookings.length; i++) {
        var booking = bookings[i];
        if (BookingService.timesOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
          return {
            available: false,
            reason: 'Time slot conflicts with existing booking',
            conflict: booking
          };
        }
      }

      return prisma.tutorAvailability.findFirst({
        where: {
          tutorProfileId: tutorId,
          dayOfWeek: dayOfWeek,
          isRecurring: true
        }
      }).then(function(availability) {
        if (!availability) {
          return {
            available: false,
            reason: 'Tutor is not available on this day of the week'
          };
        }

        if (startTime < availability.startTime || endTime > availability.endTime) {
          return {
            available: false,
            reason: 'Requested time is outside tutor availability hours'
          };
        }

        return {
          available: true,
          availability: availability
        };
      });
    });
  },

  timesOverlap: function(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  },

  createBooking: function(data) {
    var self = this;

    return prisma.tutorProfile.findUnique({
      where: { id: data.tutorProfileId },
      include: { user: true }
    }).then(function(tutor) {
      if (!tutor) {
        throw new Error('Tutor not found');
      }

      if (!tutor.isAvailable) {
        throw new Error('Tutor is not currently available');
      }

      return self.checkAvailability(
        data.tutorProfileId,
        data.scheduledDate,
        data.startTime,
        data.endTime
      ).then(function(availabilityCheck) {
        if (!availabilityCheck.available) {
          throw new Error(availabilityCheck.reason);
        }

        var hourlyRate = data.hourlyRate || tutor.hourlyRate;
        var durationHours = self.calculateDuration(data.startTime, data.endTime);
        var totalAmount = hourlyRate * durationHours;

        return prisma.booking.create({
          data: {
            bookingNumber: self.generateBookingNumber(),
            tutorProfileId: data.tutorProfileId,
            studentUserId: data.studentUserId,
            parentUserId: data.parentUserId || null,
            studentProfileId: data.studentProfileId || null,
            subjectId: data.subjectId,
            educationLevelId: data.educationLevelId || null,
            topicIds: data.topicIds || [],
            lessonFormat: data.lessonFormat,
            scheduledDate: new Date(data.scheduledDate),
            startTime: data.startTime,
            endTime: data.endTime,
            durationMinutes: self.calculateDurationMinutes(data.startTime, data.endTime),
            location: data.location || null,
            onlineMeetingUrl: data.onlineMeetingUrl || null,
            hourlyRate: hourlyRate,
            totalAmount: totalAmount,
            currency: data.currency || tutor.currency || 'RWF',
            learningObjectives: data.learningObjectives || null,
            specialRequirements: data.specialRequirements || null,
            status: 'pending'
          },
          include: {
            tutorProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                }
              }
            },
            studentUser: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        });
      });
    }).then(function(booking) {
      return self.createNotification(
        booking.tutorProfile.userId,
        booking.id,
        'booking_request',
        'New Booking Request',
        'You have a new booking request from ' + booking.studentUser.fullName + ' for ' + new Date(booking.scheduledDate).toLocaleDateString()
      ).then(function() {
        return booking;
      });
    });
  },

  calculateDuration: function(startTime, endTime) {
    var startParts = startTime.split(':');
    var endParts = endTime.split(':');
    var startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    var endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return (endMinutes - startMinutes) / 60;
  },

  calculateDurationMinutes: function(startTime, endTime) {
    var startParts = startTime.split(':');
    var endParts = endTime.split(':');
    var startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    var endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return endMinutes - startMinutes;
  },

  acceptBooking: function(bookingId, tutorUserId) {
    var self = this;

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          select: { userId: true }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.tutorProfile.userId !== tutorUserId) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== 'pending') {
        throw new Error('Booking is not in pending status');
      }

      return self.checkAvailability(
        booking.tutorProfileId,
        booking.scheduledDate,
        booking.startTime,
        booking.endTime,
        bookingId
      ).then(function(availabilityCheck) {
        if (!availabilityCheck.available) {
          throw new Error('Time slot is no longer available: ' + availabilityCheck.reason);
        }

        return prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'accepted',
            tutorConfirmedAt: new Date()
          },
          include: {
            tutorProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true
                  }
                }
              }
            },
            studentUser: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        });
      });
    }).then(function(booking) {
      return self.createNotification(
        booking.studentUserId,
        booking.id,
        'booking_accepted',
        'Booking Confirmed',
        'Your booking with ' + booking.tutorProfile.user.fullName + ' has been confirmed for ' + new Date(booking.scheduledDate).toLocaleDateString()
      ).then(function() {
        return booking;
      });
    });
  },

  declineBooking: function(bookingId, tutorUserId, reason) {
    var self = this;

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          select: { userId: true }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.tutorProfile.userId !== tutorUserId) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== 'pending') {
        throw new Error('Booking is not in pending status');
      }

      return prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'declined',
          cancellationReason: reason || null,
          cancelledAt: new Date(),
          cancelledBy: tutorUserId
        }
      });
    }).then(function(booking) {
      return self.createNotification(
        booking.studentUserId,
        booking.id,
        'booking_declined',
        'Booking Declined',
        'Your booking request has been declined. ' + (reason || '')
      ).then(function() {
        return booking;
      });
    });
  },

  cancelBooking: function(bookingId, userId, reason) {
    var self = this;

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.studentUserId !== userId && booking.tutorProfile.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (booking.status === 'cancelled' || booking.status === 'completed') {
        throw new Error('Cannot cancel this booking');
      }

      return prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          cancellationReason: reason || null,
          cancelledAt: new Date(),
          cancelledBy: userId
        }
      });
    }).then(function(booking) {
      var notifyUserId = booking.studentUserId === userId ? booking.tutorProfile.userId : booking.studentUserId;
      var notifyType = booking.studentUserId === userId ? 'booking_cancelled_by_student' : 'booking_cancelled_by_tutor';
      
      return self.createNotification(
        notifyUserId,
        booking.id,
        notifyType,
        'Booking Cancelled',
        'A booking has been cancelled. ' + (reason || '')
      ).then(function() {
        return booking;
      });
    });
  },

  completeBooking: function(bookingId, tutorUserId) {
    var self = this;

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          select: {
            userId: true,
            id: true
          }
        }
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.tutorProfile.userId !== tutorUserId) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== 'accepted') {
        throw new Error('Booking must be in accepted status to complete');
      }

      return prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: 'completed',
            completedAt: new Date()
          }
        }),
        prisma.tutorProfile.update({
          where: { id: booking.tutorProfile.id },
          data: {
            completedLessons: { increment: 1 }
          }
        })
      ]);
    }).then(function(results) {
      return results[0];
    });
  },

  rescheduleBooking: function(bookingId, userId, newDate, newStartTime, newEndTime) {
    var self = this;

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.studentUserId !== userId && booking.tutorProfile.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== 'pending' && booking.status !== 'accepted') {
        throw new Error('Cannot reschedule this booking');
      }

      return self.checkAvailability(
        booking.tutorProfileId,
        newDate,
        newStartTime,
        newEndTime,
        bookingId
      ).then(function(availabilityCheck) {
        if (!availabilityCheck.available) {
          throw new Error('New time slot is not available: ' + availabilityCheck.reason);
        }

        var newStatus = booking.status === 'accepted' ? 'pending' : booking.status;

        return prisma.booking.update({
          where: { id: bookingId },
          data: {
            scheduledDate: new Date(newDate),
            startTime: newStartTime,
            endTime: newEndTime,
            durationMinutes: self.calculateDurationMinutes(newStartTime, newEndTime),
            status: newStatus,
            tutorConfirmedAt: newStatus === 'pending' ? null : booking.tutorConfirmedAt
          },
          include: {
            tutorProfile: {
              select: { userId: true }
            }
          }
        });
      });
    }).then(function(booking) {
      var notifyUserId = booking.studentUserId === userId ? booking.tutorProfile.userId : booking.studentUserId;
      
      return self.createNotification(
        notifyUserId,
        booking.id,
        'booking_rescheduled',
        'Booking Rescheduled',
        'A booking has been rescheduled to ' + new Date(booking.scheduledDate).toLocaleDateString()
      ).then(function() {
        return booking;
      });
    });
  },

  createNotification: function(userId, bookingId, type, title, message) {
    return prisma.bookingNotification.create({
      data: {
        userId: userId,
        bookingId: bookingId,
        type: type,
        title: title,
        message: message
      }
    });
  },

  getUserBookings: function(userId, role) {
    var whereClause = {};

    if (role === 'tutor') {
      whereClause.tutorProfile = {
        userId: userId
      };
    } else {
      whereClause.OR = [
        { studentUserId: userId },
        { parentUserId: userId }
      ];
    }

    return prisma.booking.findMany({
      where: whereClause,
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true
          }
        },
        subject: {
          select: {
            id: true,
            nameEn: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });
  },

  getBookingById: function(bookingId, userId) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                email: true
              }
            }
          }
        },
        studentUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        subject: true,
        educationLevel: true,
        reviews: true
      }
    }).then(function(booking) {
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.studentUserId !== userId && booking.tutorProfile.userId !== userId && booking.parentUserId !== userId) {
        throw new Error('Unauthorized');
      }

      return booking;
    });
  }
};

module.exports = BookingService;
