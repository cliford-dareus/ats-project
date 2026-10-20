ALTER TABLE `interviews` MODIFY COLUMN `status` enum('SCHEDULE','AWAITING_FEEDBACK','COMPLETE','HOLD_PENDING','CANCELLED') DEFAULT 'SCHEDULE';--> statement-breakpoint
ALTER TABLE `interviews` ADD `hold_email_sent_at` timestamp;--> statement-breakpoint
CREATE INDEX `interviews_hold_expiry_idx` ON `interviews` (`hold_status`,`hold_expires_at`);--> statement-breakpoint
CREATE INDEX `interviews_application_idx` ON `interviews` (`applications_id`);