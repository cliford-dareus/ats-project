import { currentUser } from "@clerk/nextjs/server";
import Header from "./_components/header";

const Layout = async({ children }: { children: React.ReactNode }) => {
  // Cache the user object to avoid unnecessary re-fetches
  const user = await currentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
