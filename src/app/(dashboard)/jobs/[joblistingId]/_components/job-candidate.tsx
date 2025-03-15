"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LucideEllipsis, LucideMail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ApplicationType } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  data: ApplicationType[];
  job_name: string;
};

const JobCandidate = ({ data, job_name }: Props) => {
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<ApplicationType>(data[0]);

  const handleSelectAll = () => {
    if (selectedCandidates.length === data.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(data.map((application) => application.id));
    }
  };

  const handleSelectCandidate = (id: number) => {
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(
        selectedCandidates.filter((candidateId) => candidateId !== id),
      );
    } else {
      setSelectedCandidates([...selectedCandidates, id]);
    }
  };

  return (
    <div className="">
      <div className="flex gap-4 h-full">
        <div className="rounded h-full">
          <div className="flex items-center justify-between py-4">
            <div>
              <h2 className="text-lg">All Applied</h2>
              <p className="text-sm text-slate-400">
                All Applied candidates are listed here.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <LucideEllipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Option 1</DropdownMenuItem>
                <DropdownMenuItem>Option 2</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-[40px] flex items-center gap-4">
            <Checkbox onCheckedChange={() => handleSelectAll()}  id="all" />
            <Label htmlFor="all">Select All</Label>
          </div>

          <div className="w-[400px] rounded border mt-4">
            {data.map((application) => (
              <div                
                onClick={() => setSelectedApplications(application)}
                className={cn("flex items-center justify-between p-2 cursor-pointer", {
                  "bg-slate-100": selectedCandidates.includes(application.id),
                })}
                key={application.application_id}
              >
                <div className="flex gap-4 items-center">
                  <Checkbox
                    checked={selectedCandidates.includes(application.application_id)}
                    onCheckedChange={() => handleSelectCandidate(application.application_id)}
                    id={String(application.application_id)}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <span>{application.candidate.name}</span>
                </div>
                <span>
                  <LucideMail size={18} />
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border rounded-lg flex-1">
          {selectedApplications && (
            <div>
              <div className="flex items-center justify-center w-full h-[100px] bg-red-300 rounded-t-lg">
                <div className="flex flex-col items-center justify-center">
                  <h2 className="text-lg font-bold">{ job_name}</h2>
                  <p className="text-sm">Select the candidate you want to interview</p>
                </div>
              </div>
              
              <div className="text-sm text-slate-500 p-4">
                Selected Application: {selectedApplications.candidate.name}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCandidate;
