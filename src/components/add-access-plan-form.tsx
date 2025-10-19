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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/lib/types";
import { autodeskApps } from "@/lib/autodesk-apps";
import { useEffect } from "react";

const formSchema = z.object({
  autodeskApp: z.string().min(1, { message: "Please select an app." }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAccessPlanFormProps {
  customer: Customer | null;
  onSubmit: (data: FormValues) => void;
}

export function AddAccessPlanForm({
  customer,
  onSubmit,
}: AddAccessPlanFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      autodeskApp: "",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        autodeskApp: customer.autodeskApp || "",
      });
    }
  }, [customer, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="autodeskApp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Autodesk Application</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an application" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {autodeskApps.map((app) => (
                    <SelectItem key={app.id} value={app.name}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Save Plan
        </Button>
      </form>
    </Form>
  );
}
