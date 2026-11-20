import EcosystemMatrixStage from "./eco-system-matrix-stage";
import LiveBrowserStage from "./live-browser-stage";
import { InvitedMember, OnboardingStep } from "./onboarding";
import WorkspaceDockStage from "./worksspace-dock-stage";

const LiveStudioPreview: React.FC<{
    step: OnboardingStep;
    orgName: string;
    orgDomain: string;
    departments: string[];
    invitedMembers: InvitedMember[];
    onQuickStart: () => void;
}> = ({ step, orgName, orgDomain, departments, invitedMembers, onQuickStart }) => {
    if (step === 'intro') {
        return <EcosystemMatrixStage onQuickStart={onQuickStart} />;
    }

    if (step === 'success') {
        return (
            <WorkspaceDockStage
                orgName={orgName || 'Your Workspace'}
                orgDomain={orgDomain || 'workspace.apliko.app'}
                departments={departments}
            />
        );
    }

    return (
        <LiveBrowserStage
            step={step}
            orgName={orgName}
            orgDomain={orgDomain}
            departments={departments}
            invitedMembers={invitedMembers}
        />
    );
};

export default LiveStudioPreview;
