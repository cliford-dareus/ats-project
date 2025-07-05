import {supabase} from "@/lib/supabase";

export const uploadResumeToSupabase = async (file: File) => {
    const {data, error} = await supabase.storage
        .from("resume-bucket")
        .upload(file.name, file);

    if (error) {
        throw error;
    };

    return data?.fullPath;
};