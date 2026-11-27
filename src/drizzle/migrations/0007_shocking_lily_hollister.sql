CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`actor_id` varchar(255) NOT NULL,
	`actor_name` varchar(255) NOT NULL,
	`action` varchar(64) NOT NULL,
	`entity_type` enum('job','candidate','application','interview') NOT NULL,
	`entity_id` int NOT NULL,
	`summary` varchar(512) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_organization_id_organization_clerk_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`clerk_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_log_org_created_idx` ON `activity_log` (`organization_id`,`created_at`);