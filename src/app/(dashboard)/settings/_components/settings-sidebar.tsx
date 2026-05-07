import React from 'react';
import Link from "next/link";

const settingsData = [
    {
        title: "Plugins",
        url: "/"
    },
    {
        title: "Organization Profile",
        url: "/organization"
    },
    {
        title: "General Settings",
        url: "/general-settings",
    }
]

const SettingsSidebar = () => {
    return (
        <>
            {settingsData.map((setting) => (
                <Link
                    href={`/settings/${setting.url}`}
                    key={setting.title}
                    className="flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    {setting.title}
                </Link>
            ))}
        </>

    );
};

export default SettingsSidebar;