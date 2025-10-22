import type { Customer, CustomerStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Repeat, Trash2, Undo, Pencil, Delete, FileText, Dot, PlusCircle } from "lucide-react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { differenceInDays, differenceInHours, isPast } from 'date-fns';
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./icons/whatsapp-icon";

interface CustomerListProps {
  customers: Customer[];
  onSwitchClick: (customerId: string) => void;
  onArchiveClick?: (customerId: string) => void;
  onRestoreClick?: (customerId: string) => void;
  onEditReasonClick?: (customer: Customer) => void;
  onDeleteClick?: (customerId: string, view: 'archived' | 'follow-up') => void;
  onNotesClick: (customer: Customer) => void;
  onAddAccessPlanClick: (customer: Customer) => void;
  currentView: CustomerStatus | "archived" | "follow-up";
  activeTab: string;
}

export function CustomerList({ customers, onSwitchClick, onArchiveClick, onRestoreClick, onEditReasonClick, onDeleteClick, onNotesClick, onAddAccessPlanClick, currentView, activeTab }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No customers found.</h3>
        <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
      </div>
    );
  }

  const isArchivedView = currentView === 'archived';
  const isFollowUpView = currentView === 'follow-up';
  const isOneAppAccessTab = activeTab === '1-app-access-only';
  const now = new Date();

  return (
    <TooltipProvider>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isArchivedView ? 'Reason for Archival' : isFollowUpView ? 'Follow-up Date' : 'Details'}</TableHead>
              {activeTab === '40-plus-access' && (currentView === 'active' || currentView === 'pending') && <TableHead>40+ Access Plan</TableHead>}
              {isOneAppAccessTab && <TableHead>Assigned App</TableHead>}
              <TableHead>Follow Up</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const isExpiringSoon = customer.status === 'active' && customer.expirationDate && differenceInDays(new Date(customer.expirationDate), now) < 30;
              const hoursPending = customer.status === 'pending' && customer.purchaseDate ? differenceInHours(now, new Date(customer.purchaseDate)) : 0;
              const isFollowUpDue = isFollowUpView && customer.followUpDate && isPast(new Date(customer.followUpDate));

              return (
              <TableRow key={customer.id} className={cn(
                  isExpiringSoon && "bg-destructive/10",
                  isFollowUpDue && "bg-destructive/10"
                )}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                       <AvatarImage asChild>
                         <Image src={customer.avatarUrl} alt={customer.email} width={36} height={36} data-ai-hint="person face" />
                       </AvatarImage>
                       <AvatarFallback>{customer.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "font-medium",
                      hoursPending > 24 && "text-destructive",
                      hoursPending > 12 && hoursPending <= 24 && "text-blue-600"
                    )}>
                      {customer.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isFollowUpView && customer.followUpDate && (
                    <div className="flex items-center">
                      {isFollowUpDue && <Dot className="h-8 w-8 text-destructive" />}
                       <Badge variant="outline">Follow-up</Badge>
                    </div>
                  )}
                  {!isFollowUpView && (
                    customer.isArchived ? (
                      <Badge variant="destructive">Archived</Badge>
                    ) : (
                      <Badge variant={customer.status === 'active' ? 'secondary' : 'outline'}>
                        {customer.status}
                      </Badge>
                    )
                  )}
                </TableCell>
                <TableCell className={cn(isExpiringSoon && "text-destructive font-semibold")}>
                  {isArchivedView ? customer.reasonForArchival : isFollowUpView ? (customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'N/A') : customer.planInfo}
                </TableCell>
                {activeTab === '40-plus-access' && (currentView === 'active' || currentView === 'pending') && (
                  <TableCell>
                    {customer.hasAccessPlan && customer.autodeskApp ? (
                      <Badge variant="outline">{customer.autodeskApp}</Badge>
                    ) : (
                      customer.status === 'active' && 
                      <Button variant="outline" size="sm" onClick={() => onAddAccessPlanClick(customer)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Plan
                      </Button>
                    )}
                  </TableCell>
                )}
                {activeTab === '1-app-access-only' && (
                   <TableCell>
                    {customer.autodeskApp ? (
                      <Badge variant="outline">{customer.autodeskApp}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{customer.phone}</span>
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onNotesClick(customer)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View/Edit Notes</p>
                      </TooltipContent>
                     </Tooltip>
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <a href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <WhatsAppIcon className="h-5 w-5 text-green-500" />
                            </Button>
                          </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Chat on WhatsApp</p>
                      </TooltipContent>
                     </Tooltip>
                  </div>
                  </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {isArchivedView && onRestoreClick && onEditReasonClick && onDeleteClick && (
                       <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRestoreClick(customer.id)}
                              aria-label={`Restore customer ${customer.email}`}
                            >
                              <Undo className="mr-2 h-4 w-4" />
                              Restore
                              {customer.restoreClicks && customer.restoreClicks > 0 ? (
                                <Badge variant="secondary" className="ml-2 tabular-nums">
                                  {customer.restoreClicks}/3
                                </Badge>
                              ) : null}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click 3 times to restore this customer.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditReasonClick(customer)}
                              aria-label={`Edit reason for ${customer.email}`}
                              className="text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Archive Reason</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteClick(customer.id, 'archived')}
                                aria-label={`Permanently delete customer ${customer.email}`}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                                {customer.deleteClicks && customer.deleteClicks > 0 ? (
                                  <Badge variant="destructive" className="ml-2 tabular-nums">
                                    {customer.deleteClicks}/5
                                  </Badge>
                                ) : null}
                              </Button>
                          </TooltipTrigger>
                           <TooltipContent>
                              <p>Click 5 times to permanently delete.</p>
                           </TooltipContent>
                        </Tooltip>
                       </>
                    )}
                    {isFollowUpView && onDeleteClick && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteClick(customer.id, 'follow-up')}
                            aria-label={`Permanently delete customer ${customer.email}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                            {customer.deleteClicks && customer.deleteClicks > 0 ? (
                              <Badge variant="destructive" className="ml-2 tabular-nums">
                                {customer.deleteClicks}/4
                              </Badge>
                            ) : null}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click 4 times to permanently delete.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!isArchivedView && !isFollowUpView &&(
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSwitchClick(customer.id)}
                              aria-label={`Switch status for ${customer.email}`}
                            >
                              <Repeat className="mr-2 h-4 w-4" />
                              Switch
                              {customer.switchClicks > 0 && (
                                <Badge variant="secondary" className="ml-2 tabular-nums">
                                  {customer.switchClicks}/4
                                </Badge>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click 4 times to move this customer.</p>
                          </TooltipContent>
                        </Tooltip>
                        {customer.status === 'pending' && onArchiveClick && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onArchiveClick(customer.id)}
                                aria-label={`Archive customer ${customer.email}`}
                                className="text-destructive hover-bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Archive Customer</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </Card>
    </TooltipProvider>
  );
}
