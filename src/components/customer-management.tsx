"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerList } from "./customer-list";
import { AddCustomerForm } from "./add-customer-form";
import type { Customer, CustomerStatus } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Menu } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { add, formatDistanceToNow, differenceInDays } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteField } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

export function CustomerManagement() {
  const firestore = useFirestore();
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | CustomerStatus | "archived">("all");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CustomerStatus>('active');
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [customerToArchive, setCustomerToArchive] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");


  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processedCustomers = useMemo(() => {
    return customers?.map(c => {
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


  const filteredCustomers = useMemo(() => {
    if (!isClient) return [];
    
    let filtered = processedCustomers;

    if (filterStatus === 'archived') {
      filtered = filtered.filter(c => c.isArchived);
    } else if (filterStatus !== 'all') {
      filtered = filtered.filter(c => !c.isArchived && c.status === filterStatus);
    } else {
      filtered = filtered.filter(c => !c.isArchived);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.phone && c.phone.includes(searchQuery))
      );
    }

    return filtered.sort((a, b) => {
       if (a.isArchived) return 1;
       if (b.isArchived) return -1;
      if (a.status === 'active' && b.status === 'active' && a.expirationDate && b.expirationDate) {
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      }
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    });
  }, [processedCustomers, searchQuery, filterStatus, isClient]);


  const handleAddCustomer = useCallback((newCustomerData: { email: string; phone: string; planInfo: string; planDuration?: '1 year' | '3 years', status: CustomerStatus }) => {
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
      let updateData: Partial<Omit<Customer, 'id'>>;

      if (newStatus === 'active') {
          const purchaseDate = new Date();
          const expirationDate = add(purchaseDate, { years: 1 });
          updateData = {
            status: newStatus,
            switchClicks: 0,
            planDuration: '1 year',
            purchaseDate: purchaseDate.toISOString(),
            expirationDate: expirationDate.toISOString(),
            planInfo: "", // Reset planInfo
          };
      } else {
          updateData = {
            status: newStatus,
            switchClicks: 0,
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

  const handleArchiveClick = useCallback((customerId: string) => {
    setCustomerToArchive(customerId);
    setArchiveReason("");
    setArchiveConfirmationOpen(true);
  }, []);

  const confirmArchive = useCallback(() => {
    if (customerToArchive && firestore && archiveReason) {
      const customer = customers?.find(c => c.id === customerToArchive);
      const customerRef = doc(firestore, 'customers', customerToArchive);
      updateDocumentNonBlocking(customerRef, { isArchived: true, reasonForArchival: archiveReason });

      setArchiveConfirmationOpen(false);
      setCustomerToArchive(null);
      setArchiveReason("");
      if (customer) {
        toast({
          title: "Customer Archived",
          description: `${customer.email} has been archived.`,
          variant: "destructive",
        });
      }
    } else if (!archiveReason) {
       toast({
          title: "Reason Required",
          description: `Please provide a reason for archiving.`,
          variant: "destructive",
        });
    }
  }, [customerToArchive, customers, firestore, toast, archiveReason]);

  const handleRestoreClick = useCallback((customerId: string) => {
    if (!firestore) return;
    const customer = customers?.find(c => c.id === customerId);
    if (!customer) return;

    const customerRef = doc(firestore, 'customers', customerId);
    updateDocumentNonBlocking(customerRef, { isArchived: false, reasonForArchival: deleteField() as any });

    toast({
      title: "Customer Restored",
      description: `${customer.email} has been restored.`,
    });
  }, [customers, firestore, toast]);
  
  const openDialog = (mode: CustomerStatus) => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  if (!isClient || isLoading) {
    // You can return a loading spinner here
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="w-full space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                     <DropdownMenuLabel>Add a new customer</DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <Button variant="ghost" className="w-full justify-start" onClick={() => openDialog('active')}>Add Active Customer</Button>
                     <Button variant="ghost" className="w-full justify-start" onClick={() => openDialog('pending')}>Add Pending Customer</Button>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | CustomerStatus | "archived")}>
                        <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CustomerList
              customers={filteredCustomers}
              onSwitchClick={handleSwitchClick}
              onArchiveClick={handleArchiveClick}
              onRestoreClick={handleRestoreClick}
              currentView={filterStatus}
            />
        </div>
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
      <AlertDialog open={archiveConfirmationOpen} onOpenChange={setArchiveConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to archive this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the customer to the archived list. Please provide a reason for archiving.
            </AlertDialogDescription>
             <div className="grid w-full gap-1.5 pt-4">
              <Label htmlFor="archive-reason">Reason for Archiving</Label>
              <Textarea 
                id="archive-reason"
                placeholder="Type your reason here."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
              />
            </div>
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
