import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { PrismaClient, Role } from "@prisma/client";
import { GoogleProfile } from "../types";

const prisma = new PrismaClient();

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        // Normalize email to lowercase to avoid case sensitivity issues
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists (using normalized email)
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // Role will be handled in the callback route
        // We just return the user here, role assignment happens in callback
        if (!user) {
          // Create new user (role will be set in callback route)
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name,
              role: Role.STUDENT, // Temporary default, will be updated in callback
              provider: "google",
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;

