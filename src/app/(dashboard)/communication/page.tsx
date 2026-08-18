import React from "react";
import CommunicationPageClient from "./_components/communication-page-client";
import { fetchCommunicationPageData } from "@/server/actions/communication-actions";

const CommunicationPage = async () => {
  const { templates, systemTemplates, logs } =
    await fetchCommunicationPageData();

  return (
    <CommunicationPageClient
      templates={templates}
      systemTemplates={systemTemplates}
      logs={logs}
    />
  );
};

export default CommunicationPage;
