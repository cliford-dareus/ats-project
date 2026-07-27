"use client";

import ExtractFileButton from "@/components/extract-table-button";
import { ApplicationResponseType, CandidatesResponseType, JobResponseType } from "@/types";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@react-email/components";

type ListPageTopProps = {
    name: string;
    count: number;
    file: string;
    data?: JobResponseType[] | ApplicationResponseType[] | CandidatesResponseType[]
};

const ListPageTop = ({ name, count, file, data }: ListPageTopProps) => {
    const [viewMode, setViewMode] = useState('list');
    const [showAdvanceFilter, setShowAdvanceFilter] = useState(false);
    return (
        <>
            <div className="flex items-center justify-between p-4 bg-muted border rounded-2xl mb-2 w-full">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{name.toUpperCase()}</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">
                        {count}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <ExtractFileButton file_name={file} data={data!} />

                    <div className="flex items-center gap-3 border rounded-md px-4">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sort By</Label>
                        <Select
                        // value={sortBy}
                        // onChange={(e) => setSortBy(e.target.value)}
                        >
                            <SelectTrigger className="min-w-30 bg-transparent !p-0 text-xs uppercase tracking-wider border-none outline-none focus:outline-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 !p-0 border-none rounded-md text-xs font-medium focus:outline-none transition-all">
                                <SelectGroup className="outline-none">
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="most-applicants">Most Applicants</SelectItem>
                                    <SelectItem value="least-applicants">Least Applicants</SelectItem>
                                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {file != "application" && <div className="flex bg-background border border-slate-200 rounded-md shadow-sm">
                        <Button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={14} />
                        </Button>
                        <Button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={14} />
                        </Button>
                    </div>}
                </div>
            </div>

            {file == "jobs" && showAdvanceFilter && (
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Posted Within</label>
                        <Select
                        // value={postedWithin}
                        // onChange={(e) => setPostedWithin(e.target.value)}
                        >
                            <SelectTrigger className="">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all">
                                <SelectItem value="All">Anytime</SelectItem>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Min Applicants</Label>
                        <Input
                            type="number"
                            min="0"
                            // value={minApplicants}
                            // onChange={(e) => setMinApplicants(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default ListPageTop;
