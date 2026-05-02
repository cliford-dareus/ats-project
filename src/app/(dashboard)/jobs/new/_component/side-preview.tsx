import {ScrollArea} from "@/components/ui/scroll-area";
import StepOneCollapse from "@/app/(dashboard)/jobs/new/_component/step-one-collapse";
import StepTwoCollapse from "@/app/(dashboard)/jobs/new/_component/step-two-collapse";
import StepThreeCollapse from "@/app/(dashboard)/jobs/new/_component/step-three-collapse";

const SidePreview = () => {
    return(
        <ScrollArea className="flex-1">
            <StepOneCollapse/>
            <StepTwoCollapse/>
            <StepThreeCollapse />
        </ScrollArea>
    )
};

export default SidePreview;