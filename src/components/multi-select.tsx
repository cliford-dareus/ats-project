import React, {useEffect, useState} from 'react';
// import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {z} from "zod";
import {useForm, UseFormSetValue, UseFormGetValues} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form} from "@/components/ui/form";
// import {Button} from "@/components/ui/button";
// import {Plus} from "lucide-react";
import {cn} from "@/lib/utils";

type SchemaType = z.ZodObject<any>;

interface MultiSelectProps<T extends SchemaType> {
    schema: T;
    fieldName: string;
    className?: string;
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
    renderForm: (onSubmit: (data: z.infer<T>) => void, form: ReturnType<typeof useForm>) => React.ReactNode;
    renderSelectedItems: (items: z.infer<T>[], onRemove: (index: number) => void) => React.ReactNode;
}

// Modular Components
const Forms = <T extends SchemaType>({onSubmit, schema, children}: {
    onSubmit: (data: z.infer<T>) => void;
    schema: T;
    children: (form: ReturnType<typeof useForm<z.infer<T>>>) => React.ReactNode;
}) => {
    const forms = useForm<z.infer<T>>({
        resolver: zodResolver(schema),
    });

    return (
        <Form {...forms}>
            <form>
                {children(forms)}
            </form>
            {/*<Button onClick={() => onSubmit(forms.watch())}>Add</Button>*/}
        </Form>
    );
};

const SelectedItems = <T extends object>({items, onRemove, renderItem}: {
    items: T[];
    onRemove: (index: number) => void;
    renderItem: (item: T, index: number) => React.ReactNode;
}) => {
    return (
        items.length !== 0 &&
        (items.map((item, index) => (
            <div key={index} className="flex  items-center gap-2 border bg-muted min-h-8 p-2 rounded">
                {renderItem(item, index)}
            </div>
        )))
    )
};

// Main Component
function MultiSelect<T extends SchemaType>({
                                               schema,
                                               className,
                                               fieldName,
                                               setValue,
                                               getValues,
                                               renderForm,
                                               renderSelectedItems
                                           }: MultiSelectProps<T>) {
    const [selected, setSelected] = useState<z.infer<T>[]>([]);

    const add = (data: z.infer<T>) => {
        setSelected(prev => [...prev, data]);
        setValue(fieldName, [...selected, data]);
    };

    const remove = (index: number) => {
        const newSelected = selected.filter((_, i) => i !== index);
        setSelected(newSelected);
        setValue(fieldName, newSelected);
    };

    useEffect(() => {
        const values = getValues()[fieldName];
        if (values) {
            setSelected(values);
        }
    }, [getValues, fieldName]);

    return (
        <div className={cn(className)}>
            <SelectedItems
                items={selected}
                onRemove={remove}
                renderItem={(item, index) => renderSelectedItems([item], () => remove(index))}
            />
            <Forms onSubmit={add} schema={schema}>
                {(forms) => renderForm(add, forms)}
            </Forms>
        </div>
    );
}

export default MultiSelect;

