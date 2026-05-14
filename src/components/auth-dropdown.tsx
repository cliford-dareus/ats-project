import {
    ChevronDown,
    LogOut,
    LucideLayoutDashboard,
} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {Button, ButtonProps} from "./ui/button";
import Link from "next/link";
import {cn} from "@/lib/utils";
import {User} from "@clerk/nextjs/server";
import {SignOutButton} from "@/components/sign_out";
import React from "react";

interface Props
    extends React.ComponentPropsWithRef<typeof DropdownMenuTrigger>,
        ButtonProps {
    user: User | null;
    orgId?: string | null;
};

const AuthDropdown = ({user, orgId, className, ...props}: Props) => {
    if (!user && !orgId) {
        return (
            <Button size="sm" className={cn(className)} {...props} asChild>
                <Link href="http://app.localhost:3000/sign-in">
                    Sign In
                    <span className="sr-only">Sign In</span>
                </Link>
            </Button>
        );
    };

    const initials = `${user?.firstName?.charAt(0) ?? ""} ${user?.lastName?.charAt(0) ?? ""}`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5">
                <Avatar className="w-8 h-8">
                    <AvatarImage src="https://github.com/shadcn.png"/>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex items-center text-slate-500">
                    <p className="text-sm ">
                        {user?.firstName} {user?.lastName?.charAt(0) ?? ""}.
                    </p>
                    <ChevronDown size={20}/>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>
                    <Link href={orgId ? `http://app.localhost:3000/dashboard` : "/onboarding"}>
                        <LucideLayoutDashboard/>
                        <span>Dashboard</span>
                        <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <LogOut/>
                    <SignOutButton/>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default AuthDropdown;
