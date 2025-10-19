
"use client";

import { useState, useEffect } from "react";
import { CustomerManagement } from "@/components/customer-management";
import { Login } from "@/components/login";
import { Logo } from "@/components/icons";
import { useAuth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    setIsClient(true);
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      });
      return () => unsubscribe();
    }
  }, [auth]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-primary" />
            <h1 className="font-headline text-2xl font-bold text-primary">
              Sanatani Shop
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {isAuthenticated ? <CustomerManagement /> : <Login onLoginSuccess={handleLoginSuccess} />}
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sanatani Shop. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
