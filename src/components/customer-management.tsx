"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerList } from "./customer-list";
import { AddCustomerForm } from "./add-customer-form";
import { AddFollowUpForm } from "./add-follow-up-form";
import type { Customer, CustomerStatus } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Menu } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { add, formatDistanceToNow, differenceInDays } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteField, where, getDocs } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "archived" | "follow-up">("active");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CustomerStatus>('active');
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [customerToArchive, setCustomerToArchive] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const [editReasonDialogOpen, setEditReasonDialogOpen] = useState(false);
  const [customerToEditReason, setCustomerToEditReason] = useState<Customer | null>(null);
  const [editingReason, setEditingReason] = useState("");

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [customerForNotes, setCustomerForNotes] = useState<Customer | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

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
      if (c.status === 'pending' && c.expirationDate) {
        const expirationDate = new Date(c.expirationDate);
        const daysRemaining = differenceInDays(expirationDate, new Date());
        
        return {
          ...c,
          planInfo: `Expires in ${daysRemaining} days`,
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
    } else if (filterStatus === 'follow-up') {
      filtered = filtered.filter(c => !c.isArchived && c.notes && c.notes.trim() !== '');
    }
    else {
      filtered = filtered.filter(c => !c.isArchived && c.status === filterStatus);
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

      if (filterStatus === 'follow-up') {
        const aDate = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
        const bDate = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
        return aDate - bDate;
      }

      if (a.expirationDate && b.expirationDate) {
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      }
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return 0;
    });
  }, [processedCustomers, searchQuery, filterStatus, isClient]);


  const handleAddCustomer = useCallback((newCustomerData: { email: string; phone: string; planDuration: '1 year' | '3 years', status: CustomerStatus }) => {
    if (!customersCollection) return;

    const purchaseDate = new Date();
    const duration = newCustomerData.planDuration === '1 year' ? { years: 1 } : { years: 3 };
    const expirationDate = add(purchaseDate, duration);
    
    const newCustomer: Omit<Customer, 'id' | 'switchClicks' | 'isArchived' | 'avatarUrl' | 'planInfo' | 'reasonForArchival' | 'restoreClicks' | 'deleteClicks' | 'notes' | 'followUpDate'> = {
      email: newCustomerData.email,
      phone: newCustomerData.phone,
      status: newCustomerData.status,
      planDuration: newCustomerData.planDuration,
      purchaseDate: purchaseDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
    };
    
    const completeCustomer: Omit<Customer, 'id'> = {
        ...(newCustomer as any),
        avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
        switchClicks: 0,
        isArchived: false,
    };

    addDocumentNonBlocking(customersCollection, completeCustomer);

    setDialogOpen(false);
    toast({
      title: "Customer Added",
      description: `${newCustomerData.email} has been added as a ${newCustomerData.status} customer.`,
    });
  }, [customersCollection, toast]);

  const handleAddFollowUp = useCallback(async (data: { phone: string; note: string; days: number }) => {
    if (!firestore || !customersCollection) return;
  
    const followUpDate = add(new Date(), { days: data.days });
    
    const querySnapshot = await getDocs(collection(firestore, "customers"));
    const matchingCustomers = querySnapshot.docs.filter(doc => doc.data().phone === data.phone);
  
    if (matchingCustomers.length > 0) {
      const customerDoc = matchingCustomers[0];
      const customerRef = doc(firestore, 'customers', customerDoc.id);
      
      updateDocumentNonBlocking(customerRef, {
        notes: data.note,
        followUpDate: followUpDate.toISOString(),
      });
      
      toast({
        title: "Follow-up Scheduled",
        description: `Follow-up for customer with phone ${data.phone} scheduled in ${data.days} days.`,
      });
    } else {
      const newCustomer: Omit<Customer, 'id'> = {
        email: `${data.phone}@example.com`,
        phone: data.phone,
        status: 'pending',
        planDuration: '1 year',
        purchaseDate: new Date().toISOString(),
        expirationDate: add(new Date(), { years: 1 }).toISOString(),
        notes: data.note,
        followUpDate: followUpDate.toISOString(),
        avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
        switchClicks: 0,
        isArchived: false,
        planInfo: "Follow-up scheduled",
      };
      
      addDocumentNonBlocking(customersCollection, newCustomer);
  
      toast({
        title: "New Follow-up Customer Added",
        description: `A new customer with phone ${data.phone} has been created with a follow-up.`,
      });
    }
     setFollowUpDialogOpen(false);
  }, [firestore, customersCollection, toast]);

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
          const duration = customer.planDuration === '1 year' ? { years: 1 } : { years: 3 };
          const expirationDate = add(purchaseDate, duration);
          updateData = {
            status: newStatus,
            switchClicks: 0,
            purchaseDate: purchaseDate.toISOString(),
            expirationDate: expirationDate.toISOString(),
          };
      } else {
          updateData = {
            status: newStatus,
            switchClicks: 0,
            purchaseDate: deleteField() as any,
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
      updateDocumentNonBlocking(customerRef, { isArchived: true, reasonForArchival: archiveReason, switchClicks: 0 });

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
    const newRestoreClicks = (customer.restoreClicks || 0) + 1;
    
    if (newRestoreClicks >= 3) {
      const updateData = { 
        isArchived: false, 
        reasonForArchival: deleteField(),
        restoreClicks: deleteField(),
      };
      updateDocumentNonBlocking(customerRef, updateData);

      toast({
        title: "Customer Restored",
        description: `${customer.email} has been restored.`,
      });
    } else {
      updateDocumentNonBlocking(customerRef, { restoreClicks: newRestoreClicks });
      toast({
        title: `Restoring ${customer.email}...`,
        description: `Click ${3 - newRestoreClicks} more times to confirm.`,
        duration: 2000,
      });
    }
  }, [customers, firestore, toast]);

  const handleEditReasonClick = (customer: Customer) => {
    setCustomerToEditReason(customer);
    setEditingReason(customer.reasonForArchival || "");
    setEditReasonDialogOpen(true);
  };
  
  const handleSaveReason = () => {
    if (!firestore || !customerToEditReason) return;
    
    const customerRef = doc(firestore, 'customers', customerToEditReason.id);
    updateDocumentNonBlocking(customerRef, { reasonForArchival: editingReason });

    setEditReasonDialogOpen(false);
    setCustomerToEditReason(null);
    setEditingReason("");
    toast({
      title: "Reason Updated",
      description: `The reason for archiving ${customerToEditReason.email} has been updated.`,
    });
  };

  const handleDeleteClick = useCallback((customerId: string) => {
    if (!firestore) return;
    const customer = customers?.find(c => c.id === customerId);
    if (!customer) return;

    const customerRef = doc(firestore, 'customers', customerId);
    const newDeleteClicks = (customer.deleteClicks || 0) + 1;

    if (newDeleteClicks >= 5) {
      deleteDocumentNonBlocking(customerRef);
      toast({
        title: "Customer Deleted",
        description: `${customer.email} has been permanently deleted.`,
        variant: "destructive",
      });
    } else {
      updateDocumentNonBlocking(customerRef, { deleteClicks: newDeleteClicks });
      toast({
        title: `Deleting ${customer.email}...`,
        description: `Click ${5 - newDeleteClicks} more times to permanently delete.`,
        duration: 2000,
        variant: "destructive",
      });
    }
  }, [customers, firestore, toast]);
  
  const openDialog = () => {
    if (filterStatus === 'follow-up') {
      setFollowUpDialogOpen(true);
    } else if (filterStatus === 'archived') {
      setDialogMode('pending');
      setDialogOpen(true);
    } else {
      setDialogMode(filterStatus);
      setDialogOpen(true);
    }
  };

  const handleNotesClick = (customer: Customer) => {
    setCustomerForNotes(customer);
    setEditingNotes(customer.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (!firestore || !customerForNotes) return;

    const customerRef = doc(firestore, 'customers', customerForNotes.id);
    updateDocumentNonBlocking(customerRef, { notes: editingNotes });

    setNotesDialogOpen(false);
    setCustomerForNotes(null);
    setEditingNotes("");
    toast({
      title: "Notes Updated",
      description: `Notes for ${customerForNotes.email} have been updated.`,
    });
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-4">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button onClick={openDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add {filterStatus === 'follow-up' ? 'Follow-up' : 'Customer'}
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={filterStatus} onValueChange={(value) => setFilterStatus(value as CustomerStatus | "archived" | "follow-up")}>
                      <DropdownMenuRadioItem value="active">Active Customer</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="pending">Pending Customer</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="follow-up">Follow Up</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="archived">Archive Customer</DropdownMenuRadioItem>
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
            onEditReasonClick={handleEditReasonClick}
            onDeleteClick={handleDeleteClick}
            onNotesClick={handleNotesClick}
            currentView={filterStatus}
          />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
      
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
          </DialogHeader>
          <AddFollowUpForm onSubmit={handleAddFollowUp} />
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
      
      <Dialog open={editReasonDialogOpen} onOpenChange={setEditReasonDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Archive Reason</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="edit-archive-reason">Reason for Archiving</Label>
                <Textarea
                  id="edit-archive-reason"
                  value={editingReason}
                  onChange={(e) => setEditingReason(e.target.value)}
                  placeholder="Enter the reason for archiving"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditReasonDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveReason}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

       <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Customer Notes</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="customer-notes">Notes for {customerForNotes?.email}</Label>
              <Textarea
                id="customer-notes"
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Enter notes for this customer"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    