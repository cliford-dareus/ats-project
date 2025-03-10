CREATE TABLE `plugins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`version` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`config` json NOT NULL DEFAULT ('{}'),
	CONSTRAINT `plugins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stages` MODIFY COLUMN `stage_name` enum('Applied','New Candidate','Screening','Phone Interview','Interview','Offer');--> statement-breakpoint
ALTER TABLE `organization` ADD `plugins` json DEFAULT ('{"enabled":[],"settings":{}}') NOT NULL;