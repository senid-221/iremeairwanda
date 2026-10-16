const GoogleStrategy = require('passport-google-oauth20').Strategy;

const USER_INCLUDES = {
  oauthAccounts: true,
  studentProfile: true,
  parentProfile: true,
};

function configurePassport(passport, prisma) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: USER_INCLUDES,
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
    passReqToCallback: true,
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const emailNormalized = email.trim().toLowerCase();
      const googleId = profile.id;
      const displayName = profile.displayName;
      const photoUrl = profile.photos[0]?.value || null;

      const existingGoogleAccount = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: googleId,
          },
        },
        include: { user: true },
      });

      if (existingGoogleAccount) {
        const user = await prisma.user.update({
          where: { id: existingGoogleAccount.userId },
          data: { lastLoginAt: new Date() },
          include: USER_INCLUDES,
        });

        await prisma.oAuthAccount.update({
          where: { id: existingGoogleAccount.id },
          data: { accessToken, refreshToken },
        });

        return done(null, user);
      }

      const existingUser = await prisma.user.findUnique({
        where: { emailNormalized },
        include: USER_INCLUDES,
      });

      if (existingUser) {
        if (!existingUser.emailVerified) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: true },
          });
        }

        await prisma.oAuthAccount.create({
          data: {
            userId: existingUser.id,
            provider: 'google',
            providerAccountId: googleId,
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
          include: USER_INCLUDES,
        });

        return done(null, updatedUser);
      }

      // Role is decided by the pendingRole stored in session before the redirect.
      const role = ['STUDENT', 'TEACHER', 'PARENT'].includes(req.session?.pendingRole)
        ? req.session.pendingRole
        : 'STUDENT';

      const newUser = await prisma.user.create({
        data: {
          email,
          emailNormalized,
          fullName: displayName,
          role,
          status: role === 'TEACHER' ? 'PENDING' : 'ACTIVE',
          emailVerified: true,
          avatarUrl: photoUrl,
          lastLoginAt: new Date(),
          oauthAccounts: {
            create: {
              provider: 'google',
              providerAccountId: googleId,
              email,
              displayName,
              photoUrl,
              accessToken,
              refreshToken,
            },
          },
          studentProfile: role === 'STUDENT' ? { create: {} } : undefined,
          parentProfile: role === 'PARENT' ? { create: {} } : undefined,
        },
        include: USER_INCLUDES,
      });

      return done(null, newUser);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }));
}

module.exports = { configurePassport, USER_INCLUDES };
