import React from 'react';
import Link from "next/link";

const settingsData = [
    {
        title: "Settings",
        url: "/"
    },
    {
        title: "Create Organization",
        url: "/create-organization",
    },
    {
        title: "Organization",
        url: "/organization"
    }
]

const SidebarSettings = () => {
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

export default SidebarSettings;