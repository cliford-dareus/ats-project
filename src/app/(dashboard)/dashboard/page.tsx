import React from 'react';
import {auth} from "@clerk/nextjs/server";

type Props = {}

const Page = async (props: Props) => {
    const {userId, redirectToSignIn} = await auth();
    return (
        <div className="">ff</div>
    )
};

export default Page;