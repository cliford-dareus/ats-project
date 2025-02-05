"use client";

import React, {useState} from 'react';

const Page = () => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files === null) return
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return alert("Please select a file.");

        const formData = new FormData();
        formData.append("resume", file);

        try {
            const response = await fetch("/api/resume", {
                method: "POST",
                // headers,
                body: formData,
            });

            if (!response.ok) throw new Error("Error uploading file");

            const data = await response.json();
            setParsedData(data.parsedData);
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <div>
            <h2>Upload Your Resume</h2>
            <input type="file" onChange={() =>handleFileChange}/>
            <button onClick={handleUpload}>Upload and Parse</button>

            {parsedData && (
                <div>
                    <h3>Parsed Resume Data:</h3>
                    <pre>{JSON.stringify(parsedData, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default Page;