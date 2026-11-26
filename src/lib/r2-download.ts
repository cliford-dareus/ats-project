import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { r2Client } from "@/lib/r2";

const MIME_BY_EXTENSION: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
};

/**
 * Stream a private R2 object to an already-authorized caller. The object
 * key must have been resolved from the database (org-scoped by the caller),
 * never taken from the request — R2 keys are private and there is no
 * public URL to link to.
 */
export const stream_r2_object = async (
    key: string,
    fileName: string,
    inline = false,
) => {
    let result;
    try {
        result = await r2Client.send(
            new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
            }),
        );
    } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = result.Body as unknown as {
        transformToWebStream?: () => ReadableStream;
    };
    const stream = body.transformToWebStream
        ? body.transformToWebStream()
        : (body as unknown as ReadableStream);

    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(stream as unknown as BodyInit, {
        headers: {
            "Content-Type":
                result.ContentType ?? MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName.replace(/"/g, "")}"`,
            ...(result.ContentLength
                ? { "Content-Length": String(result.ContentLength) }
                : {}),
        },
    });
};
