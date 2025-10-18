"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerStatus } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number is too short." }),
  planInfo: z.string(), // Kept for pending, but can be empty for active
  planDuration: z.enum(['1 year', '3 years']).optional(),
  status: z.enum(['active', 'pending']),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCustomerFormProps {
  onSubmit: (data: FormValues) => void;
  mode: CustomerStatus;
}

export function AddCustomerForm({ onSubmit, mode }: AddCustomerFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      phone: "",
      planInfo: "",
      planDuration: mode === 'active' ? '1 year' : undefined,
      status: mode,
    },
  });

  useEffect(() => {
    form.reset({
      email: "",
      phone: "",
      planInfo: "",
      planDuration: mode === 'active' ? '1 year' : undefined,
      status: mode,
    });
  }, [mode, form]);

  function handleSubmit(values: FormValues) {
    if (mode === 'pending') {
      if (!values.planInfo) {
        form.setError("planInfo", { type: "manual", message: "This field is required for pending customers." });
        return;
      }
    }
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="customer@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'active' ? (
          <FormField
            control={form.control}
            name="planDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription Plan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1 year">1 Year</SelectItem>
                    <SelectItem value="3 years">3 Years</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="planInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Information</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Purchased 1 week ago" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Add Customer</Button>
      </form>
    </Form>
  );
}
