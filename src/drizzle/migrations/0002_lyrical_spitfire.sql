CREATE TABLE `triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action_type` varchar(255) NOT NULL,
	`config` json NOT NULL DEFAULT ('{"template":"","options":[]}'),
	`stage_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `triggers_id` PRIMARY KEY(`id`)
);
