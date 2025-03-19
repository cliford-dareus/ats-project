"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { motion } from "framer-motion";
import { ArrowLeft, LucideCornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const JoinOrganization = ({ userId }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showText = useDebounce(true, 800);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  return (
    <motion.div
      className="flex flex-col h-screen p-4 container mx-auto"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      {showText && <motion.div
        className="mt-[40%] w-full flex"
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
          <span onClick={() => router.back()} className="text-muted-foreground flex items-center gap-2 cursor-pointer">
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
            Organization Link
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
              <span className="text-5xl text-muted-foreground">https://</span>
              <Input
                ref={inputRef}
                className="md:text-6xl border-none outline-none shadow-none h-14 p-0 focus-visible:ring-0 caret-sky-500"
                placeholder=""
              />
            </div>

            <div className="flex items-center gap-4">
              <Button className="rounded-full bg-blue-400 px-10">Next</Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <LucideCornerDownLeft size={16} />
                <span className=" text-sm">or press Enter</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="">
          <div className="h-[300px]">
            <div className="">{ }</div>
          </div>
        </div>
      </motion.div>}
    </motion.div>
  );
};

export default JoinOrganization;
