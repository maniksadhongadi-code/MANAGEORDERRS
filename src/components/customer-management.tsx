"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerList } from "./customer-list";
import { AddCustomerForm } from "./add-customer-form";
import type { Customer, CustomerStatus } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { add, formatDistanceToNow, differenceInDays } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteField } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export function CustomerManagement() {
  const firestore = useFirestore();
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);
  
  const [activeSearch, setActiveSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CustomerStatus>('active');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [customerToArchive, setCustomerToArchive] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const liveCustomers = useMemo(() => {
    return customers?.filter(c => !c.isArchived).map(c => {
       if (c.status === 'active' && c.expirationDate) {
        const expirationDate = new Date(c.expirationDate);
        const daysRemaining = differenceInDays(expirationDate, new Date());
        
        return {
          ...c,
          planInfo: `${daysRemaining > 0 ? `${daysRemaining} days remaining` : `Expired ${formatDistanceToNow(expirationDate)} ago`}`,
        };
      }
      return c;
    }) || [];
  }, [customers]);


  const filteredActiveCustomers = useMemo(() => {
    if (!isClient) return [];
    return liveCustomers
      .filter(
        (c) =>
          c.status === "active" &&
          (c.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
            (c.phone && c.phone.includes(activeSearch)))
      )
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate) {
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        }
        return 0;
      });
  }, [liveCustomers, activeSearch, isClient]);

  const filteredPendingCustomers = useMemo(() => {
    if (!isClient) return [];
    return liveCustomers.filter(
      (c) =>
        c.status === "pending" &&
        (c.email.toLowerCase().includes(pendingSearch.toLowerCase()) ||
          (c.phone && c.phone.includes(pendingSearch)))
    );
  }, [liveCustomers, pendingSearch, isClient]);

  const handleAddCustomer = useCallback((newCustomerData: Omit<Customer, 'id' | 'avatarUrl' | 'switchClicks' | 'purchaseDate' > & { planInfo: string; planDuration?: '1 year' | '3 years' }) => {
    if (!customersCollection) return;
    
    const purchaseDate = new Date();

    let newCustomer: Omit<Customer, 'id'>;

    if (newCustomerData.status === 'active' && newCustomerData.planDuration) {
      const duration = newCustomerData.planDuration === '1 year' ? { years: 1 } : { years: 3 };
      const expirationDate = add(purchaseDate, duration);
      newCustomer = {
        email: newCustomerData.email,
        phone: newCustomerData.phone,
        status: 'active',
        planDuration: newCustomerData.planDuration,
        avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
        switchClicks: 0,
        purchaseDate: purchaseDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        isArchived: false,
        planInfo: '', // For active customers, planInfo is calculated dynamically
      };
    } else {
      newCustomer = {
        email: newCustomerData.email,
        phone: newCustomerData.phone,
        status: 'pending',
        planInfo: newCustomerData.planInfo,
        avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
        switchClicks: 0,
        purchaseDate: purchaseDate.toISOString(),
        isArchived: false,
      };
    }

    addDocumentNonBlocking(customersCollection, newCustomer);

    setDialogOpen(false);
    toast({
      title: "Customer Added",
      description: `${newCustomerData.email} has been added as a ${newCustomerData.status} customer.`,
    });
  }, [customersCollection, toast]);

  const handleSwitchClick = useCallback((customerId: string) => {
    if (!firestore) return;
    const customer = customers?.find(c => c.id === customerId);
    if (!customer) return;

    const customerRef = doc(firestore, 'customers', customerId);
    const newSwitchClicks = (customer.switchClicks || 0) + 1;
    
    if (newSwitchClicks >= 4) {
      const newStatus = customer.status === 'active' ? 'pending' : 'active';
      let updateData: Partial<Customer> = {
        status: newStatus,
        switchClicks: 0,
      };

      if (newStatus === 'active') {
          const purchaseDate = new Date();
          const expirationDate = add(purchaseDate, { years: 1 });
          updateData = {
            ...updateData,
            planDuration: '1 year',
            purchaseDate: purchaseDate.toISOString(),
            expirationDate: expirationDate.toISOString(),
          };
      } else {
          updateData = {
            ...updateData,
            planInfo: "Switched from active",
            planDuration: deleteField() as any,
            expirationDate: deleteField() as any,
          };
      }
      
      updateDocumentNonBlocking(customerRef, updateData);

      toast({
        title: "Status Switched!",
        description: `${customer.email} moved from ${customer.status} to ${newStatus}.`,
      });
    } else {
      updateDocumentNonBlocking(customerRef, { switchClicks: newSwitchClicks });
      toast({
        title: `Switching status for ${customer.email}...`,
        description: `Click ${4 - newSwitchClicks} more times to confirm.`,
        duration: 2000,
      });
    }
  }, [customers, firestore, toast]);

  const handleDeleteClick = useCallback((customerId: string) => {
    setCustomerToArchive(customerId);
    setDeleteConfirmationOpen(true);
  }, []);

  const confirmArchive = useCallback(() => {
    if (customerToArchive && firestore) {
      const customer = customers?.find(c => c.id === customerToArchive);
      const customerRef = doc(firestore, 'customers', customerToArchive);
      updateDocumentNonBlocking(customerRef, { isArchived: true });

      setDeleteConfirmationOpen(false);
      setCustomerToArchive(null);
      if (customer) {
        toast({
          title: "Customer Archived",
          description: `${customer.email} has been archived.`,
          variant: "destructive",
        });
      }
    }
  }, [customerToArchive, customers, firestore, toast]);
  
  const openDialog = (mode: CustomerStatus) => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  if (!isClient || isLoading) {
    // You can return a loading spinner here
    return null;
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Customers</TabsTrigger>
            <TabsTrigger value="pending">Pending Customers</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4 space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Search active customers..."
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => openDialog('active')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Active Customer
              </Button>
            </div>
            <CustomerList
              customers={filteredActiveCustomers}
              onSwitchClick={handleSwitchClick}
            />
          </TabsContent>
          <TabsContent value="pending" className="mt-4 space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Search pending customers..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => openDialog('pending')}>
                 <PlusCircle className="mr-2 h-4 w-4" /> Add Pending Customer
              </Button>
            </div>
            <CustomerList
              customers={filteredPendingCustomers}
              onSwitchClick={handleSwitchClick}
              onDeleteClick={handleDeleteClick}
            />
          </TabsContent>
        </Tabs>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add {dialogMode === 'active' ? 'Active' : 'Pending'} Customer</DialogTitle>
          </DialogHeader>
          <AddCustomerForm
            onSubmit={handleAddCustomer}
            mode={dialogMode}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will archive the customer account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToArchive(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-destructive hover:bg-destructive/90">Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
