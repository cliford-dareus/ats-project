import { auth } from "@clerk/nextjs/server";
import MarketingHeader from "./_components/header";
import Footer from "./_components/footer";

const MarketingLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { userId } = await auth();

    return (
        <div className="flex min-h-screen flex-col bg-[#faf9f6] text-[#191e24] font-sans selection:bg-emerald-200 selection:text-emerald-900">
            <MarketingHeader is_signed_in={!!userId} />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
};

export default MarketingLayout;
