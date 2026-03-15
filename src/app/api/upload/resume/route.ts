// import pdfParse from "pdf-parse";
import {NextResponse} from "next/server";
import {GoogleGenAI, Type} from "@google/genai";
import {uploadFileToSupabase} from "@/lib/upload-file-to-supabase";

const genAI = new GoogleGenAI({apiKey: process.env.GOOGLE_GEMINI_API_KEY!});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("my-file") as File;

        if (!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        };

        // const bufferArray = file.arrayBuffer();
        // const buffer = Buffer.from(await bufferArray);
        // const parsed = await pdfParse(buffer);
        // const extractedText = parsed.text

        console.log("HERE")
        const base64Data = await fileToBase64(file);

        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data
                    }
                },
                {
                    text: "Extract information from this resume. Return the data in JSON format with the following structure: { name: string, email: string, role: string, resumeSummary: string, skills: string[], experience: { company: string, role: string, period: string, description: string }[], education: string[] }. If a field is not found, leave it empty or null."
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: {type: Type.STRING},
                        email: {type: Type.STRING},
                        role: {type: Type.STRING},
                        resumeSummary: {type: Type.STRING},
                        skills: {type: Type.ARRAY, items: {type: Type.STRING}},
                        experience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    company: {type: Type.STRING},
                                    role: {type: Type.STRING},
                                    period: {type: Type.STRING},
                                    description: {type: Type.STRING}
                                }
                            }
                        },
                        education: {type: Type.ARRAY, items: {type: Type.STRING}}
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "{}");
        // Upload resume to Supabase
        // const resumeUrlPath = await uploadFileToSupabase(file);
        return NextResponse.json({data});
    } catch (e) {
        return NextResponse.json({error: e}, {status: 500});
    }
};

export const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
};