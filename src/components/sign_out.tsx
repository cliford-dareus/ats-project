'use client';

import { useClerk } from '@clerk/nextjs';

const HOME_URL = process.env.NODE_ENV === "development"
  ? "http://aplico.localhost:3000"
  : process.env.NEXT_PUBLIC_ROOT_URL ?? "https://aplico.online";

export const SignOutButton = () => {
    const { signOut } = useClerk()

    return (
        // Clicking this button signs out a user
        // and redirects them to the home page "/".
        <button onClick={() => signOut({ redirectUrl: HOME_URL })}>Sign out</button>
    )
}