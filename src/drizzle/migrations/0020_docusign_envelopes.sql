CREATE TABLE `docusign_envelopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`environment` enum('demo','production') NOT NULL DEFAULT 'demo',
	`template_id` varchar(128) NOT NULL,
	`template_role_name` varchar(128) NOT NULL DEFAULT 'Candidate',
	`envelope_id` varchar(128),
	`envelope_status` varchar(32),
	`recipient_status` varchar(32),
	`recipient_name` varchar(255),
	`recipient_email` varchar(255),
	`email_subject` varchar(500),
	`sent_by` varchar(255),
	`sent_at` timestamp,
	`completed_at` timestamp,
	`declined_at` timestamp,
	`voided_reason` varchar(200),
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `docusign_envelopes_id` PRIMARY KEY(`id`),
	CONSTRAINT `docusign_application_unique` UNIQUE(`application_id`)
);
--> statement-breakpoint
ALTER TABLE `docusign_envelopes` ADD CONSTRAINT `docusign_envelopes_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `docusign_org_idx` ON `docusign_envelopes` (`organization`);