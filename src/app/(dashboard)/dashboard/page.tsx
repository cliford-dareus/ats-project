import React from 'react';
import {get_candidates_stage_count_action} from "@/server/actions/candidates-actions";

// type Props = {}

const Page = async () => {
    // const {userId, redirectToSignIn} = await auth();
    const stage = await get_candidates_stage_count_action();

    return (
        <div className="md:p-4">ff</div>
    )
};

export default Page;