

export const canCreateJob = async (userId: string | null) => {
    // check if user id is valid
    if (userId == null) return false
    // check user role in clerk
    // return bool if user does or doesnt have role to add jobs
    return true
};

export const canEvaluateCandidate = ( ) => {};

export const canEditJob = ( ) => {};