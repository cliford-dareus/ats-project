ALTER TABLE `stages` MODIFY COLUMN `stage_name` enum('Applied','New Candidate','Screening','Phone Interview','Interview','Offer','Drafted');--> statement-breakpoint
ALTER TABLE `triggers` MODIFY COLUMN `config` json NOT NULL DEFAULT ('{"template":"","options":[],"delay":1,"delayFormat":"minutes"}');--> statement-breakpoint
ALTER TABLE `applications` ADD `position_in_stage` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `stage_position_idx` ON `applications` (`current_stage_id`,`position_in_stage`);--> statement-breakpoint
CREATE INDEX `job_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `candidate_idx` ON `applications` (`candidate`);--> statement-breakpoint
CREATE INDEX `job_stage_unique` ON `stages` (`job_id`,`stage_name`);--> statement-breakpoint
CREATE INDEX `job_idx` ON `stages` (`job_id`);