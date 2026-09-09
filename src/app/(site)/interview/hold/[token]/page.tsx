import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { get_hold_public_details_action } from "@/server/actions/interview-actions";
import HoldResponseClient from "./_components/hold-response-client";

export const metadata: Metadata = {
  title: "Confirm interview | Applico",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

const InterviewHoldPage = async ({ params }: Props) => {
  const { token } = await params;
  const details = await get_hold_public_details_action(token);

  if (!details) notFound();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <HoldResponseClient token={token} details={details} />
    </div>
  );
};

export default InterviewHoldPage;
