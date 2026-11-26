ALTER TABLE `score_cards` ADD `feedback` text;--> statement-breakpoint
ALTER TABLE `score_cards` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `score_cards` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `score_cards` ADD CONSTRAINT `score_cards_interview_unique` UNIQUE(`interviews_id`);