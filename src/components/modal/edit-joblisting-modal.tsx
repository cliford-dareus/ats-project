"use client";

import { Building2, CheckCircle2, Clock, Command, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { JOB_STATUS, JOB_TYPE, updateJobListingSchema } from "@/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JobResponseType } from "@/types";
import { update_job_action } from "@/server/actions/job-listings-actions";

type EditJobModalProps = {
  isEditJobOpen: boolean;
  setIsEditJobOpen: React.Dispatch<React.SetStateAction<boolean>>;
  data: JobResponseType;
};

const EditJobListingModal = ({
  isEditJobOpen,
  setIsEditJobOpen,
  data,
}: EditJobModalProps) => {
  const form = useForm<z.infer<typeof updateJobListingSchema>>({
    resolver: zodResolver(updateJobListingSchema),
    defaultValues: {
      name: data.name,
      description: data.description,
      location: data.location,
      salary_up_to: data.salary,
      department: data.department,
      type: data.type,
      status: data.status,
      jobId: data.id,
    },
  });

  const onsubmit = async (data: z.infer<typeof updateJobListingSchema>) => {
    try {
      console.log("CALL", data);
      const response = await update_job_action({ ...data, jobId: data.jobId });
      if (response) {
        setIsEditJobOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isEditJobOpen || !data) return null;

  return (
    <Dialog open={isEditJobOpen} onOpenChange={setIsEditJobOpen}>
      <DialogHeader className="flex flex-row gap-4 items-center">
        <div className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Command />
        </div>
        <div className="">
          <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
          <DialogDescription>
            Complete each step to create a candidate!
          </DialogDescription>
        </div>
      </DialogHeader>

      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onsubmit)}
            className="p-4 space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="">
                      <FormLabel className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                        Job Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="e.g. Senior Product Designer"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 ">
                  <FormField
                    name="salary_up_to"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="">
                        <FormLabel className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          Job Salary
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="w-full min-h-[60px] px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="e.g. Senior Product Designer"
                            type="number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="">
                        <FormLabel className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="e.g. Senior Product Designer"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                          Department
                        </label>
                        <Select
                          // className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none"
                          value={field.value}
                          onValueChange={field.onChange}
                          defaultValue={data.department}
                        >
                          <SelectTrigger>{field.value}</SelectTrigger>
                          <SelectContent>
                            <option value="">Select Dept</option>
                            <SelectItem value="Engineering">
                              Engineering
                            </SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Product">Product</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          Location
                        </label>
                        <Input
                          className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          placeholder="e.g. Remote or NYC"
                          {...field}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          Employment Type
                        </FormLabel>
                        <div className="flex bg-zinc-100 p-1 rounded-xl">
                          {JOB_TYPE.options.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => form.setValue("type", type)}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                field.value === type
                                  ? "bg-white text-brand-600 shadow-sm"
                                  : "text-zinc-500 hover:text-zinc-700",
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          Status
                        </label>
                        <Select
                          // className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none"
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>{field.value}</SelectTrigger>
                          <SelectContent>
                            {JOB_STATUS.options.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsEditJobOpen(false)}
                className="flex-1 py-3 border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 py-3 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobListingModal;
