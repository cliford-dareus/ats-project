ALTER TABLE `candidate` ADD `address` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `city` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `state` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `zip_code` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `theme` json;