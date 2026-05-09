import mongoose from 'mongoose';

interface EmailTemplateInterface extends mongoose.Document {
    templateId: string;
    name: string;
    subject: string;
    body: string;
    isDefault: boolean;
    isSystem: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
};

const EmailTemplateSchema = new mongoose.Schema<EmailTemplateInterface>({
    templateId: { type: String, required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    organizationId: { type: String, required: true },
}, { timestamps: true });

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', EmailTemplateSchema);
export default EmailTemplate;
