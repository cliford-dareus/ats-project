import { render } from '@react-email/render';
import { getTemplateById } from '@/lib/templates';
import React from 'react';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get('id');

  const template = getTemplateById(templateId || '');
  if (!template) return new Response('Not Found', { status: 404 });

  // Render template with default props for preview
  const html = await render(React.createElement(template.component, template.defaultProps));

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}