const GoogleStrategy = require('passport-google-oauth20').Strategy;

function configurePassport(passport, prisma) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          googleAccount: true,
          studentRecord: true,
          teacherRecord: true,
          parentRecord: true,
        },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      const displayName = profile.displayName;
      const photoUrl = profile.photos[0]?.value || null;

      let existingGoogleAccount = await prisma.googleAccount.findUnique({
        where: { googleId },
        include: { user: true },
      });

      if (existingGoogleAccount) {
        const user = await prisma.user.update({
          where: { id: existingGoogleAccount.userId },
          data: { lastLoginAt: new Date() },
          include: {
            googleAccount: true,
            studentRecord: true,
            teacherRecord: true,
            parentRecord: true,
          },
        });

        await prisma.googleAccount.update({
          where: { id: existingGoogleAccount.id },
          data: { accessToken, refreshToken },
        });

        return done(null, user);
      }

      let existingUser = await prisma.user.findUnique({
        where: { email },
        include: {
          googleAccount: true,
          studentRecord: true,
          teacherRecord: true,
          parentRecord: true,
        },
      });

      if (existingUser) {
        if (!existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: true },
          });
        }

        await prisma.googleAccount.create({
          data: {
            userId: existingUser.id,
            googleId,
            email,
            displayName,
            photoUrl,
            accessToken,
            refreshToken,
          },
        });

        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
          include: {
            googleAccount: true,
            studentRecord: true,
            teacherRecord: true,
            parentRecord: true,
          },
        });

        return done(null, updatedUser);
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          fullName: displayName,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerified: true,
          avatarUrl: photoUrl,
          lastLoginAt: new Date(),
          googleAccount: {
            create: {
              googleId,
              email,
              displayName,
              photoUrl,
              accessToken,
              refreshToken,
            },
          },
          studentRecord: {
            create: {
              totalXp: 0,
              matchesPlayed: 0,
              matchesWon: 0,
            },
          },
        },
        include: {
          googleAccount: true,
          studentRecord: true,
          teacherRecord: true,
          parentRecord: true,
        },
      });

      return done(null, newUser);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

module.exports = { configurePassport };
