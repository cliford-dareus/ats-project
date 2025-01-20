import React from 'react';
import { redirect } from 'next/navigation';

const Page = () => {
    return redirect('/jobs/new/step-one');
};

export default Page;