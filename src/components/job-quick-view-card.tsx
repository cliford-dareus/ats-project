import { Briefcase } from "lucide-react";

type Props = {
    name: string;
    department: string;
    location: string;
    type: string;
};

const JobQuickViewCard = ({name, department, location, type}: Props) => {
    return (
        <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Job
                    Overview</h3>
            </div>
            <div>
                <p className="text-lg font-bold leading-tight">{name}</p>
                <p className="text-zinc-400 text-sm">{department}</p>
            </div>
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Location</span>
                    <span
                        className="font-medium">{location}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Type</span>
                    <span className="font-medium">{type}</span>
                </div>
            </div>
        </div>
    );
};

export default JobQuickViewCard;
