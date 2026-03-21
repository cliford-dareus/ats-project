import {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Avatar} from "@/components/ui/avatar";
import {UpcomingInterview} from "@/app/(dashboard)/dashboard/_components/dashboard";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import {subDays, addDays} from "date-fns";
import {Separator} from "@/components/ui/separator";

const StripCalendar: React.FC<{ interviews: UpcomingInterview[] }> = ({interviews}) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Generate 14 days starting from today
    const days = Array.from({length: 14}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const selectedInterviews = interviews.filter(int => isSameDay(int.time, selectedDate));

    return (
        <div className="">
            <div className="flex w-full justify-between items-center gap-2">
                <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                    <ChevronLeft size={20}/>
                </button>
                <span>{days[0].toLocaleDateString()}-{days[days.length - 1].toLocaleDateString()}</span>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                    <ChevronRight size={20}/>
                </button>
            </div>
            <ScrollArea className="w-full">
                <div className="flex gap-2 overflow-x-auto pb-4 pt-2 -mx-4 px-4">
                    {days.map((date, i) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const hasInterviews = interviews.some(int => isSameDay(int.time, date));

                        return (
                            <motion.button
                                key={i}
                                whileHover={{y: -4}}
                                whileTap={{scale: 0.95}}
                                onClick={() => setSelectedDate(date)}
                                className={`flex-shrink-0 py-2  px-1 rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2 ${
                                    isSelected
                                        ? 'bg-black  text-white border shadow-xl shadow-blue-200'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                }`}
                            >
              <span
                  className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {date.toLocaleDateString('en-US', {weekday: 'short'})}
              </span>
                                <span className="font-black tracking-tighter">
                {date.getDate()}
              </span>
                                {hasInterviews && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
                {/*<ScrollBar orientation="horizontal"/>*/}
            </ScrollArea>

            <Separator/>

            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedDate.toISOString()}
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4"
                >
                    {selectedInterviews.length > 0 ? (
                        selectedInterviews.map((interview) => (
                            <div
                                key={interview.id}
                                className="col-span-full bg-white rounded-md flex gap-2"
                            >
                                <div
                                    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl shadow-inner flex-shrink-0 bg-blue-100">
                                    <span className="font-black">{new Date(interview.time).getDate()}</span>
                                    <span
                                        className="text-xs uppercase">{new Date(interview.time).toLocaleDateString('en-US', {weekday: 'short'})}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col mb-1">
                                        <h5 className="text-sm font-bold truncate uppercase">{interview.jobTitle}</h5>
                                        <p className="text-[11px]  text-zinc-500">Interview
                                            with {interview.candidateName}</p>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                                            {new Date(interview.time).getHours()} : {new Date(interview.time).getMinutes()}am
                                        </span>
                                    </div>
                                    {/*<div className="flex items-center gap-2 mt-2">*/}
                                    {/*    <div*/}
                                    {/*        className="px-2 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">*/}
                                    {/*        {interview.type}*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}
                                </div>
                            </div>
                        ))
                    ) : (
                        // <div
                        //     className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        //     <div
                        //         className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                        //         <Calendar size={32}/>
                        //     </div>
                        //     <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No interviews
                        //         scheduled</p>
                        //     <button
                        //         className="mt-4 text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                        //         Schedule Now
                        //     </button>
                        // </div>
                        <div
                            className="col-span-full text-center py-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                            <p className="text-xs text-zinc-400 mb-3">No interview has been scheduled
                                yet.</p>
                            <button
                                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm">
                                Schedule Interview
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default StripCalendar;