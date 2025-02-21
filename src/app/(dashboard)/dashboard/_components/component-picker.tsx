"use client"

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

type Props = {
    section: string;
    selectedComponent: string;
    onChange: (section: string, component: string) => void;
    components: string[];
};

const ComponentPicker = ({ section, selectedComponent, onChange, components }: Props) => (
    <Select
        value={selectedComponent}
        onValueChange={(e) => onChange(section, e)}

    >
        <SelectTrigger>
            <SelectValue placeholder={`Select a ${section} component...`}/>
        </SelectTrigger>
        <SelectContent className="mt-2 border rounded p-2">
            {components.map((component) => (
                <SelectItem  key={component} value={component}>
                    {component}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

export default ComponentPicker;
