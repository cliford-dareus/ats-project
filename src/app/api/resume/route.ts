import pdfParse from "pdf-parse";
import {NextResponse} from "next/server";
import {parseResume} from "@/lib/crude-parsing";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export async function POST(req) {
    const formData = await req.formData();
    const file = formData.get("resume");

    if (!file) {
        return NextResponse.json({error: "No file uploaded"}, {status: 400});
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    //  Parse the extracted text into structured data
    const parsedData = parseResume(extractedText);
    return NextResponse.json({parsedData});
}



