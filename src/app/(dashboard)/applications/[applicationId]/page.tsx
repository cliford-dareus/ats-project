import React from 'react';

type Props = {
    params : {
        applicationId : string
    }
};

const Page = async ({params}: Props) => {
    const {applicationId} = await params;

    return (
        <div className="p-4">

        </div>
    );
};

export default Page;
