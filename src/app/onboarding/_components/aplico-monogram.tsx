import { cn } from '@/lib/utils';

const AplikoMonogram: React.FC<{ className?: string }> = ({ className }) => (
    <div
        className={cn(
            'rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/15 flex items-center justify-center shadow-inner',
            className
        )}
    >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
            <path d="M5 4H19L14.5 9.5H5V4Z" fill="currentColor" />
            <path d="M5 11.5H13.5L9 17H5V11.5Z" fill="#14B8A6" />
            <path d="M5 17H9V20L5 17Z" fill="currentColor" fillOpacity="0.85" />
        </svg>
    </div>
);

export default AplikoMonogram;