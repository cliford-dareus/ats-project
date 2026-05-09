'use server';

import mongodb from "@/lib/mongodb";
import EmailTemplate from '@/models/email-templates';
import { auth } from "@clerk/nextjs/server";

export async function getEmailTemplates() {
    await mongodb();

    const {orgId} = await auth();
    if (!orgId) return JSON.stringify([]);

    const templates = await EmailTemplate.find({
        organizationId: orgId,
    }).sort({ createdAt: -1 });

    return JSON.stringify(templates);
};

export async function getEmailTemplateById(templateId: string) {
    await mongodb();

    const template = await EmailTemplate.findOne({
        templateId: templateId,
    });
    
    if (!template) return null;

    return JSON.stringify(template);
};

export async function saveEmailTemplate(data: {
    id?: string;
    name: string;
    subject: string;
    body: string;
    templateId?: string;
}) {
    await mongodb();

    const {orgId} = await auth();
    if (!orgId) throw new Error("Unauthorized");

    if (data.id) {
        // Update
        await EmailTemplate.updateOne(
            { _id: data.id },
            {
                name: data.name,
                subject: data.subject,
                body: data.body,
                updatedAt: new Date(),
            }
        );
    } else {
        // Create
        await EmailTemplate.create({
            organizationId: orgId,
            name: data.name,
            subject: data.subject,
            body: data.body,
            templateId: data.templateId,
        });
    }
    return JSON.stringify({ success: true });
}

export async function deleteEmailTemplate(id: string) {
    const {orgId} = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await EmailTemplate.deleteOne({
        _id: id,
        organizationId: orgId,
    });

    return JSON.stringify({ success: true });
}
