ALTER TABLE `stages` DROP FOREIGN KEY `stages_assign_to_users_table_id_fk`;
--> statement-breakpoint
ALTER TABLE `applications` ADD `cover_letter` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `referral_source` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `expected_salary` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD `earliest_start_date` varchar(255);--> statement-breakpoint
ALTER TABLE `candidate` ADD `portfolio_url` varchar(255);--> statement-breakpoint
ALTER TABLE `candidate` ADD `linkedin_url` varchar(255);--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `application_job_candidate_unique` UNIQUE(`job_id`,`candidate`);--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_assign_to_users_table_id_fk` FOREIGN KEY (`assign_to`) REFERENCES `users_table`(`id`) ON DELETE set null ON UPDATE no action;