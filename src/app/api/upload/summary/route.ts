import pdfParse from "pdf-parse";
import {NextResponse} from "next/server";
import {GoogleGenerativeAI} from "@google/generative-ai";
import { supabase } from "@/lib/r2";

// DELETE ME

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

        const body = await req.json();
        const file = body.file;

        if(!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        };

        const { data, error } = await supabase.storage
            .from("resume-bucket")
            .download(file.split("/")[1]);

        if (error) {
            return NextResponse.json({error: error.message}, {status: 500});
        };

        const bufferArray = data.arrayBuffer();
        const buffer = Buffer.from(await bufferArray);
        const parsed = await pdfParse(buffer);
        const extractedText = parsed.text;

        const prompt = `Generate a summary of this resume: ${extractedText}`;

        const response = await model.generateContent(prompt);
        const result = response.response.text();

        return NextResponse.json({result});
    } catch (e) {
        return NextResponse.json({error: e}, {status: 500});
    }
};
