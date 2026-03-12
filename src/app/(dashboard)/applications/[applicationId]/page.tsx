import React from 'react';
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    AlertCircle, Briefcase,
    Calendar,
    Download, ExternalLink,
    FileText, History, Mail, MapPin,
    MessageSquare, Sparkles,
    Star, TrendingUp, Video,

} from "lucide-react";
import {Button} from "@/components/ui/button";
import {get_application_by_id_action} from "@/server/actions/application_actions";
import {ApplicationResponseType} from "@/types";
import {get_application_notes} from "@/server/queries/mongo/note";
import InternalNoteSection from "@/components/internal-note-section";

type Props = {
    params: {
        applicationId: string
    }
};

const Page = async ({params}: Props) => {
    const {applicationId} = await params;

    const response = await get_application_by_id_action(Number(applicationId));
    const applicationResult = (response as unknown as ApplicationResponseType[])[0];

    const internalNotes = await get_application_notes({
        id: applicationResult.id,
        limit:10,
        offset: 0
    });


    // Handle error cases
    // if (!applicationResult) {
    //     return (
    //         <div className="p-4">
    //             <div className="text-center py-8">
    //                 <h2 className="text-xl font-semibold text-gray-900">Application not found</h2>
    //                 <p className="text-gray-500 mt-2">The application or candidate you're looking for doesn't exist.</p>
    //                 <Link href="/applications">
    //                     <Button className="mt-4">
    //                         <ArrowLeft size={16} className="mr-2" />
    //                         Back to Applications
    //                     </Button>
    //                 </Link>
    //             </div>
    //         </div>
    //     );
    // };

    return (
        <div className="p-4">
            <div className="flex-1">
                <div className="mt-4">
                    <div className="">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src="https://github.com/shadcn.png"/>
                                        <AvatarFallback>CN</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900">{applicationResult.candidate_name}</h2>
                                        <p className="text-sm text-zinc-500 font-medium">
                                            Applying for <span
                                            className="text-blue-600 font-bold uppercase">{applicationResult.job_apply}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4"/>
                                    Message
                                </button>
                                <Button
                                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-brand-500/20">
                                    Advance Stage
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-2">
                            {/* Left Column: Candidate & Job Info */}
                            <div className="col-span-2 space-y-4">
                                {/* Experience Comparison Card */}
                                <div
                                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                                >
                                    <div
                                        className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-blue-600"/>
                                            <h3 className="font-bold text-zinc-900">Experience Match Analysis</h3>
                                        </div>
                                        <div
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-blue-700 rounded-full border border-blue-100">
                                            <Sparkles className="w-3.5 h-3.5"/>
                                            <span
                                                className="text-xs font-bold">90% Match</span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            {/*{experience?.skills.map((skill, index) => (*/}
                                            {/*    <div key={index}*/}
                                            {/*         className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">*/}
                                            {/*        <div>*/}
                                            {/*            <p className="text-sm font-bold text-zinc-900">{skill.name}</p>*/}
                                            {/*            <p className="text-xs text-zinc-500">{skill.year} years*/}
                                            {/*                exp.</p>*/}
                                            {/*        </div>*/}
                                            {/*        <div className="flex items-center gap-2">*/}
                                            {/*                <span*/}
                                            {/*                    className="text-xs font-medium text-zinc-400">Req:{skill.required}</span>*/}
                                            {/*            {skill.match ? (*/}
                                            {/*                <CheckCircle2 className="w-5 h-5 text-emerald-500"/>*/}
                                            {/*            ) : (*/}
                                            {/*                <AlertCircle className="w-5 h-5 text-amber-500"/>*/}
                                            {/*            )}*/}
                                            {/*        </div>*/}
                                            {/*    </div>*/}
                                            {/*))}*/}
                                        </div>
                                    </div>
                                </div>

                                {/* Resume Preview / Summary */}
                                <div
                                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                                >
                                    <div
                                        className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-zinc-400"/>
                                            <h3 className="font-bold text-zinc-900">Resume Summary</h3>
                                        </div>
                                        <button
                                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                            <Download className="w-3.5 h-3.5"/>
                                            Download PDF
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <div
                                            className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                                            <p>
                                                Experienced software engineer with a strong background in
                                                building scalable web applications.
                                                Expertise in React, Node.js, and cloud infrastructure. Proven
                                                track record of leading technical teams
                                                and delivering complex projects on time.
                                            </p>
                                            <h4 className="text-zinc-900 font-bold mt-4 mb-2">Key
                                                Accomplishments:</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>Reduced application load time by 40% through code
                                                    optimization.
                                                </li>
                                                <li>Implemented automated testing suite increasing coverage to
                                                    85%.
                                                </li>
                                                <li>Led a team of 5 developers in a complete system migration.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Experience</h4>
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex-shrink-0" />
                                            <div>
                                                <p className="font-bold text-zinc-900">Senior Software Engineer</p>
                                                <p className="text-sm text-zinc-500">TechCorp Inc. • 2021 - Present</p>
                                                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                                                    Leading the frontend team in developing high-performance React applications.
                                                    Implemented micro-frontend architecture reducing build times by 40%.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Sidebar Info */}
                            <div className="space-y-4">
                                {/* Application Details */}
                                <div
                                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-4"
                                >
                                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-zinc-400"/>
                                        Application Details
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                <Calendar className="w-4 h-4 text-zinc-500"/>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Applied
                                                    On</p>
                                                <p className="text-sm font-semibold text-zinc-900">{new Date(applicationResult?.apply_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                <Star className="w-4 h-4 text-zinc-500"/>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Internal
                                                    Rating</p>
                                                <div className="flex items-center gap-1">
                                                    <p className="text-sm font-semibold text-zinc-900">4.5</p>
                                                    <Star className="w-3 h-3 text-amber-500 fill-current"/>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                                <History className="w-4 h-4 text-zinc-500"/>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Current
                                                    Stage</p>
                                                <span
                                                    className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-100 uppercase tracking-wider">
                                                    {applicationResult.current_stage}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-100">
                                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3">Contact
                                            Info</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                <Mail className="w-4 h-4 text-zinc-400"/>
                                                {applicationResult.candidate_email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                <ExternalLink className="w-4 h-4 text-zinc-400"/>
                                                LinkedIn Profile
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Interview Status */}
                                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-zinc-400"/>
                                            Interview Status
                                        </h3>
                                        {!applicationResult.interview ? (
                                            <span
                                                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider">
                  Booked
                </span>
                                        ) : (
                                            <span
                                                className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-full border border-zinc-200 uppercase tracking-wider">
                  Not Booked
                </span>
                                        )}
                                    </div>

                                    {applicationResult.interview ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                        <Calendar className="w-4 h-4 text-brand-600"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Date
                                                            & Time</p>
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            {/*{applicationResult.interview.date} at {applicationResult.interview.time}*/}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                        {applicationResult.location === 'Video' ? (
                                                            <Video className="w-4 h-4 text-brand-600"/>
                                                        ) : (
                                                            <MapPin className="w-4 h-4 text-brand-600"/>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Type
                                                            & Location</p>
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            onsite {applicationResult.interview.link ? 'via Link' : `at ${applicationResult.interview.locations}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {applicationResult.interview.link && (
                                                <a
                                                    href={applicationResult.interview.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-2.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-bold hover:bg-brand-100 transition-all flex items-center justify-center gap-2 border border-brand-100"
                                                >
                                                    <Video className="w-4 h-4"/>
                                                    Join Interview
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className="text-center py-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                            <p className="text-xs text-zinc-400 mb-3">No interview has been scheduled
                                                yet.</p>
                                            <button
                                                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm">
                                                Schedule Interview
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Job Details Quick View */}
                                <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-brand-400"/>
                                        <h3 className="font-bold text-sm uppercase tracking-wider">Job
                                            Overview</h3>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold leading-tight">{applicationResult.job_apply}</p>
                                        <p className="text-zinc-400 text-sm">{applicationResult.department}</p>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">Location</span>
                                            <span
                                                className="font-medium">{applicationResult.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">Type</span>
                                            <span className="font-medium">Full-Time</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Internal Notes Quick View */}
                                <InternalNoteSection data={JSON.parse(internalNotes)} parent_type='application' parent_id={applicationResult.id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page;
