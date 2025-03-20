ALTER TABLE `organization` MODIFY COLUMN `locations` varchar(255) NOT NULL DEFAULT 'New-York';--> statement-breakpoint
ALTER TABLE `organization` MODIFY COLUMN `phone` varchar(255) NOT NULL DEFAULT '305-555-0100';--> statement-breakpoint
ALTER TABLE `organization` MODIFY COLUMN `email` varchar(255) NOT NULL DEFAULT 'company@example.com';--> statement-breakpoint
ALTER TABLE `organization` MODIFY COLUMN `color` varchar(255) NOT NULL DEFAULT 'purple';