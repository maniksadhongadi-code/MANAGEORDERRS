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
import { Repeat, Trash2, Undo, Pencil } from "lucide-react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { differenceInDays } from 'date-fns';
import { cn } from "@/lib/utils";

interface CustomerListProps {
  customers: Customer[];
  onSwitchClick: (customerId: string) => void;
  onArchiveClick?: (customerId: string) => void;
  onRestoreClick?: (customerId: string) => void;
  onEditReasonClick?: (customer: Customer) => void;
  currentView: "all" | CustomerStatus | "archived";
}

export function CustomerList({ customers, onSwitchClick, onArchiveClick, onRestoreClick, onEditReasonClick, currentView }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No customers found.</h3>
        <p className="text-sm text-muted-foreground">Try a different search or filter.</p>
      </div>
    );
  }

  const isArchivedView = currentView === 'archived';

  return (
    <TooltipProvider>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isArchivedView ? 'Reason for Archival' : 'Details'}</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const isExpiringSoon = customer.status === 'active' && customer.expirationDate && differenceInDays(new Date(customer.expirationDate), new Date()) < 30;
              
              return (
              <TableRow key={customer.id} className={cn(isExpiringSoon && "bg-destructive/10")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border">
                       <AvatarImage asChild>
                         <Image src={customer.avatarUrl} alt={customer.email} width={36} height={36} data-ai-hint="person face" />
                       </AvatarImage>
                       <AvatarFallback>{customer.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{customer.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {customer.isArchived ? (
                    <Badge variant="destructive">Archived</Badge>
                  ) : (
                    <Badge variant={customer.status === 'active' ? 'secondary' : 'outline'}>
                      {customer.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className={cn(isExpiringSoon && "text-destructive font-semibold")}>
                  {isArchivedView ? customer.reasonForArchival : customer.planInfo}
                </TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {isArchivedView && onRestoreClick && onEditReasonClick && (
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
                       </>
                    )}
                    {!isArchivedView && (
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
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
