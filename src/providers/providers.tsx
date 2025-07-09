import { SidebarProvider } from "@/components/ui/sidebar";
import { TriggerProvider } from "./trigger-provider";
import { NewJobContextProvider } from "./new-job-provider";

type Props = {
  children: React.ReactNode;
};

const Provider = ({ children }: Props) => {
  return (
    <TriggerProvider>
      <NewJobContextProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "350px",
            } as React.CSSProperties
          }
        >
          {children}
        </SidebarProvider>
      </NewJobContextProvider>
    </TriggerProvider>
  );
};

export default Provider;
