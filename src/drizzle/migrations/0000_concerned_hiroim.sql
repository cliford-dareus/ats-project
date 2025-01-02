CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int,
	`current_stage_id` int,
	`candidate` int,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(255) NOT NULL,
	`candidates_id` int NOT NULL,
	`attachment_type` enum('RESUME','COVER_LETTER','OFFER_LETTER','OTHER'),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`cv_path` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`status` enum('Active','Rejected','Hired') DEFAULT 'Active',
	CONSTRAINT `candidate_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_email_unique` UNIQUE(`email`),
	CONSTRAINT `candidate_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applications_id` int,
	`locations` varchar(255) NOT NULL,
	`start_at` timestamp,
	`end_at` timestamp,
	`status` enum('SCHEDULE','AWAITING_FEEDBACK','COMPLETE'),
	CONSTRAINT `interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_listing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`salary_up_to` varchar(255) NOT NULL,
	`status` enum('Not Publish','Actively Hiring','Archive') DEFAULT 'Not Publish',
	`created_by` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_listing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_technologies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`technology_id` int NOT NULL,
	CONSTRAINT `job_technologies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scoresCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applications_id` int,
	`interviews_id` int,
	`interviewer` varchar(255) NOT NULL,
	`overall_recommendations` enum('DEFINITELY_NO','NO','YES','STRONG_YES','NO_DECISION') DEFAULT 'NO_DECISION',
	CONSTRAINT `scoresCards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`stage_name` enum('New Candidate','Screening','Phone Interview','Offer'),
	`stage_order_id` int NOT NULL,
	`assign_to` varchar(255),
	CONSTRAINT `stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technologies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`years_experience` int,
	CONSTRAINT `technologies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`age` int NOT NULL,
	`email` varchar(255) NOT NULL,
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_table_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_candidate_candidate_id_fk` FOREIGN KEY (`candidate`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_candidates_id_candidate_id_fk` FOREIGN KEY (`candidates_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interviews` ADD CONSTRAINT `interviews_applications_id_applications_id_fk` FOREIGN KEY (`applications_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_technologies` ADD CONSTRAINT `job_technologies_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_technologies` ADD CONSTRAINT `job_technologies_technology_id_technologies_id_fk` FOREIGN KEY (`technology_id`) REFERENCES `technologies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoresCards` ADD CONSTRAINT `scoresCards_applications_id_applications_id_fk` FOREIGN KEY (`applications_id`) REFERENCES `applications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoresCards` ADD CONSTRAINT `scoresCards_interviews_id_interviews_id_fk` FOREIGN KEY (`interviews_id`) REFERENCES `interviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;