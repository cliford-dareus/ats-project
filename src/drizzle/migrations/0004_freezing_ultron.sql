ALTER TABLE `candidate` MODIFY COLUMN `status` enum('ACTIVE','REJECTED','HIRED') DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE `job_listing` MODIFY COLUMN `type` enum('FULL_TIME','PART_TIME','REMOTE','INTERNSHIP','CONTRACT') DEFAULT 'FULL_TIME';--> statement-breakpoint
ALTER TABLE `applications` ADD `organization` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `organization` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `organization` varchar(255) NOT NULL;