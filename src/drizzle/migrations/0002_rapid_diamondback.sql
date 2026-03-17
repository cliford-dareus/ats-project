ALTER TABLE `organization` RENAME COLUMN `color` TO `primary_color`;--> statement-breakpoint
ALTER TABLE `applications` ADD `subdomain` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `subdomain` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate` ADD `location` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `type` enum('VIDEO','PHONE','ONSITE');--> statement-breakpoint
ALTER TABLE `interviews` ADD `link` varchar(255);--> statement-breakpoint
ALTER TABLE `job_listing` ADD `subdomain` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `font_family` varchar(255) DEFAULT 'sans' NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `subdomain` varchar(255) NOT NULL;