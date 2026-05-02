import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import ConnectionArrow from "@/components/ui/arrow-connection";
import { useState } from "react";

const Organization = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const showText = useDebounce(userId, 500);
  const [to, setTo] = useState("fromRef");

  return (
    <motion.div
      className="flex flex-col h-screen p-4 container mx-auto"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      {showText && (
        <motion.div
          className="mt-[30%] w-full flex items-center"
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
              className="text-balance text-2xl font-bold  text-blue-900 sm:text-5xl"
              variants={{
                hidden: { opacity: 0, y: 50 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, type: "spring" },
                },
              }}
            >
              Organization
            </motion.h1>
            <motion.p
              className="max-w-md text-muted-foreground transition-colors sm:text-lg"
              variants={{
                hidden: { opacity: 0, y: 50 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, type: "spring" },
                },
              }}
            >
              Create or join an organization to collaborate with others.
            </motion.p>
            <motion.div
              className="flex gap-4 mt-4"
              variants={{
                hidden: { opacity: 0, y: 50 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, type: "spring" },
                },
              }}
            >
              <Button
                onClick={() => router.push("/onboarding?step=create")}
                onMouseEnter={() => setTo("toCreateRef")}
                // onMouseLeave={() => setTo("fromRef")}
                className="px-8 py-2 rounded-full relative bg-slate-700 text-white text-sm hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200 border border-slate-600"
              >
                <div className="absolute inset-x-0 h-[2px] w-1/2 mx-auto -top-px shadow-2xl  bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                <span className="relative z-20">Create</span>
              </Button>
              <Button
                onClick={() => router.push("/onboarding?step=join")}
                onMouseEnter={() => setTo("toJoinRef")}
                // onMouseLeave={() => setTo("fromRef")}
                className="px-8 py-2 rounded-full relative bg-blue-400 text-white text-sm hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200"
              >
                <div className="absolute inset-x-0 h-[2px] w-1/2 mx-auto -top-px shadow-2xl  bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
                <span className="relative z-20">Join</span>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div className="ml-auto w-[40%] h-full">
            {showText && <ConnectionArrow to={to} />}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Organization;
