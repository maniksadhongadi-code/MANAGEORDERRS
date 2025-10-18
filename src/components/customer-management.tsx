"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerList } from "./customer-list";
import { AddCustomerForm } from "./add-customer-form";
import type { Customer, CustomerStatus } from "@/lib/types";
import { initialCustomers } from "@/lib/initial-data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { add, formatDistanceToNow, differenceInDays } from 'date-fns';

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeSearch, setActiveSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CustomerStatus>('active');
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const processedCustomers = initialCustomers.map(c => {
      if (c.status === 'active' && c.planDuration) {
        const purchaseDate = new Date(c.purchaseDate);
        const duration = c.planDuration === '1 year' ? { years: 1 } : { years: 3 };
        const expirationDate = add(purchaseDate, duration);
        const daysRemaining = differenceInDays(expirationDate, new Date());
        
        return {
          ...c,
          expirationDate: expirationDate.toISOString(),
          planInfo: `${daysRemaining > 0 ? `${daysRemaining} days remaining` : `Expired ${formatDistanceToNow(expirationDate)} ago`}`,
        };
      }
      return c;
    });
    setCustomers(processedCustomers);
    setIsClient(true);
  }, []);

  const filteredActiveCustomers = useMemo(() => {
    if (!isClient) return [];
    return customers
      .filter(
        (c) =>
          c.status === "active" &&
          (c.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
            c.phone.includes(activeSearch))
      )
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate) {
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        }
        return 0;
      });
  }, [customers, activeSearch, isClient]);

  const filteredPendingCustomers = useMemo(() => {
    if (!isClient) return [];
    return customers.filter(
      (c) =>
        c.status === "pending" &&
        (c.email.toLowerCase().includes(pendingSearch.toLowerCase()) ||
          c.phone.includes(pendingSearch))
    );
  }, [customers, pendingSearch, isClient]);

  const handleAddCustomer = useCallback((newCustomerData: Omit<Customer, 'id' | 'avatarUrl' | 'switchClicks' | 'purchaseDate' > & { planInfo: string; planDuration?: '1 year' | '3 years' }) => {
    
    const purchaseDate = new Date();
    let expirationDate, planInfo = newCustomerData.planInfo;

    if(newCustomerData.status === 'active' && newCustomerData.planDuration) {
      const duration = newCustomerData.planDuration === '1 year' ? { years: 1 } : { years: 3 };
      expirationDate = add(purchaseDate, duration);
      const daysRemaining = differenceInDays(expirationDate, new Date());
      planInfo = `${daysRemaining} days remaining`;
    }

    const newCustomer: Customer = {
      ...newCustomerData,
      id: new Date().getTime().toString(),
      avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
      switchClicks: 0,
      purchaseDate: purchaseDate.toISOString(),
      expirationDate: expirationDate?.toISOString(),
      planInfo,
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    setDialogOpen(false);
    toast({
      title: "Customer Added",
      description: `${newCustomer.email} has been added as a ${newCustomer.status} customer.`,
    });
  }, [toast]);

  const handleSwitchClick = useCallback((customerId: string) => {
    setCustomers(prevCustomers => {
      const newCustomers = [...prevCustomers];
      const customerIndex = newCustomers.findIndex(c => c.id === customerId);
      if (customerIndex === -1) return prevCustomers;
      
      const customer = { ...newCustomers[customerIndex] };
      const originalStatus = customer.status;
      customer.switchClicks += 1;

      if (customer.switchClicks >= 4) {
        customer.status = customer.status === 'active' ? 'pending' : 'active';
        customer.switchClicks = 0;
        
        if (customer.status === 'active') {
            customer.planDuration = '1 year';
            customer.purchaseDate = new Date().toISOString();
            const expirationDate = add(new Date(customer.purchaseDate), { years: 1 });
            const daysRemaining = differenceInDays(expirationDate, new Date());
            customer.expirationDate = expirationDate.toISOString();
            customer.planInfo = `${daysRemaining} days remaining`;
        } else {
            customer.planInfo = "Switched from active";
            delete customer.planDuration;
            delete customer.expirationDate;
        }

        setTimeout(() => {
          toast({
            title: "Status Switched!",
            description: `${customer.email} moved from ${originalStatus} to ${customer.status}.`,
          });
        }, 0);

      } else {
        setTimeout(() => {
          toast({
            title: `Switching status for ${customer.email}...`,
            description: `Click ${4 - customer.switchClicks} more times to confirm.`,
            duration: 2000,
          });
        }, 0);
      }

      newCustomers[customerIndex] = customer;
      return newCustomers;
    });
  }, [toast]);

  const handleDeleteClick = useCallback((customerId: string) => {
    setCustomerToDelete(customerId);
    setDeleteConfirmationOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (customerToDelete) {
      const customer = customers.find(c => c.id === customerToDelete);
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete));
      setDeleteConfirmationOpen(false);
      setCustomerToDelete(null);
      if (customer) {
        toast({
          title: "Customer Deleted",
          description: `${customer.email} has been removed.`,
          variant: "destructive",
        });
      }
    }
  }, [customerToDelete, customers, toast]);
  
  const openDialog = (mode: CustomerStatus) => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  if (!isClient) {
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
              This action cannot be undone. This will permanently delete the customer account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
