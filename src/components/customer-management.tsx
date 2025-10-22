

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerList } from "./customer-list";
import { AddCustomerForm } from "./add-customer-form";
import { AddFollowUpForm } from "./add-follow-up-form";
import { AddAccessPlanForm } from "./add-access-plan-form";
import { AddOneAppCustomerForm } from "./add-one-app-customer-form";
import type { Customer, CustomerStatus, AutodeskApp } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Menu, Download } from "lucide-react";
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
import { Badge } from "./ui/badge";
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";


export function CustomerManagement() {
  const firestore = useFirestore();
  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers, isLoading } = useCollection<Customer>(customersCollection);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "archived" | "follow-up">("active");
  const [isClient, setIsClient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [oneAppDialogOpen, setOneAppDialogOpen] = useState(false);
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

  const [accessPlanDialogOpen, setAccessPlanDialogOpen] = useState(false);
  const [customerForAccessPlan, setCustomerForAccessPlan] = useState<Customer | null>(null);
  
  const [activeTab, setActiveTab] = useState("40-plus-access");

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const processedCustomers = useMemo(() => {
    return customers?.map(c => {
       const expirationDate = c.expirationDate ? new Date(c.expirationDate) : null;
       
       if (c.status === 'active' && expirationDate) {
        const daysRemaining = differenceInDays(expirationDate, new Date());
        return {
          ...c,
          planInfo: `${daysRemaining > 0 ? `${daysRemaining} days remaining` : `Expired ${formatDistanceToNow(expirationDate)} ago`}`,
        };
      }
      
      if (c.status === 'pending' && expirationDate) {
        const daysRemaining = differenceInDays(expirationDate, new Date());
        return {
          ...c,
          planInfo: `Expires in ${daysRemaining} days`,
        };
      }
      
      if (c.status === 'pending' && c.purchaseDate) {
        return {
          ...c,
          planInfo: `Purchased ${formatDistanceToNow(new Date(c.purchaseDate))} ago`,
        };
      }
      
      return c;
    }) || [];
  }, [customers]);

  const customerCounts = useMemo(() => {
    const counts = {
      active: 0,
      pending: 0,
      archived: 0,
      'follow-up': 0,
    };
    if (!isClient) return counts;

    const activeCustomers = processedCustomers.filter(c => !c.isArchived && !c.followUpDate && c.status === 'active');
    const pendingCustomers = processedCustomers.filter(c => !c.isArchived && !c.followUpDate && c.status === 'pending');
    
    counts.active = activeCustomers.length;
    counts.pending = pendingCustomers.length;
    
    for (const customer of processedCustomers) {
      if (customer.isArchived) {
        counts.archived++;
      } else if (customer.followUpDate) {
        counts['follow-up']++;
      }
    }
    return counts;
  }, [processedCustomers, isClient]);

  const filteredCustomers = useMemo(() => {
    if (!isClient) return [];
    
    let filtered = processedCustomers;

    if (filterStatus === 'archived') {
      filtered = filtered.filter(c => c.isArchived);
    } else if (filterStatus === 'follow-up') {
      filtered = filtered.filter(c => !c.isArchived && c.followUpDate);
    }
    else if (filterStatus === 'active' || filterStatus === 'pending') {
        if (activeTab === '40-plus-access') {
            filtered = filtered.filter(c => c.status === filterStatus && !c.oneAppAccess && !c.isArchived && !c.followUpDate);
        } else { // '1-app-access-only'
            filtered = filtered.filter(c => c.status === filterStatus && c.oneAppAccess && !c.isArchived && !c.followUpDate);
        }
    }
    else { // This case should ideally not be hit with the current logic, but as a fallback
      filtered = filtered.filter(c => !c.isArchived && c.status === filterStatus && !c.followUpDate);
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
  }, [processedCustomers, searchQuery, filterStatus, isClient, activeTab]);


  const handleAddCustomer = useCallback((newCustomerData: { email: string; phone: string; planDuration: '1 year' | '3 years', status: CustomerStatus, oneAppAccess?: boolean }) => {
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
      hasAccessPlan: newCustomerData.status === 'active',
      oneAppAccess: newCustomerData.oneAppAccess || false,
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

    const handleAddOneAppCustomer = useCallback((data: {email: string, phone: string, autodeskApp: string}) => {
        if (!customersCollection) return;

        const purchaseDate = new Date();
        const expirationDate = add(purchaseDate, { years: 3 });

        const newCustomer: Omit<Customer, 'id'> = {
            email: data.email,
            phone: data.phone,
            status: filterStatus === 'pending' ? 'pending' : 'active',
            planDuration: '3 years',
            purchaseDate: purchaseDate.toISOString(),
            expirationDate: expirationDate.toISOString(),
            hasAccessPlan: filterStatus === 'active',
            autodeskApp: data.autodeskApp,
            oneAppAccess: true,
            avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
            switchClicks: 0,
            isArchived: false,
        };
        addDocumentNonBlocking(customersCollection, newCustomer);
        setOneAppDialogOpen(false);
        toast({
            title: "Customer Added",
            description: `${data.email} has been added to '1 App Access Only'.`,
        });
    }, [customersCollection, toast, filterStatus]);

  const handleAddFollowUp = useCallback(async (data: { phone: string; note: string; days: number }) => {
    if (!firestore || !customersCollection) return;
  
    const followUpDate = add(new Date(), { days: data.days });
    
    const q = where("phone", "==", data.phone);
    const querySnapshot = await getDocs(collection(firestore, "customers"));
    const matchingCustomers = querySnapshot.docs.filter(doc => doc.data().phone === data.phone && !doc.data().isArchived);

  
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
            hasAccessPlan: true,
            oneAppAccess: customer.oneAppAccess || false, 
          };
      } else {
          updateData = {
            status: newStatus,
            switchClicks: 0,
            purchaseDate: deleteField() as any,
            expirationDate: deleteField() as any,
            hasAccessPlan: false,
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

  const handleDeleteClick = useCallback((customerId: string, view: 'archived' | 'follow-up') => {
    if (!firestore) return;
    const customer = customers?.find(c => c.id === customerId);
    if (!customer) return;

    const customerRef = doc(firestore, 'customers', customerId);
    const newDeleteClicks = (customer.deleteClicks || 0) + 1;

    const requiredClicks = view === 'archived' ? 5 : 4;

    if (newDeleteClicks >= requiredClicks) {
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
        description: `Click ${requiredClicks - newDeleteClicks} more times to permanently delete.`,
        duration: 2000,
        variant: "destructive",
      });
    }
  }, [customers, firestore, toast]);
  
  const openDialog = () => {
    if (filterStatus === 'follow-up') {
      setFollowUpDialogOpen(true);
    } else if (filterStatus === 'archived') {
      // This could be changed if adding archived customers directly is needed
      setDialogMode('pending');
      setDialogOpen(true);
    } else { // active or pending
      if (activeTab === '1-app-access-only') {
        setOneAppDialogOpen(true);
      } else {
        setDialogMode(filterStatus);
        setDialogOpen(true);
      }
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

  const handleAddAccessPlanClick = (customer: Customer) => {
    setCustomerForAccessPlan(customer);
    setAccessPlanDialogOpen(true);
  };

  const handleSaveAccessPlan = (data: { autodeskApp: string }) => {
    if (!firestore || !customerForAccessPlan) return;

    const customerRef = doc(firestore, 'customers', customerForAccessPlan.id);
    updateDocumentNonBlocking(customerRef, {
      hasAccessPlan: true,
      autodeskApp: data.autodeskApp,
    });

    setAccessPlanDialogOpen(false);
    setCustomerForAccessPlan(null);
    toast({
      title: "Access Plan Added",
      description: `An access plan has been added for ${customerForAccessPlan.email}.`,
    });
  };

  const handleDownload = () => {
    const dataToExport = filteredCustomers.map(c => {
      let daysRemaining = 'N/A';
      if (c.expirationDate) {
        const remaining = differenceInDays(new Date(c.expirationDate), new Date());
        daysRemaining = remaining > 0 ? `${remaining}` : 'Expired';
      }
      return {
        'Email': c.email,
        'Days Remaining': daysRemaining,
        'Phone Number': c.phone,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    const columnWidths = [
      { wch: 30 }, // Email
      { wch: 15 }, // Days Remaining
      { wch: 20 }, // Phone Number
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customers.xlsx");
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderRadioItem = (value: keyof typeof customerCounts, label: string) => (
    <DropdownMenuRadioItem value={value} className="flex justify-between">
      <span>{label}</span>
      <Badge variant="secondary" className="rounded-full">{customerCounts[value]}</Badge>
    </DropdownMenuRadioItem>
  );

  const renderContent = () => {
    if (filterStatus === 'active' || filterStatus === 'pending') {
        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="40-plus-access">40+ Access</TabsTrigger>
                    <TabsTrigger value="1-app-access-only">1 App Access Only</TabsTrigger>
                </TabsList>
                <TabsContent value="40-plus-access">
                    <CustomerList
                        customers={filteredCustomers}
                        onSwitchClick={handleSwitchClick}
                        onArchiveClick={handleArchiveClick}
                        onRestoreClick={handleRestoreClick}
                        onEditReasonClick={handleEditReasonClick}
                        onDeleteClick={handleDeleteClick}
                        onNotesClick={handleNotesClick}
                        onAddAccessPlanClick={handleAddAccessPlanClick}
                        currentView={filterStatus}
                        activeTab={activeTab}
                    />
                </TabsContent>
                <TabsContent value="1-app-access-only">
                    <CustomerList
                        customers={filteredCustomers}
                        onSwitchClick={handleSwitchClick}
                        onArchiveClick={handleArchiveClick}
                        onRestoreClick={handleRestoreClick}
                        onEditReasonClick={handleEditReasonClick}
                        onDeleteClick={handleDeleteClick}
                        onNotesClick={handleNotesClick}
                        onAddAccessPlanClick={handleAddAccessPlanClick}
                        currentView={filterStatus}
                        activeTab={activeTab}
                    />
                </TabsContent>
            </Tabs>
        )
    }
    return (
        <CustomerList
            customers={filteredCustomers}
            onSwitchClick={handleSwitchClick}
            onArchiveClick={handleArchiveClick}
            onRestoreClick={handleRestoreClick}
            onEditReasonClick={handleEditReasonClick}
            onDeleteClick={handleDeleteClick}
            onNotesClick={handleNotesClick}
            onAddAccessPlanClick={handleAddAccessPlanClick}
            currentView={filterStatus}
            activeTab={activeTab}
        />
    )
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Add {
                    filterStatus === 'follow-up' 
                    ? 'Follow-up' 
                    : 'Customer'
                  }
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" /> Download
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
                      {renderRadioItem('active', 'Active Customer')}
                      {renderRadioItem('pending', 'Pending Customer')}
                      {renderRadioItem('follow-up', 'Follow Up')}
                      {renderRadioItem('archived', 'Archive Customer')}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {renderContent()}
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

      <Dialog open={oneAppDialogOpen} onOpenChange={setOneAppDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add 1 App Access Customer</DialogTitle>
            <DialogDescription>
                Add a new customer with access to a single application for 3 years.
            </DialogDescription>
          </DialogHeader>
          <AddOneAppCustomerForm onSubmit={handleAddOneAppCustomer} />
        </DialogContent>
      </Dialog>

      <Dialog open={accessPlanDialogOpen} onOpenChange={setAccessPlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add 40+ Access Plan</DialogTitle>
            <DialogDescription>
              Select an Autodesk app for {customerForAccessPlan?.email}.
            </DialogDescription>
          </DialogHeader>
          <AddAccessPlanForm
            customer={customerForAccessPlan}
            onSubmit={handleSaveAccessPlan}
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
