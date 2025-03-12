import React from 'react';

type Props = {
    params : {
        applicationId : string
    }
};

const Page = async ({params}: Props) => {
    const application_id = await params.applicationId;
    console.log(application_id)
    return (
        <div className="p-4">
            
        </div>
    );
};

export default Page;