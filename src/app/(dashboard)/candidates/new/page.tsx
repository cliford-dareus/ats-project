"use client";

import React, {useState} from 'react';
// import {parseResume} from "@/lib/utils";
import {useDropzone} from "react-dropzone";

const Page = () => {

    const {getRootProps, getInputProps} = useDropzone({
        accept: {'application/pdf': ['.pdf']},
        onDrop: async files => {
            const reader = new FileReader();
            reader.onload = async () => {
                const result = await fetch('/api/resume', {
                    method: 'POST',
                    body: JSON.stringify({file: (reader.result as string).split(',')[1]})
                });

                console.log(await result.json())
                // onParse(await result.json());
            };
            reader.readAsDataURL(files[0]);
        }
    });


    return (
        <div className="p-4 border bg-muted rounded" {...getRootProps()}>
            <input {...getInputProps()} />
            <p>Drop PDF resume here</p>
        </div>
    );
};

export default Page;