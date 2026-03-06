import {Building2, CheckCircle2, Clock, Command, MapPin} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import React, {useEffect, useState} from "react";
import {cn} from "@/lib/utils";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {candidateForm, updateJobSchema} from "@/zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form} from "@/components/ui/form";
import {Button} from "@/components/ui/button";

type EditJobModalProps = {
    isOpen: boolean;
    setIsOpen:  React.Dispatch<React.SetStateAction<boolean>>;
};

const EditJobListingModal = ({isOpen, setIsOpen}: EditJobModalProps) => {
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        location: '',
        type: 'Full-time',
        status: 'Open',
    });
    const form = useForm<z.infer<typeof updateJobSchema>>({
        resolver: zodResolver(updateJobSchema)
    });
    //
    // useEffect(() => {
    //     if (job) {
    //         setFormData({
    //             title: job.title,
    //             department: job.department,
    //             location: job.location,
    //             type: job.type,
    //             status: job.status,
    //         });
    //     }
    // }, [job]);

    // if (!isOpen || !job) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader className="flex flex-row gap-4 items-center">
                    <div
                        className="flex aspect-square w-[52px] items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command/>
                    </div>
                    <div className="">
                        <DialogTitle className="text-2xl uppercase">Edit Job</DialogTitle>
                        <DialogDescription>Complete each step to create a candidate!</DialogDescription>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onsubmit)}
                        className="p-4 space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                    Job Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Senior Product Designer"
                                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                                        Department
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Dept</option>
                                        <option value="Engineering">Engineering</option>
                                        <option value="Design">Design</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Sales">Sales</option>
                                        <option value="Product">Product</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                        Location
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Remote or NYC"
                                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                        Employment Type
                                    </label>
                                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                                        {(['Full-time', 'Contract', 'Part-time']).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type })}
                                                className={cn(
                                                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                    formData.type === type
                                                        ? "bg-white text-brand-600 shadow-sm"
                                                        : "text-zinc-500 hover:text-zinc-700"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                                        Status
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Draft">Draft</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button
                                variant="ghost"
                                type="button"
                                // onClick={onClose}
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
    )
};

export default EditJobListingModal;