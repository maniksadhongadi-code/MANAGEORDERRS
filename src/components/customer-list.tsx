import type { Customer } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Repeat, Phone, Clock } from "lucide-react";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "./ui/badge";

interface CustomerListProps {
  customers: Customer[];
  onSwitchClick: (customerId: string) => void;
}

export function CustomerList({ customers, onSwitchClick }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No customers found.</h3>
        <p className="text-sm text-muted-foreground">Try a different search or add a new customer.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex-row items-center gap-4 space-y-0 bg-card/50 pb-4">
              <Avatar className="h-12 w-12 border">
                <AvatarImage asChild>
                  <Image src={customer.avatarUrl} alt={customer.email} width={48} height={48} data-ai-hint="person face" />
                </AvatarImage>
                <AvatarFallback>{customer.email.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <CardTitle className="truncate text-base font-bold">{customer.email}</CardTitle>
                <CardDescription className="truncate">{customer.status === 'active' ? 'Active User' : 'Pending User'}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 p-4 pt-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{customer.phone}</span>
              </div>
              <div className="flex items-start text-sm text-muted-foreground">
                <Clock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{customer.tenure}</span>
              </div>
            </CardContent>
            <CardFooter className="bg-card/50 p-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => onSwitchClick(customer.id)}
                    aria-label={`Switch status for ${customer.email}`}
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    Switch Status
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
            </CardFooter>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
