import React, {useState} from 'react';
import {ChevronDown, ChevronUp, Code} from "lucide-react";
import {useNewJobContext} from "@/providers/new-job-provider";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";

const StepTwoCollapse = () => {
    const [isOpen, setIsOpen] = useState(true);
    const {newJobData} = useNewJobContext();

    return (
        <Card className="border-blue-200 bg-blue-50 mt-4">
            <CardHeader className="pb-3">
                <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                >
                    <div className="flex items-center gap-2">
                        <Code size={18} className="text-blue-600" />
                        <span className="font-medium text-blue-900">Technical Requirements</span>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                            {newJobData.jobTechnology.length} requirements
                        </Badge>
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-blue-600" />}
                </Button>
            </CardHeader>

            {isOpen && (
                <CardContent className="pt-0">
                    {newJobData.jobTechnology.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {newJobData.jobTechnology.map((tech, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded text-sm">
                                    <span className="font-medium">{tech.technology}</span>
                                    <span className="text-gray-600">{tech.year_of_experience} years</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-blue-700 text-sm">No requirements added yet</p>
                    )}
                </CardContent>
            )}
        </Card>
    );
};

export default StepTwoCollapse;
