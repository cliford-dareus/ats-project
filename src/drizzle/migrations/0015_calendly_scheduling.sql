ALTER TABLE `interviews` ADD `scheduling_provider` enum('google','calendly') DEFAULT 'google' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `calendly_event_type_uri` varchar(255);--> statement-breakpoint
ALTER TABLE `interviews` ADD `calendly_event_type_name` varchar(255);--> statement-breakpoint
ALTER TABLE `interviews` ADD `calendly_event_uri` varchar(255);--> statement-breakpoint
ALTER TABLE `interviews` ADD `calendly_invitee_uri` varchar(255);