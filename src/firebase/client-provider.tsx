'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const SPECIAL_USER_EMAIL = 'user@example.com';
const SPECIAL_USER_PASS = 'shopXzone';

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    const auth = getAuth(firebaseServices.firebaseApp);
    
    const attemptSignInOrCreateUser = async () => {
        try {
            await signInWithEmailAndPassword(auth, SPECIAL_USER_EMAIL, SPECIAL_USER_PASS);
        } catch (signInError: any) {
            if (signInError.code === 'auth/user-not-found') {
                try {
                    await createUserWithEmailAndPassword(auth, SPECIAL_USER_EMAIL, SPECIAL_USER_PASS);
                } catch (creationError) {
                    console.error('Failed to create special user:', creationError);
                }
            } else if (signInError.code !== 'auth/wrong-password') {
                // For other errors besides wrong password, log them.
                // Wrong password will be handled by the login form.
                console.error('Error signing in special user:', signInError);
            }
        }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // If there's no user, attempt to sign in.
        // This will now only run when the auth state is definitively 'no user'.
        attemptSignInOrCreateUser();
      }
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
