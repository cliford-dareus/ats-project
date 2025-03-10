import mongoose from 'mongoose';

const TriggerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    stages: { type: String, required: true},
    type: { type: String, required: true},
    application_id: { type: Number, required: true},
    triggerTime: { type: Date, required: true },
    status: { type: String, default: 'pending' }, // 'pending', 'executed', 'canceled'
});

const Trigger = mongoose.models.Trigger || mongoose.model('Trigger', TriggerSchema);
export default Trigger;