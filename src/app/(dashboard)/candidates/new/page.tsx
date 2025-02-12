"use client";

import React, {useState} from 'react';
import UseDropZone from "@/components/use-drop-zone";
import {Input} from "@/components/ui/input";

type ExtractResponseType = {
    name: string,
    contact: {
        email: string,
        phone: string,
        location: string
    }
    skills: string[],
    experience: string[],
    education: string[]
}

const Page = () => {
    const [extractedText, setExtractedText] = useState<ExtractResponseType>();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true)
        const formData = new FormData(e.currentTarget);
        const result = await fetch('/api/resume', {
            method: 'POST',
            body: formData
        });
        const parsedResume = await result.json();
        setExtractedText(parsedResume.parsedResume)
        setLoading(false)
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            {/*<form onSubmit={onSubmit}>*/}
            {/*    <UseDropZone name="my-file"/>*/}
            {/*    <button type="submit">Submit</button>*/}
            {/*</form>*/}

            {/*{extractedText && (*/}
            {/*    <div>*/}
            {/*        <h2>Accepted Files:</h2>*/}
            {/*        <Input value={extractedText?.name}/>*/}
            {/*        <Input value={extractedText?.contact.email}/>*/}
            {/*        <Input value={extractedText?.contact.phone}/>*/}
            {/*        <Input value={extractedText?.contact.location}/>*/}
            {/*    </div>*/}
            {/*)}*/}


            <div className="">

            </div>
        </div>
    );
};

export default Page;