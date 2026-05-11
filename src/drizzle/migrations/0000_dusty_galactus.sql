CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int,
	`current_stage_id` int,
	`candidate` int,
	`can_contact` boolean DEFAULT false,
	`position_in_stage` int NOT NULL DEFAULT 0,
	`organization` varchar(255) NOT NULL,
	`subdomain` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(255) NOT NULL,
	`candidate_id` int NOT NULL,
	`attachment_type` enum('RESUME','COVER_LETTER','OFFER_LETTER','OTHER'),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`cv_path` varchar(255) NOT NULL,
	`subdomain` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`address` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`zip_code` varchar(255) NOT NULL,
	`organization` varchar(255) NOT NULL,
	`status` enum('ACTIVE','REJECTED','HIRED') DEFAULT 'ACTIVE',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applications_id` int,
	`locations` varchar(255) NOT NULL,
	`start_at` timestamp,
	`end_at` timestamp,
	`type` enum('VIDEO','PHONE','ONSITE'),
	`organization` varchar(255) NOT NULL,
	`link` varchar(255),
	`status` enum('SCHEDULE','AWAITING_FEEDBACK','COMPLETE'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_listing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`salary_up_to` varchar(255) NOT NULL,
	`department` int NOT NULL,
	`subdomain` varchar(255) NOT NULL,
	`organization` varchar(255) NOT NULL,
	`status` enum('OPEN','CLOSED','DRAFT','ARCHIVED','PENDING') DEFAULT 'PENDING',
	`type` enum('FULL_TIME','PART_TIME','REMOTE','INTERNSHIP','CONTRACT') DEFAULT 'FULL_TIME',
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
CREATE TABLE `org_to_department` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department_id` int NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	CONSTRAINT `org_to_department_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_org_dept` UNIQUE(`department_id`,`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`clerk_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`locations` varchar(255) NOT NULL DEFAULT 'New-York',
	`phone` varchar(255) NOT NULL DEFAULT '305-555-0100',
	`email` varchar(255) NOT NULL DEFAULT 'company@example.com',
	`primary_color` varchar(255) NOT NULL DEFAULT 'purple',
	`font_family` varchar(255) NOT NULL DEFAULT 'sans',
	`subdomain` varchar(255) NOT NULL,
	`plugins` json NOT NULL DEFAULT ('{"enabled":[],"settings":{}}'),
	`theme` json,
	CONSTRAINT `organization_clerk_id` PRIMARY KEY(`clerk_id`),
	CONSTRAINT `organization_subdomain_unique` UNIQUE(`subdomain`)
);
--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255) NOT NULL,
	`version` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`config` json NOT NULL DEFAULT ('{}'),
	CONSTRAINT `plugins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scoresCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interviews_id` int,
	`interviewer` varchar(255) NOT NULL,
	`overall_recommendations` enum('DEFINITELY_NO','NO','YES','STRONG_YES','NO_DECISION') DEFAULT 'NO_DECISION',
	CONSTRAINT `scoresCards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`stage_name` enum('Applied','New Candidate','Screening','Phone Interview','Interview','Offer','Drafted'),
	`stage_order_id` int NOT NULL,
	`color` varchar(255),
	`need_schedule` boolean DEFAULT true,
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
CREATE TABLE `triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action_type` varchar(255) NOT NULL,
	`config` json NOT NULL DEFAULT ('{"template":"","options":[],"delay":1,"delayFormat":"minutes"}'),
	`stage_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `triggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`age` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`organization` varchar(255) NOT NULL,
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_table_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_current_stage_id_stages_id_fk` FOREIGN KEY (`current_stage_id`) REFERENCES `stages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_candidate_candidate_id_fk` FOREIGN KEY (`candidate`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_candidate_id_candidate_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interviews` ADD CONSTRAINT `interviews_applications_id_applications_id_fk` FOREIGN KEY (`applications_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_technologies` ADD CONSTRAINT `job_technologies_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_technologies` ADD CONSTRAINT `job_technologies_technology_id_technologies_id_fk` FOREIGN KEY (`technology_id`) REFERENCES `technologies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_to_department` ADD CONSTRAINT `org_to_department_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_to_department` ADD CONSTRAINT `org_to_department_organization_id_organization_clerk_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`clerk_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoresCards` ADD CONSTRAINT `scoresCards_interviews_id_interviews_id_fk` FOREIGN KEY (`interviews_id`) REFERENCES `interviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_assign_to_users_table_id_fk` FOREIGN KEY (`assign_to`) REFERENCES `users_table`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `triggers` ADD CONSTRAINT `triggers_stage_id_stages_id_fk` FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stage_position_idx` ON `applications` (`current_stage_id`,`position_in_stage`);--> statement-breakpoint
CREATE INDEX `applications_job_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `candidate_idx` ON `applications` (`candidate`);--> statement-breakpoint
CREATE INDEX `job_stage_unique` ON `stages` (`job_id`,`stage_name`);--> statement-breakpoint
CREATE INDEX `stages_job_idx` ON `stages` (`job_id`);