import { ApplicationResponseType } from "@/types";
import { Calendar, MapPin, Video } from "lucide-react";

type Props = {
    applicationResult: ApplicationResponseType
};

const ApplicationInterviewCard = ({ applicationResult }: Props) => {
    return (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
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
                                <Calendar className="w-4 h-4 text-brand-600" />
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
                                    <Video className="w-4 h-4 text-brand-600" />
                                ) : (
                                    <MapPin className="w-4 h-4 text-brand-600" />
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
                            <Video className="w-4 h-4" />
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
    )
};

export default ApplicationInterviewCard;
