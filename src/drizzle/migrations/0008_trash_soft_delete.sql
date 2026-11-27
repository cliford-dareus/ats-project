ALTER TABLE `applications` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `candidate` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `job_listing` ADD `deleted_at` timestamp;