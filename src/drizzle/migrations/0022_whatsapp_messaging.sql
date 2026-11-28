CREATE TABLE `whatsapp_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization` varchar(255) NOT NULL,
	`candidate_id` int NOT NULL,
	`phone_e164` varchar(32) NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'manual',
	`consented_by` varchar(255),
	`consented_at` timestamp,
	`revoked_by` varchar(255),
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_consents_org_candidate_unique` UNIQUE(`organization`,`candidate_id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`candidate_id` int NOT NULL,
	`to_phone` varchar(32) NOT NULL,
	`template_content_sid` varchar(64) NOT NULL,
	`template_variables` json NOT NULL DEFAULT ('{}'),
	`twilio_message_sid` varchar(64),
	`status` varchar(32),
	`error_message` text,
	`sent_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `whatsapp_consents` ADD CONSTRAINT `whatsapp_consents_candidate_id_candidate_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_candidate_id_candidate_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `whatsapp_consents_org_idx` ON `whatsapp_consents` (`organization`);--> statement-breakpoint
CREATE INDEX `whatsapp_messages_org_idx` ON `whatsapp_messages` (`organization`);--> statement-breakpoint
CREATE INDEX `whatsapp_messages_application_idx` ON `whatsapp_messages` (`application_id`);