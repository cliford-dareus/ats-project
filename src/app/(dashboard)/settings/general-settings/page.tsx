import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import GeneralSettingsForm from "./_components/general-settings-form";
import CalendarConnectionCard from "@/app/(dashboard)/settings/_components/calendar-connection-card";
import { get_general_settings_action } from "@/server/actions/organization_actions";

const GeneralSettingsPage = async () => {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

  const settings = await get_general_settings_action();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "aplico.online";

  return (
    <div className="p-6 space-y-6">
      <GeneralSettingsForm initial={settings} rootDomain={rootDomain} />
      <CalendarConnectionCard />
    </div>
  );
};

export default GeneralSettingsPage;
