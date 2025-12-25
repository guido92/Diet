'use server';

import { cookies } from 'next/headers';

const COOKIE_NAME = 'user_role';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function loginAction(user: 'Michael' | 'Jessica') {
    (await cookies()).set(COOKIE_NAME, user, {
        maxAge: MAX_AGE,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
}

export async function logoutAction() {
    (await cookies()).delete(COOKIE_NAME);
}

export async function getUserSession(): Promise<'Michael' | 'Jessica' | null> {
    const cookieStore = await cookies();
    const role = cookieStore.get(COOKIE_NAME)?.value;
    if (role === 'Michael' || role === 'Jessica') {
        return role;
    }
    return null;
}
