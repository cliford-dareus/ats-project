CREATE TABLE `sterling_background_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`environment` enum('test','live') NOT NULL DEFAULT 'test',
	`package_id` varchar(128) NOT NULL,
	`package_name` varchar(255),
	`sterling_candidate_id` varchar(128),
	`sterling_screening_id` varchar(128),
	`status` varchar(64),
	`sub_status` varchar(64),
	`result` varchar(32),
	`report_url` varchar(500),
	`invite_url` varchar(500),
	`invite_method` enum('email','link') NOT NULL DEFAULT 'email',
	`submitted_at` timestamp,
	`estimated_completion_at` timestamp,
	`consent_confirmed_by` varchar(255),
	`consent_confirmed_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sterling_background_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `sterling_application_unique` UNIQUE(`application_id`)
);
--> statement-breakpoint
ALTER TABLE `sterling_background_checks` ADD CONSTRAINT `sterling_background_checks_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sterling_org_idx` ON `sterling_background_checks` (`organization`);