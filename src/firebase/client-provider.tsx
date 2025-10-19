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
    // When the component mounts, sign in the user anonymously if they are not already signed in.
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        try {
            await signInWithEmailAndPassword(auth, SPECIAL_USER_EMAIL, SPECIAL_USER_PASS);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                try {
                    await createUserWithEmailAndPassword(auth, SPECIAL_USER_EMAIL, SPECIAL_USER_PASS);
                } catch (creationError) {
                    console.error('Failed to create special user:', creationError);
                }
            } else if (error.code !== 'auth/wrong-password') {
                 console.error('Error signing in special user:', error);
            }
        }
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
