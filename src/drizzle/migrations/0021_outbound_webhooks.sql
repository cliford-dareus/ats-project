CREATE TABLE `webhook_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_id` varchar(36) NOT NULL,
	`subscription_id` int NOT NULL,
	`organization` varchar(255) NOT NULL,
	`event` varchar(64) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`attempt` int NOT NULL DEFAULT 1,
	`status` enum('delivered','failed','error') NOT NULL,
	`status_code` int,
	`response_snippet` text,
	`error_message` varchar(512),
	`duration_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization` varchar(255) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`events` json NOT NULL,
	`signing_secret` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_subscription_id_webhook_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `webhook_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_organization_organization_clerk_id_fk` FOREIGN KEY (`organization`) REFERENCES `organization`(`clerk_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_subscriptions` ADD CONSTRAINT `webhook_subscriptions_organization_organization_clerk_id_fk` FOREIGN KEY (`organization`) REFERENCES `organization`(`clerk_id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `webhook_deliveries_org_created_idx` ON `webhook_deliveries` (`organization`,`created_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_subscription_created_idx` ON `webhook_deliveries` (`subscription_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_delivery_idx` ON `webhook_deliveries` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `webhook_subscriptions_org_active_idx` ON `webhook_subscriptions` (`organization`,`active`);