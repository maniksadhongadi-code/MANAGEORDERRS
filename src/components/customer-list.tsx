import type { Customer } from "@/lib/types";
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
import { Repeat, Trash2 } from "lucide-react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { differenceInDays } from 'date-fns';
import { cn } from "@/lib/utils";

interface CustomerListProps {
  customers: Customer[];
  onSwitchClick: (customerId: string) => void;
  onDeleteClick?: (customerId: string) => void;
}

export function CustomerList({ customers, onSwitchClick, onDeleteClick }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No customers found.</h3>
        <p className="text-sm text-muted-foreground">Try a different search or add a new customer.</p>
      </div>
    );
  }

  const isPendingList = customers.length > 0 && customers[0]?.status === 'pending';

  return (
    <TooltipProvider>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>
                {isPendingList ? 'Purchase Info' : 'Plan Expiration'}
              </TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const isExpiringSoon = customer.expirationDate && differenceInDays(new Date(customer.expirationDate), new Date()) < 30;
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
                <TableCell className={cn(isExpiringSoon && "text-destructive font-semibold")}>{customer.planInfo}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
                    {isPendingList && onDeleteClick && (
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteClick(customer.id)}
                            aria-label={`Delete customer ${customer.email}`}
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
