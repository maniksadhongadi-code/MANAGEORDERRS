"use client";

import { useState, useMemo, useEffect } from "react";
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
    setCustomers(initialCustomers);
    setIsClient(true);
  }, []);

  const filteredActiveCustomers = useMemo(() => {
    if (!isClient) return [];
    return customers.filter(
      (c) =>
        c.status === "active" &&
        (c.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
          c.phone.includes(activeSearch))
    );
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

  const handleAddCustomer = (newCustomerData: Omit<Customer, 'id' | 'avatarUrl' | 'switchClicks'>) => {
    const newCustomer: Customer = {
      ...newCustomerData,
      id: new Date().getTime().toString(),
      avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
      switchClicks: 0,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setDialogOpen(false);
    toast({
      title: "Customer Added",
      description: `${newCustomer.email} has been added as a ${newCustomer.status} customer.`,
    });
  };

  const handleSwitchClick = (customerId: string) => {
    setCustomers(prevCustomers => {
      const newCustomers = [...prevCustomers];
      const customerIndex = newCustomers.findIndex(c => c.id === customerId);
      if (customerIndex === -1) return prevCustomers;
      
      const customer = { ...newCustomers[customerIndex] };
      customer.switchClicks += 1;

      if (customer.switchClicks >= 4) {
        const oldStatus = customer.status;
        customer.status = customer.status === 'active' ? 'pending' : 'active';
        customer.switchClicks = 0;
        toast({
          title: "Status Switched!",
          description: `${customer.email} moved from ${oldStatus} to ${customer.status}.`,
        });
      } else {
        toast({
          title: `Switching status for ${customer.email}...`,
          description: `Click ${4 - customer.switchClicks} more times to confirm.`,
          duration: 2000,
        });
      }

      newCustomers[customerIndex] = customer;
      return newCustomers;
    });
  };

  const handleDeleteClick = (customerId: string) => {
    setCustomerToDelete(customerId);
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = () => {
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
  };
  
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
