/**
 * Better Auth — client-side auth instance for React.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({});

export const { signIn, signUp, signOut, useSession } = authClient;
