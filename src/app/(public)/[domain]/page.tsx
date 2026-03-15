import {db} from "@/drizzle/db";
import {job_listings} from "@/drizzle/schema";
import {eq} from "drizzle-orm";
import {ArrowRight, Briefcase, Clock, MapPin} from "lucide-react";

export default async function CareerPage({ params }: {  params: Promise<{ domain: string}> }) {
    const { domain } = await params;
    const openJobs = await db.select().from(job_listings).where(eq(job_listings.subdomain, domain));

    if (openJobs.length === 0) {
        return (
            <div>
                No Open Job Available...
            </div>
        )
    }


    return (
        <div
            // key="list"
            // initial={{ opacity: 0, y: 20 }}
            // animate={{ opacity: 1, y: 0 }}
            // exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            {/*<div className="max-w-2xl">*/}
            {/*    <h2 className="text-4xl font-bold text-zinc-900 mb-4">{activeTheme.headingText}</h2>*/}
            {/*    <p className="text-lg text-zinc-500">{activeTheme.subheadingText}</p>*/}
            {/*</div>*/}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {openJobs.map((job) => (
                    <div
                        key={job.id}
                        className="bg-white p-8 rounded-[32px] border border-zinc-200 hover:border-brand-500 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-brand-500/5"
                        // onClick={() => setSelectedJob(job)}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-brand-50 transition-colors">
                                <Briefcase className="w-6 h-6 text-zinc-400 group-hover:text-brand-600" />
                            </div>
                            <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-full uppercase tracking-widest">
                        {job.salary_up_to}
                      </span>
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 mb-2">{job.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {job.department}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                            <span className="font-bold text-sm">Apply Now</span>
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"  />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}