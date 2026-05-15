import React, { useEffect } from 'react';
import { Building2, ChevronRight, Puzzle, SettingsIcon } from 'lucide-react';
import { motion, } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const settingsData = [
    {
        title: "Plugins",
        url: "/",
        icon: Puzzle,
    },
    {
        title: "Organization Profile",
        url: "/organization",
        icon: Building2
    },
    {
        title: "General Settings",
        url: "/general-settings",
        icon: SettingsIcon
    }
]

const SettingsSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [active, setActive] = React.useState<string | null>(null);

    useEffect(() => {
        if (pathname) {
            const normalizedPathname = pathname.replace(/^\/settings\//, '/');
            console.log(normalizedPathname)
            const setting = settingsData.find((s) => s.url === normalizedPathname);
            if (setting) {
                setActive(setting.title);
            }

            if (pathname == "/settings") {
                setActive(settingsData[0].title)
            }
        }
    }, [pathname, active,]);

    return (
        <>
            <div className="space-y-0.5 p-4">
                <div className="w-full flex flex-col">
                    {settingsData.map((setting) => (
                        <motion.button
                            key={setting.title}
                            // initial={{ opacity: 0, height: 0 }}
                            // animate={{ opacity: 1, height: 'auto' }}
                            // exit={{ opacity: 0, height: 0 }}
                            onClick={() => router.push(`/settings/${setting.url}`)}
                            className={cn("w-full flex items-center justify-between px-2 py-4 rounded-xl text-[14px] transition-all duration-200 group ",
                                active === setting.title ? "bg-primary text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-primary/10 hover:text-slate-900")}
                        >
                            <div className="flex items-center gap-2.5">
                                <setting.icon size={14} />
                                <span className="truncate max-w-[150px]">{setting.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChevronRight
                                    size={12}
                                    className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-300"
                                />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div >
        </>

    );
};

export default SettingsSidebar;
