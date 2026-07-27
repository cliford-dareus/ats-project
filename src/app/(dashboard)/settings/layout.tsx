import { auth } from "@clerk/nextjs/server";

type Props = {
    children: React.ReactNode
}

const SettingLayout = async ({ children }: Props) => {
    const { orgId } = await auth();
    if (!orgId) return null;

    return (
        <div className="">
            {children}
        </div>
    )
}

export default SettingLayout;
