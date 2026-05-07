'use client'

import { useOrganization, useUser } from '@clerk/nextjs';
import { DataTable } from "@/app/(dashboard)/settings/_components/data-table";
import { columns, OrganizationMember } from "@/app/(dashboard)/settings/_components/colunm";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import CreateOrganization from "@/app/(dashboard)/settings/_components/create-organization";
import { ArrowRight, Building2, Globe, Mail, Plus, Shield, Zap } from "lucide-react";

const OrgMembersParams = {
    memberships: {
        pageSize: 2,
        keepPreviousData: true,
    },
};

const Page = () => {
    const { user } = useUser();
    const { isLoaded, memberships } = useOrganization(OrgMembersParams);

    if (!isLoaded) {
        return <>Loading</>
    };

    return (
        <div className="p-4">
            <div className="space-y-8">
                <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-zinc-100 flex items-start justify-between">
                        <div className="flex gap-6">
                            <div className="w-24 h-24 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center relative group">
                                <Building2 className="w-10 h-10 text-zinc-300 group-hover:text-brand-600 transition-colors" />
                                <button className="absolute -bottom-2 -right-2 p-1.5 bg-white border border-zinc-200 rounded-lg shadow-sm hover:bg-zinc-50">
                                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                                </button>
                            </div>
                            <div className="space-y-1 py-2">
                                <h3 className="text-xl font-bold text-zinc-900">TalentPortal Inc.</h3>
                                <p className="text-zinc-500 text-sm flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> talentportal.io
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold uppercase rounded border border-brand-100">Enterprise</span>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded border border-emerald-100">Verified</span>
                                </div>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all">
                            Edit Profile
                        </button>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Company Name</label>
                                <input type="text" defaultValue="TalentPortal Inc." className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Headquarters</label>
                                <input type="text" defaultValue="New York, NY" className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Industry</label>
                                <input type="text" defaultValue="Technology & SaaS" className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Founded Year</label>
                                <input type="text" defaultValue="2021" className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900">Security Policy</h4>
                            <p className="text-xs text-zinc-500 mt-1">Manage single sign-on and 2FA requirements.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Configure <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900">API Access</h4>
                            <p className="text-xs text-zinc-500 mt-1">Generate API keys for custom integrations.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Manage Keys <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900">Email Branding</h4>
                            <p className="text-xs text-zinc-500 mt-1">Custom domains and email templates.</p>
                        </div>
                        <button className="text-sm font-bold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
                            Set Up <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="py-4">
                {
                    memberships?.data &&
                    <div className="flex gap-4 items-center">
                        <h1 className="font-medium text-xl">{memberships?.data[0]?.organization.name.toUpperCase()}</h1>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>Create New Organization</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create Organization</DialogTitle>
                                    <DialogDescription>
                                        Make changes to your profile here. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <CreateOrganization />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                }

                <div className="mt-4">
                    <DataTable columns={columns} data={memberships?.data as unknown as OrganizationMember[]} />
                </div>
            </div>
        </div>
    )
};

export default Page;
