import { render } from '@react-email/render';
import { getTemplateById } from '@/lib/templates';
import React from 'react';
import { getEmailTemplateByTemplateId } from '@/server/queries/mongo/email-templates';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('id');
    
    let props = {};
 
    const savedProps = await getEmailTemplateByTemplateId(templateId || '');
    if (savedProps) {
        const parsedProps = JSON.parse(savedProps);
        console.log(parsedProps);
        props = parsedProps;
    }

    const template = getTemplateById(templateId || '');
    if (!template) return new Response('Not Found', { status: 404 });

    // Render template with default props for preview
    const html = await render(React.createElement(template?.component, props || template.defaultProps));

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
    });
}
