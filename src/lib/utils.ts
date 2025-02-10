import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {UseFormReturn} from "react-hook-form";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
};

export const checkFormStatus = <U, T extends UseFormReturn<any>>(args: U, form: T, trigger: U) => {
    const object = form.getValues();

    if (args === trigger) {
        const jobTech = object.trigger;

        if (!Array.isArray(jobTech)) {
            const jobTech_ = object[trigger] as { [key: string]: string };
            if (Array.isArray(jobTech_)) {
                return jobTech_.length >= 3;
            }
            return Object.keys(jobTech_).every(s => jobTech_[s] !== '')
        }
    }
};

export const aggregateByKey = <T extends Record<string, any>>(
    data: T[],
    key: keyof T,
    countKey: keyof T,
    color?: keyof T,
): { [key: string]: number }[] => {
    return data?.reduce((acc, cur) => {
        if (cur[key] === null) {
            return acc; // Skip if the key is null
        }

        const existingItem = acc.find(item => item[key as string] === cur[key]);
        if (existingItem) {
            existingItem[countKey as string] += cur[countKey];
        } else {
            acc.push({[key]: cur[key], [countKey]: cur[countKey], [color as string]: cur[color as string]});
        }

        return acc;
    }, [] as { [key: string]: any }[]);
};

export const getTimeElapsed = (date: Date) => {
    const then = new Date(date);
    const now = new Date();

    const diff = now.getTime() - then.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
};

export const createNewSearchParam = (params: Record<string, string[] | number | null> | {
    page: number;
    per_page: string
}, searchParams: URLSearchParams) => {
    const newSearchParams = new URLSearchParams(searchParams?.toString());

    for (const [key, value] of Object.entries(params)) {
        if (value === null || (Array.isArray(value) && value.length == 0)) {
            newSearchParams.delete(key);
        } else {
            newSearchParams.set(key, String(value));
        }
    }
    return newSearchParams.toString();
};

export const getCalendaAvailability = () => {
};

export function parseResume(text: string) {
    const lines = text.split('\n');
    const resume = {
        name: '',
        contact: {} as { [key: string]: string },
        skills: [] as string[],
        workExperience: [] as { [key: string]: string }[],
        education: [] as { [key: string]: string }[]
    };

    let currentSection = '';

    lines.forEach(line => {
        line = line.trim();

        // Detect section headers
        if (line.startsWith('**Name:**')) {
            resume.name = line.replace('**Name:**', '').trim();
        } else if (line.startsWith('**Contact Information:**')) {
            currentSection = 'contact';
        } else if (line.startsWith('**Skills:**')) {
            currentSection = 'skills';
        } else if (line.startsWith('**Work Experience:**')) {
            currentSection = 'work';
        } else if (line.startsWith('**Education:**')) {
            currentSection = 'education';
        }

        // Process content based on current section
        else if (currentSection === 'contact' && line.startsWith('*')) {
            const [key, ...valueParts] = line.replace('*', '').split(':');
            resume.contact[key.trim().toLowerCase()] = valueParts.join(':').trim();
        } else if (currentSection === 'skills' && line) {
            resume.skills = line.split(';').map(skill => skill.trim());
        } else if (currentSection === 'work' && line.startsWith('*')) {
            const entry = line.replace('*', '').trim();
            const [datesPart, ...rest] = entry.split(':');
            const [titleCompany, ...descriptionParts] = rest.join(':').split('.');
            const [title, ...companyParts] = titleCompany.split(',');

            resume.workExperience.push({
                dates: datesPart.trim(),
                title: title.trim(),
                company: companyParts.join(',').trim(),
                description: descriptionParts.join('.').trim()
            });
        } else if (currentSection === 'education' && line.startsWith('*')) {
            const entry = line.replace('*', '').trim();
            const [datesPart, ...rest] = entry.split(':');
            const [degree, institution] = rest.join(':').split(',').map(s => s.trim());

            resume.education.push({
                dates: datesPart.trim(),
                degree: degree.trim(),
                institution: institution.trim()
            });
        }
    });

    return resume;
}





