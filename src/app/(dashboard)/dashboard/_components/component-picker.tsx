"use client"

type Props = {
    section: string;
    selectedComponent: string;
    onChange: (section: string, component: string) => void;
    components: string[];
};

const ComponentPicker = ({ section, selectedComponent, onChange, components }: Props) => (
    <select
        value={selectedComponent}
        onChange={(e) => onChange(section, e.target.value)}
        className="mt-2 border rounded p-2"
    >
        {components.map((component) => (
            <option key={component} value={component}>
                {component}
            </option>
        ))}
    </select>
);

export default ComponentPicker;
