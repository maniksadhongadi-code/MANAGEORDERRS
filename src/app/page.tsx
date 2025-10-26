
"use client";

import { useState, useEffect } from "react";
import { CustomerManagement } from "@/components/customer-management";
import { Logo } from "@/components/icons";
import { useUser } from "@/firebase";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || isUserLoading) {
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
        {user ? <CustomerManagement /> : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
                <h3 className="text-lg font-semibold text-muted-foreground">Authenticating...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we secure your session.</p>
            </div>
        )}
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sanatani Shop. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
