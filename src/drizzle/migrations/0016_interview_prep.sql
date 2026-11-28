CREATE TABLE `interview_prep` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`stage_name` varchar(64),
	`model` varchar(255) NOT NULL,
	`questions` json NOT NULL,
	`insights` json NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_prep_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `interview_prep` ADD CONSTRAINT `interview_prep_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `interview_prep_application_idx` ON `interview_prep` (`application_id`);--> statement-breakpoint
CREATE INDEX `interview_prep_org_idx` ON `interview_prep` (`organization`);