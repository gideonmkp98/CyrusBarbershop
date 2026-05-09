CREATE TABLE `staff_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staff_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	`open_time` time,
	`close_time` time,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `staff_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `staff_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD `is_barber` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `staff_schedules` ADD CONSTRAINT `staff_schedules_staff_id_users_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_staff_id_users_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;