import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {UseFormReturn} from "react-hook-form";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const checkFormStatus = <U, T extends UseFormReturn<any>>(args: U, form: T, trigger: U) => {
    const object = form.getValues();

    if (args === trigger) {
        const jobTech = object.trigger;

        if (!Array.isArray(jobTech)) {
            const jobTech_ = object[trigger] as { [key: string]: string };
            console.log(object, trigger, jobTech_);
            if (Array.isArray(jobTech_)) {
                return jobTech_.length >= 3;
            }
            return Object.keys(jobTech_).every(s => jobTech_[s] !== '')
        }
        ;

    }
};

export const aggregateByKey = <T extends Record<string, any>>(
    data: T[],
    key: keyof T,
    countKey: keyof T
): { [key: string]: number }[] => {
    return data.reduce((acc, cur) => {
        if (cur[key] === null) {
            return acc; // Skip if the key is null
        }

        const existingItem = acc.find(item => item[key as string] === cur[key]);
        if (existingItem) {
            existingItem[countKey as string] += cur[countKey];
        } else {
            acc.push({[key]: cur[key], [countKey]: cur[countKey]});
        }

        return acc;
    }, [] as { [key: string]: any }[]);
}