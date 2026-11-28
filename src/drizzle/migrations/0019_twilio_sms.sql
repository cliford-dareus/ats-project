CREATE TABLE `sms_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`status` enum('consented','opted_out') NOT NULL DEFAULT 'consented',
	`source` enum('apply_form','recruiter','sms_reply') NOT NULL DEFAULT 'recruiter',
	`recorded_by` varchar(255),
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	`note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_consents_candidate_org_unique` UNIQUE(`candidate_id`,`organization`)
);
--> statement-breakpoint
ALTER TABLE `sms_consents` ADD CONSTRAINT `sms_consents_candidate_id_candidate_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sms_consents_org_idx` ON `sms_consents` (`organization`);