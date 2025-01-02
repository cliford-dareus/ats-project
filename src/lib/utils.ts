import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
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
      if(Array.isArray(jobTech_)){
        return jobTech_.length >= 3;
      }
      return Object.keys(jobTech_).every(s => jobTech_[s] !== '')
    };

  }
};