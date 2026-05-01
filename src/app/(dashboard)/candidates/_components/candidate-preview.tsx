"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CandidatesResponseType } from "@/types";
import {
  Bot,
  Briefcase,
  Calendar,
  CalendarPlus2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dot,
  Edit3,
  Expand,
  File,
  FileText,
  FileUser,
  Mail,
  Maximize2,
  MessageCircle,
  Paperclip,
  ScanEye,
  Share,
  Share2,
  Star,
  Tally1,
  Users,
  X,
} from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { get_candidate_attachments } from "@/server/queries/mongo/attachment";
import InternalNoteSection from "@/components/internal-note-section";

type Props = {
  data: CandidatesResponseType;
  candidates: CandidatesResponseType[];
};

const CandidatePreview = ({ data, candidates }: Props) => {
  const [currentCandidate, setCurrentCandidate] =
    useState<CandidatesResponseType | null>(null);
  const [open, setOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    setCurrentCandidate(
      candidates.find((candidate) => candidate.id === data.id) ?? null,
    );
  }, [data, candidates]);

  const generateFn = async () => {
    setIsPreviewing(true);
    try {
      const response = await fetch("/api/upload/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: data.cv_path }),
      });

      if (!response.ok) {
        return;
      }

      const summaryData = await response.json();
      setGeneratedSummary(summaryData.result);
    } catch (error) {
      console.log(error);
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    const fetchAttachments = async () => {
      const attachments = await get_candidate_attachments(data.id);
      const parsedAttachments = JSON.parse(attachments);
      setAttachments(parsedAttachments);
    };
    fetchAttachments().then((r) => console.log(r));
  }, [data]);

  const nextApplication = () => {
    const currentIndex = candidates.findIndex(
      (app) => app.id === currentCandidate?.id,
    );
    if (currentIndex < candidates.length - 1) {
      setCurrentCandidate(candidates[currentIndex + 1]);
    }
  };

  const prevApplication = () => {
    const currentIndex = candidates.findIndex(
      (app) => app.id === currentCandidate?.id,
    );
    if (currentIndex > 0) {
      setCurrentCandidate(candidates[currentIndex - 1]);
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
                  router.push(`/applications/${currentCandidate?.id}`);
                }}
                className="flex items-center justify-center cursor-pointer"
              >
                <Expand size={16} />
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex gap-2 items-center ml-auto">
          <Button
            onClick={() => prevApplication()}
            className=""
            variant="ghost"
          >
            <ChevronLeft />
          </Button>
          <Button
            onClick={() => nextApplication()}
            className=""
            variant="ghost"
          >
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
                    {currentCandidate?.status}
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
                  {currentCandidate?.name}
                </h3>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                  <span className="uppercase text-primary">
                    Software Engineer
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
                  <p className="text-sm font-bold">
                    {currentCandidate?.attachmentsCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Email
                  </p>
                  <p className="text-sm font-bold">{currentCandidate?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Phone
                  </p>
                  <p className="text-sm font-bold">{currentCandidate?.phone}</p>
                </div>
              </div>
            </div>

            {/* Decorative background element */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                  Active Applications
                </span>
              </div>
              <p className="text-xl font-bold">
                {currentCandidate?.applicationsCount}
              </p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                  Applied On
                </span>
              </div>
              <p className="text-xl font-bold">
                {new Date(currentCandidate?.created_at as Date).toDateString()}
              </p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase text-foreground/30 tracking-wider">
                  Attachments
                </span>
              </div>
              <p className="text-xl font-bold">
                {currentCandidate?.attachmentsCount}
              </p>
            </div>
          </div>

          {/*Details List*/}
          <div className="space-y-6">
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
            parent_type="canditate"
            parent_id={currentCandidate?.id}
            selectedId={currentCandidate?.id}
          />
        </div>
      </div>

      {/*<div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground">
              <ScanEye size={16} />
              Canditate Preview
            </div>

            <span className="flex items-center gap-4 text-sm text-muted-foreground">
              <CalendarPlus2 size={16} />
              Created on {new Date(data.created_at).toDateString()}
            </span>
          </div>

          <div className="flex justify-between mt-4">
            <div className="flex flex-col">
              <span className="text-2xl font-medium text-gray-900">
                {data.name}
              </span>
              <Breadcrumb className="">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <span className="text-sm text-muted-foreground">
                      Sofware Developer
                    </span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <Dot size={20} />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <Badge
                      className="font-thin self-start"
                      variant={
                        data.status == "Active"
                          ? "active"
                          : data.status == "Hired"
                            ? "outline"
                            : "default"
                      }
                    >
                      {data.status}
                    </Badge>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-4 self-start">
              <Button variant="outline" className="text-sm">
                <MessageCircle size={16} />
                <span>Send Message</span>
              </Button>
              <Button variant="outline" className="text-sm">
                <Mail size={16} />
                <span>Send email</span>
              </Button>
            </div>
          </div>

          <div className="border rounded-md p-4 mt-2">
            <span className="text-sm text-muted-foreground">
              Email: {data.email}
            </span>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-4 h-[30px]">
            <div className="flex gap-4 items-center w-[200px] text-muted-foreground">
              <Briefcase size={18} />
              Sourced from
            </div>
            <div className="flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground">
              Linkedin
            </div>
          </div>
          <div className="flex items-center gap-4 h-[30px]">
            <div className="flex gap-4 items-center w-[200px] text-muted-foreground">
              <FileUser size={18} />
              Applications
            </div>
            <div className="">{data.applicationsCount}</div>
          </div>
          <div className="flex items-center gap-4 h-[30px]">
            <div className="flex gap-4 items-center w-[200px] text-muted-foreground">
              <Paperclip size={18} />
              Attachments
            </div>
            <div className="">{attachments.length}</div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText size={18} />
              Candidate File
            </div>

            <Button className="flex items-center gap-2" onClick={generateFn}>
              <ScanEye size={18} />
              <span className="flex items-center gap-2">
                {isPreviewing ? "Generating..." : "Generate Summary"}
              </span>
            </Button>
          </div>

          <div className="border rounded-md mt-4 h-[80px]">
            <div className="flex items-center gap-4 h-full p-4">
              <div className="flex items-center justify-center rounded-md bg-purple-500 w-[50px] h-full">
                <File size={18} color="white" />
              </div>
              <div className="flex flex-col text-sm">
                <span className="">Resume-file.pdf</span>
                <div className="flex gap-2">
                  <span className="text-muted-foreground">12MB</span>
                  <span>
                    <Dot size={18} />
                  </span>
                  <span
                    className="text-purple-500 cursor-pointer"
                    onClick={() => setOpen(true)}
                  >
                    Preview
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>*/}

      {/*{generatedSummary && (
        <div className="p-4 flex flex-col gap-2 h-[250px] mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot size={18} />
            AI Resume Summary
          </div>
          <div className="h-full border rounded-md p-4 text-muted-foreground">
            <p>{generatedSummary}</p>
          </div>
        </div>
      )}*/}

      {/*<div className="p-4 mt-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 border border-input bg-background rounded-md px-2 py-1 text-sm font-thin self-start text-muted-foreground">
            <CalendarPlus2 size={18} />
            Notes
          </div>
          <span className="text-purple-500 cursor-pointer font-semibold">
            See All
          </span>
        </div>
        <div className="h-full border rounded-md p-4 text-muted-foreground mt-4">
          <p>No notes yet</p>
        </div>
      </div>*/}

      {/*{open && (
        <div className="p-4 mt-4">
          <object
            data={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.cv_path}`}
            type="application/pdf"
            width="100%"
            height="300px"
          >
            <p>
              Alternative text - include a link{" "}
              <a
                href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.cv_path}`}
              >
                to the PDF!
              </a>
            </p>
          </object>
        </div>
      )}*/}
    </>
  );
};

export default CandidatePreview;
