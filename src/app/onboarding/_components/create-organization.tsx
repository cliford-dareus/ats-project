"use client";

import { BackgroundGradient } from "@/components/ui/background-gradient";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganizationList } from "@clerk/nextjs";
import { ArrowLeft, LucideCornerDownLeft } from "lucide-react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Props = {
  userId: string;
};

const orgSchema = z.object({
  name: z.string().min(2).max(100),
});

const CreateOrganization = ({ userId }: Props) => {
  const showText = useDebounce(true, 800);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatePending, startCreateTransaction] = useTransition();
  const { createOrganization, setActive } = useOrganizationList();

  const form = useForm<z.infer<typeof orgSchema>>({
    defaultValues: {
      name: "",
    },
  });

  const submit = async (data: z.infer<typeof orgSchema>) => {
    startCreateTransaction(async () => {
      try {
        if (createOrganization) {
          const new_org = await createOrganization({ name: data.name });
          await setActive({ organization: new_org.id });
          
          // Add organization to database
          // Add organization to user's list of organizations
          // await user.update({organizations: [...user.organizations, new_org.id]})
        
          const newSearchParams = new URLSearchParams(searchParams)
          newSearchParams.set("step", "success");
          newSearchParams.set("orgId", new_org.id);
          router.push(`/onboarding?${newSearchParams.toString()}`);
        }
      } catch (err) {
        console.log(err);
      }
    });
  };

  return (
    <motion.div
      className="flex flex-col h-screen p-4 container mx-auto"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      {showText && (
        <motion.div
          className="mt-[40%] w-full flex items-center"
          variants={{
            show: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          <motion.div className="w-[40%] flex flex-col gap-4">
            <span
              onClick={() => router.back()}
              className="text-muted-foreground flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Back
            </span>
            <motion.h1
              className="text-balance text-2xl font-bold text-blue-900"
              variants={{
                hidden: { opacity: 0, y: 50 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, type: "spring" },
                },
              }}
            >
              Organization Name
            </motion.h1>

            <motion.div
              className="flex flex-col gap-4"
              variants={{
                hidden: { opacity: 0, y: 50 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, type: "spring" },
                },
              }}
            >
              <div className="flex items-center gap-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(submit)}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <Input
                          className="md:text-6xl border-none outline-none shadow-none h-20 p-0 focus-visible:ring-0"
                          placeholder=""
                          {...field}
                          autoFocus
                        />
                      )}
                    />
                    <div className="flex items-center gap-4">
                      <Button disabled={isCreatePending} className="rounded-full bg-blue-400 px-10">
                        Next
                      </Button>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <LucideCornerDownLeft size={16} />
                        <span className=" text-sm">Or press Enter</span>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            </motion.div>
          </motion.div>

          <div className="ml-auto h-full w-[30%]">
            <BackgroundGradient className="min-w-[250px] grid grid-cols-1 p-4">
              <div className="border rounded-full p-2 h-10">
                <p className="">{form.watch("name")}</p>
              </div>
            </BackgroundGradient>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CreateOrganization;
