CREATE TABLE `staff_time_off` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staff_id` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`start_time` time,
	`end_time` time,
	`reason` varchar(500),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`entry_type` enum('request','direct') NOT NULL DEFAULT 'request',
	`requested_by` int,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`reviewer_note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_time_off_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `staff_time_off` ADD CONSTRAINT `staff_time_off_staff_id_users_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_time_off` ADD CONSTRAINT `staff_time_off_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_time_off` ADD CONSTRAINT `staff_time_off_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
