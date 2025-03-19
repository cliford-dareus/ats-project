import {
  ChevronDown,
  LogOut,
  LucideLayoutDashboard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button, ButtonProps } from "./ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User, auth } from "@clerk/nextjs/server";

interface Props
  extends React.ComponentPropsWithRef<typeof DropdownMenuTrigger>,
    ButtonProps {
  user: User | null;
  orgId?: string;
}

const AuthDropdown = async({ user, orgId, className, ...props }: Props) => {
  if (!user) {
    return (
      <Button size="sm" className={cn(className)} {...props} asChild>
        <Link href="/signin">
          Sign In
          <span className="sr-only">Sign In</span>
        </Link>
      </Button>
    );
  };
  
  const org = orgId ? orgId : (await auth()).orgId;

  const initials = `${user.firstName?.charAt(0) ?? ""} ${user.lastName?.charAt(0) ?? ""}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5">
        <Avatar className="w-8 h-8">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex items-center text-slate-500">
          <p className="text-sm ">
            {user?.firstName} {user?.lastName?.charAt(0) ?? ""}.
          </p>
          <ChevronDown size={20} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Link href={org ? `/dashboard` : "/onboarding"}>
            <LucideLayoutDashboard />
            <span>Dashboard</span>
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOut />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthDropdown;
