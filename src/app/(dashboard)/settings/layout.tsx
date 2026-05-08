import { auth } from "@clerk/nextjs/server";

type Props = {
    children: React.ReactNode
}

const SettingLayout = async ({ children }: Props) => {
    const { orgId } = await auth();
    if (!orgId) return null;

    return (
        <div className="">
            <div className="flex flex-col gap-1 p-4">
                <h2 className="text-2xl font-bold text-zinc-900">Admin Settings</h2>
                <p className="text-sm text-zinc-500">Manage your organization's configuration and extensions.</p>
            </div>
            {children}
        </div>
    )
}

export default SettingLayout;
