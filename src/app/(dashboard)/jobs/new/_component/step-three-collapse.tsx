'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from "lucide-react";
import { useNewJobContext } from "@/providers/new-job-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const StepThreeCollapse = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { newJobData } = useNewJobContext();

    return (
        <Card className="border-primary/20 bg-primary/5 mt-4">
            <CardHeader className="pb-3">
                <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                >
                    <div className="flex items-center gap-2">
                        <Code size={18} className="text-primary" />
                        <span className="font-medium text-primary">Technical Requirements</span>
                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                            {newJobData.jobStages.length} requirements
                        </Badge>
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-primary" /> : <ChevronDown size={18} className="text-primary" />}
                </Button>
            </CardHeader>

            {isOpen && (
                <CardContent className="pt-0">
                    {newJobData.jobStages.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {newJobData.jobStages.map((stage, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white border border-primary/20 rounded text-sm">
                                    <span className="font-medium">{stage.stage_name}</span>
                                    <span className="text-gray-600">{stage.stage_assign_to} years</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-primary text-sm">No stage added yet</p>
                    )}
                </CardContent>
            )}
        </Card>
    );
};

export default StepThreeCollapse;
