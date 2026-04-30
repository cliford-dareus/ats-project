"use client";

import { ApplicationResponseType } from "@/types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SheetClose } from "@/components/ui/sheet";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Expand,
  Mail,
  Maximize2,
  Paperclip,
  Phone,
  Share,
  Share2,
  Star,
  Tally1,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import InternalNoteSection from "@/components/internal-note-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JOB_STAGES } from "@/zod";
import { Button } from "@/components/ui/button";

type Props = {
  data: ApplicationResponseType;
  applications: ApplicationResponseType[];
};

const ApplicationPreview = ({ data, applications }: Props) => {
  const [currentApplication, setCurrentApplication] =
    React.useState<ApplicationResponseType | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrentApplication(
      applications.find((app) => app.id === data.id) || null,
    );
  }, [applications, data]);

  const nextApplication = () => {
    const currentIndex = applications.findIndex((app) => app.id === currentApplication?.id);
    if (currentIndex < applications.length - 1) {
      setCurrentApplication(applications[currentIndex + 1]);
    }
  };

  const prevApplication = () => {
    const currentIndex = applications.findIndex((app) => app.id === currentApplication?.id);
    if (currentIndex > 0) {
      setCurrentApplication(applications[currentIndex - 1]);
    }
  };

  return (
    <>
      <div className="flex items-center p-4 border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <SheetClose className="flex items-center justify-center cursor-pointer">
                <X size={20} />
              </SheetClose>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Tally1 />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span
                onClick={() => {
                  router.push(`/applications/${currentApplication?.id}`);
                }}
                className="flex items-center justify-center cursor-pointer"
              >
                <Expand size={16} />
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex gap-2 items-center ml-auto">
          <Button onClick={() => prevApplication()} className="" variant="ghost">
            <ChevronLeft />
          </Button>
          <Button onClick={() => nextApplication()} className="" variant="ghost">
            <ChevronRight />
          </Button>
        </div>
        <span className="flex items-center justify-center text-sm text-muted-foreground sm:gap-2.5 ml-4">
          <Share size={16} />
        </span>
      </div>

      <div className="px-4">
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Header */}
          <div className="bg-foreground rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                  <Briefcase size={24} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-accent text-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    {currentApplication?.status}
                  </div>
                  <div className="flex gap-2">
                    <Edit3
                      size={16}
                      className="text-white/40 cursor-pointer hover:text-white transition-colors"
                    />
                    <Share2
                      size={16}
                      className="text-white/40 cursor-pointer hover:text-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold font-mono uppercase tracking-tight">
                  {currentApplication?.candidate_name}
                </h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                  Applying for{" "}
                  <span className="uppercase text-primary">
                    {currentApplication?.job_apply}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Rating
                  </p>
                  <div className="font-mono flex items-center gap-1">
                    <p className="text-sm font-semibold">{4.6}</p>
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Location
                  </p>
                  <p className="text-sm font-bold">{currentApplication?.location}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Type
                  </p>
                  <p className="text-sm font-bold">{data?.type}</p>
                </div>
              </div>
            </div>

            {/* Decorative background element */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-brand-dark uppercase tracking-widest">
              QUICK ACTIONS
            </h4>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-brand-light text-brand-dark text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-brand-dark/5 transition-colors">
                Advance Stage
              </button>
              <div className="flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 bg-primary text-white text-[10px] font-bold rounded-l-lg uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary/90 transition-colors">
                      <UserCheck size={14} />
                      Advance
                      <ChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    defaultValue={currentApplication?.current_stage}
                    align="end"
                  >
                    <DropdownMenuLabel>Advance Candidate</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {JOB_STAGES.options.map((stage) => (
                      <DropdownMenuItem
                        defaultValue={
                          stage === currentApplication?.current_stage ? currentApplication?.current_stage : ""
                        }
                        key={stage}
                      >
                        {stage}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-r-lg uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-colors">
                      <UserX size={14} />
                      Reject
                      <ChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Rejection Reasons</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <AlertCircle size={16} className="mr-2" />
                      Not qualified
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CheckCircle size={16} className="mr-2" />
                      Position filled
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Clock size={16} className="mr-2" />
                      No response
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <XCircle size={16} className="mr-2" />
                      Other
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                  Current Stage
                </span>
              </div>
              <p className="text-xl font-bold">{currentApplication?.current_stage}</p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                  Applied On
                </span>
              </div>
              <p className="text-xl font-bold">
                {new Date(currentApplication?.apply_date as Date).toDateString()}
              </p>
            </div>
          </div>

          {/*Details List*/}
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                <Mail size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                  EMAIL
                </p>
                <p className="text-xs font-bold">{currentApplication?.candidate_email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                <Phone size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                  PHONE NUMBER
                </p>
                <p className="text-xs font-bold">{currentApplication?.candidate_phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                <Paperclip size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                  ATTACHMENT
                </p>
                <p className="text-xs font-bold text-primary hover:underline cursor-pointer">
                  attachment.pdf
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-primary/5 rounded-lg transition-colors text-foreground/30">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 rounded-lg bg-background/5 flex items-center justify-center text-foreground/30 group-hover:text-primary transition-colors">
                <Star size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                  CAN CONTACT
                </p>
                <CheckCircle2 size={16} className="text-foreground/60 mt-1" />
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-primary/5 rounded-lg transition-colors text-foreground/30">
                  <Mail size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Internal Notes & Comments */}
          <InternalNoteSection
            parent_type="application"
            parent_id={currentApplication?.id}
            selectedId={currentApplication?.id}
          />
        </div>
      </div>
    </>
  );
};

export default ApplicationPreview;
