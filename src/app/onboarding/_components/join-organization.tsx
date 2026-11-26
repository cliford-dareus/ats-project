"use client";

import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

// Joining an organization is by invitation only: an org admin invites the
// user by email (a Clerk organization invitation, sent via the
// create_organization_invite server action), and the invitee accepts from
// the email link. There is intentionally no endpoint that lets a signed-in
// user add themselves to an arbitrary org — the previous
// /api/organization/join route did exactly that and was removed.
const JoinOrganization = () => {
    const router = useRouter();

    const onBack = () => {
        router.push("/onboarding?step=organization");
    };

    const onCreateInstead = () => {
        router.push("/onboarding?step=create");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7"
        >
            <div className="space-y-2">
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                    Join an Organization
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Joining is by invitation — an admin of the organization invites you by email.
                </p>
            </div>

            <div className="p-5 bg-card border border-border rounded-2xl space-y-2">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Ask an admin to invite you</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Once they send the invitation, accept it from the email and you&apos;ll be added to their organization.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="p-3.5 bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-colors cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onCreateInstead}
                    className="flex-1 py-3.5 px-6 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                    <span>Create an Organization Instead</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};

export default JoinOrganization;
