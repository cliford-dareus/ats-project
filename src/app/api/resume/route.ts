import pdfParse from "pdf-parse";
import {NextResponse} from "next/server";
import {GoogleGenerativeAI} from "@google/generative-ai";
import {uploadResumeToSupabase} from "@/lib/upload-resume-to-supabase";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
        const formData = await req.formData();
        const file = formData.get("my-file") as File;

        if(!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        }

        const bufferArray = file.arrayBuffer();
        const buffer = Buffer.from(await bufferArray);
        const parsed = await pdfParse(buffer);
        const extractedText = parsed.text;

        const prompt = `Extract the following details in JSON from this resume:
                          - Name
                          - Contact Information
                          - Skills
                          - Work Experience: 
                            [{date, location, title, description}]
                          - Education
                            [{date, location, title, description}]
                          
                          Resume Text: ${extractedText}`;

        const response = await model.generateContent(prompt);
        const result = response.response.text();

        // Upload resume to Supabase
        // const resumeUrlPath = await uploadResumeToSupabase(file);
        return NextResponse.json({result, resumeUrlPath: "https://hlufgcokypqpzoryrjgb.supabase.co/storage/v1/object/public/resume-bucket//ATS%20classic%20HR%20resume.pdf"});
    } catch (e) {
        return NextResponse.json({error: e}, {status: 500});
    }
}



