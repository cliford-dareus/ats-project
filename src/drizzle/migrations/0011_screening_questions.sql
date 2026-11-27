CREATE TABLE `screening_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_id` int NOT NULL,
	`question_id` int,
	`question_text` text NOT NULL,
	`question_type` varchar(32) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`answer_text` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screening_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screening_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`question_text` text NOT NULL,
	`type` enum('short_text','long_text','yes_no','single_choice','number') NOT NULL,
	`options` json,
	`is_required` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `screening_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `screening_answers` ADD CONSTRAINT `screening_answers_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screening_answers` ADD CONSTRAINT `screening_answers_question_id_screening_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `screening_questions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screening_questions` ADD CONSTRAINT `screening_questions_job_id_job_listing_id_fk` FOREIGN KEY (`job_id`) REFERENCES `job_listing`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `screening_answers_application_idx` ON `screening_answers` (`application_id`);--> statement-breakpoint
CREATE INDEX `screening_questions_job_idx` ON `screening_questions` (`job_id`);