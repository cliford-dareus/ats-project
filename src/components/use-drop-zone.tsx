"use client";

import {useRef} from "react";
import {UploadCloud} from "lucide-react";
import {useDropzone} from "react-dropzone";

type Props = {
    onDrop: (state: boolean) => void;
    required?: boolean;
    name?: string;
}

const Dropzone = ({onDrop, required, name}: Props) => {
    const hiddenInputRef = useRef<HTMLInputElement | null>(null);

    const {getRootProps, getInputProps} = useDropzone({
        onDrop: (incomingFiles) => {
            if (hiddenInputRef.current) {
                const dataTransfer = new DataTransfer();
                incomingFiles.forEach((v) => {
                    dataTransfer.items.add(v);
                });
                hiddenInputRef.current.files = dataTransfer.files;
                onDrop(true);
            }
        },
    });

    return (
        <div className="container">
            <div {...getRootProps({className: 'p-4 h-[200px] flex flex-col items-center justify-center border border-dashed rounded'})}>
                <input
                    type="file"
                    name={name}
                    required={required}
                    style={{opacity: 0, width: "100px"}}
                    ref={hiddenInputRef}
                />
                <input className="w-[100px]" {...getInputProps()}/>
                <UploadCloud size={70} className="text-slate-500"/>
                <p className="mt-auto uppercase text-slate-500 text-sm">Drop file here</p>
            </div>
        </div>
    );
};

export default Dropzone;