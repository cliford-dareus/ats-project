CREATE TABLE `report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization` varchar(255) NOT NULL,
	`report_type` varchar(100) NOT NULL,
	`date_from` timestamp NOT NULL,
	`date_to` timestamp NOT NULL,
	`metrics` text,
	`generated_by` varchar(255) NOT NULL,
	`generated_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `report_history` ADD CONSTRAINT `report_history_organization_organization_clerk_id_fk` FOREIGN KEY (`organization`) REFERENCES `organization`(`clerk_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `report_history_org_created_idx` ON `report_history` (`organization`,`created_at`);