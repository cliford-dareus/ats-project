CREATE TABLE `job_syndication` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`board_id` varchar(32) NOT NULL,
	`status` enum('not_syndicated','syndicated','failed','posted') NOT NULL DEFAULT 'not_syndicated',
	`external_url` varchar(500),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_syndication_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_syndication_job_board_unique` UNIQUE(`job_id`,`board_id`)
);
--> statement-breakpoint
ALTER TABLE `job_syndication` ADD CONSTRAINT `job_syndication_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;