'use server';

import mongodb from "@/lib/mongodb";
import EmailTemplate from '@/models/email-templates';
import { SYSTEM_TEMPLATES } from "@/lib/constant";
import { auth } from "@clerk/nextjs/server";

/**
 * Seed the default system templates for an org, idempotently.
 * Upserts keyed on (organizationId, templateId), so concurrent calls and
 * repeat runs never duplicate a template. Only missing keys are inserted.
 */
export async function ensure_default_templates(orgId: string) {
    await mongodb();

    for (const tpl of SYSTEM_TEMPLATES) {
        await EmailTemplate.updateOne(
            { organizationId: orgId, templateId: tpl.templateId },
            {
                $setOnInsert: {
                    organizationId: orgId,
                    templateId: tpl.templateId,
                    name: tpl.name,
                    subject: tpl.subject,
                    body: tpl.body,
                    isDefault: true,
                    isSystem: true,
                },
            },
            { upsert: true },
        );
    }
}

export async function getEmailTemplates() {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) return JSON.stringify([]);

    let templates = await EmailTemplate.find({
        organizationId: orgId,
    }).sort({ createdAt: -1 });

    // Lazy seed: an org with no templates gets the system defaults on first read.
    if (templates.length === 0) {
        await ensure_default_templates(orgId);
        templates = await EmailTemplate.find({
            organizationId: orgId,
        }).sort({ createdAt: -1 });
    }

    return JSON.stringify(templates);
};

export async function getEmailTemplateByTemplateId(templateId: string) {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) return JSON.stringify([]);

    const template = await EmailTemplate.findOne({
        templateId: templateId,
        organizationId: orgId,
    });

    if (!template) return null;

    return JSON.stringify(template);
};

export async function getEmailTemplateById(templateId: string) {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) return JSON.stringify([]);

    const template = await EmailTemplate.findOne({
        _id: templateId,
        organizationId: orgId,
    });

    if (!template) return null;

    return JSON.stringify(template);
};

/**
 * Fetch one of the org's templates by key (e.g. "interview_invite").
 * Intended for future use by interview emails — returns null when the org
 * has no template with that key. Session org only.
 */
export async function get_org_template(orgId: string, key: string) {
    await mongodb();

    const template = await EmailTemplate.findOne({
        organizationId: orgId,
        templateId: key,
    }).lean();

    if (!template) return null;

    return JSON.parse(JSON.stringify(template));
}

export async function saveEmailTemplate(data: {
    id?: string;
    name: string;
    subject: string;
    body: string;
    templateId?: string;
}) {
    await mongodb();

    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    if (data.id) {
        // Update — scoped to the session org so one org cannot overwrite another's template.
        await EmailTemplate.updateOne(
            { _id: data.id, organizationId: orgId },
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
            // organizationName: subdomain,
            name: data.name,
            subject: data.subject,
            body: data.body,
            templateId: data.templateId,
        });
    }
    return JSON.stringify({ success: true });
}

export async function deleteEmailTemplate(id: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await EmailTemplate.deleteOne({
        _id: id,
        organizationId: orgId,
    });

    return JSON.stringify({ success: true });
}
