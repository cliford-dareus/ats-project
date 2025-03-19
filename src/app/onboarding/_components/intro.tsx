"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";

const Intro = () => {
  const router = useRouter();
  const showText = useDebounce(true, 800);

  const images = [
    { src: "calendar.png", top: "-250px", left: "0px" },
    { src: "chart.png", top: "-50px", left: "-400px" },
    { src: "communication.png", top: "300px", left: "100px" },
    { src: "paper.png", top: "-80px", left: "350px" },
    { src: "paper-2.png", top: "200px", left: "-250px" },
  ];

  return (
    <motion.div
      className="flex w-screen h-screen flex-col items-center justify-center"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      {showText && (
        <motion.div
          variants={{
            show: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="relative mx-5 flex flex-col items-center space-y-2.5 text-center sm:mx-auto"
        >
          <motion.h1
            className="text-balance text-4xl font-bold sm:text-5xl"
            variants={{
              hidden: { opacity: 0, y: 50 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, type: "spring" },
              },
            }}
          >
            Welcome to ATS
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
            Get started with your Ats in just a few steps and start tracking
            your jobs and candidates.
          </motion.p>
          <motion.div
            className="pt-4"
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
              className="px-8 py-2 rounded-full relative bg-slate-700 text-white text-sm hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200 border border-slate-600"
              onClick={() => router.push("/onboarding?step=organization")}
            >
              <div className="absolute inset-x-0 h-[2px] w-1/2 mx-auto -top-px shadow-2xl  bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
              <span className="relative z-20">Get started</span>
            </Button>
          </motion.div>
        </motion.div>
      )}
      
      {images.map((image, index) => (
        <motion.img
          key={index}
          src={image.src}
          alt={`Image ${index + 1}`}
          initial={{
            scale: 0.5,
            opacity: 0,
            top: `50%`,
            left: `50%`,
            x: "-50%",
            y: "-50%",
          }}
          animate={{
            scale: 1,
            opacity: 1,
            top: `calc(50% + ${image.top})`,
            left: `calc(50% + ${image.left})`,
            x: "-50%",
            y: "-50%",
          }}
          transition={{
            duration: 1.5,
            delay: index * 0.3,
            ease: [0.5, 0.71, 1, 1.5],
          }}
          style={{
            position: "absolute",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
          }}
        />
      ))}
    </motion.div>
  );
};

export default Intro;
