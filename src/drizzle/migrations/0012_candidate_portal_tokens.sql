CREATE TABLE `candidate_portal_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidate_portal_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_portal_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `candidate_portal_tokens` ADD CONSTRAINT `candidate_portal_tokens_candidate_id_candidate_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidate`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `candidate_portal_tokens_candidate_idx` ON `candidate_portal_tokens` (`candidate_id`);