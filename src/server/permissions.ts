import { auth } from "@clerk/nextjs/server";

export const canCreateJob = async (userId: string | null) => {
    // check if user id is valid
    if (userId == null) return false
    const {orgRole} = await auth();
    // check user role in clerk
    // return bool if user does or doesnt have role to add jobs
    return orgRole === "org:admin";
};

export const canEvaluateCandidate = ( ) => {};

export const canEditJob = ( ) => {};
