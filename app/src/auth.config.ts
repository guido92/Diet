
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            if (isOnLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true; // Allow access to login page
            }

            // Protect all other pages
            return isLoggedIn;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: any) {
            // Simple pass-through for rollback
            if (session.user && token.sub) {
                session.user.id = token.sub; // name is used as ID in this simple version
                session.user.name = token.sub;
            }
            return session;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async jwt({ token, user }: any) {
            if (user) {
                token.sub = user.name;
            }
            return token;
        }
    },
    providers: [], // Configured in auth.ts
    // Simple secret for rollback dev
    secret: process.env.AUTH_SECRET || "fallback_secret_dev_only",
} satisfies NextAuthConfig;
