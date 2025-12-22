
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    ...authConfig,
    // secret: process.env.AUTH_SECRET || "fallback_secret_dev_only", // Inherited from authConfig
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            authorize: async (credentials) => {
                const { email, password } = await loginSchema.parseAsync(credentials);

                // SIMPLIFIED AUTHENTICATION FOR ROLLBACK
                // Password is fixed: "123456" for simplicity as requested.
                if (password !== '123456') {
                    console.log("Invalid password");
                    throw new Error("Invalid password.");
                }

                // Map email to User Name
                let name = '';
                if (email === 'michael@diet.local') name = 'Michael';
                else if (email === 'jessica@diet.local') name = 'Jessica';
                else {
                    console.log("User not found: " + email);
                    throw new Error("User not found.");
                }

                console.log("User authenticated (Simplefs):", name);

                return {
                    id: name, // Use name as ID for simplicity in FS mode
                    name: name,
                    email: email,
                    role: 'USER'
                };
            },
        }),
    ],
});
