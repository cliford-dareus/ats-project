CREATE TABLE `checkr_background_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`environment` enum('test','live') NOT NULL DEFAULT 'test',
	`package_slug` varchar(128) NOT NULL,
	`checkr_candidate_id` varchar(128),
	`checkr_invitation_id` varchar(128),
	`checkr_report_id` varchar(128),
	`invitation_status` enum('pending','completed','expired','canceled'),
	`report_status` enum('pending','complete','suspended','dispute','canceled'),
	`report_result` enum('clear','consider'),
	`adjudication` enum('engaged','pre_adverse_action','post_adverse_action'),
	`invitation_url` varchar(500),
	`invitation_expires_at` timestamp,
	`report_completed_at` timestamp,
	`consent_confirmed_by` varchar(255),
	`consent_confirmed_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkr_background_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `checkr_application_unique` UNIQUE(`application_id`)
);
--> statement-breakpoint
ALTER TABLE `checkr_background_checks` ADD CONSTRAINT `checkr_background_checks_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `checkr_org_idx` ON `checkr_background_checks` (`organization`);