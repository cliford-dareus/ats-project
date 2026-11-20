ALTER TABLE `stages` DROP FOREIGN KEY `stages_assign_to_users_table_id_fk`;
--> statement-breakpoint
ALTER TABLE `stages` ADD CONSTRAINT `stages_assign_to_users_table_id_fk` FOREIGN KEY (`assign_to`) REFERENCES `users_table`(`id`) ON DELETE cascade ON UPDATE no action;