CREATE TABLE `organization_member` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`organization_id` varchar(255) NOT NULL,
	`role` varchar(64) NOT NULL DEFAULT 'org:member',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_member_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_org` UNIQUE(`user_id`,`organization_id`)
);
--> statement-breakpoint
ALTER TABLE `users_table` ADD `image_url` varchar(512);--> statement-breakpoint
ALTER TABLE `users_table` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users_table` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `users_table` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `organization_member` ADD CONSTRAINT `organization_member_user_id_users_table_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_member` ADD CONSTRAINT `organization_member_organization_id_organization_clerk_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`clerk_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `org_members_org_idx` ON `organization_member` (`organization_id`);--> statement-breakpoint
ALTER TABLE `users_table` DROP COLUMN `age`;--> statement-breakpoint
ALTER TABLE `users_table` DROP COLUMN `organization`;