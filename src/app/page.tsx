import { CustomerManagement } from "@/components/customer-management";
import { Logo } from "@/components/icons";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-primary" />
            <h1 className="font-headline text-2xl font-bold text-primary">
              CustomerLifeline
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <CustomerManagement />
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} CustomerLifeline. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
