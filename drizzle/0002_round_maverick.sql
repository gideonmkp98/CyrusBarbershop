CREATE TABLE `appointment_add_ons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointment_id` int NOT NULL,
	`service_id` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL,
	CONSTRAINT `appointment_add_ons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointment_add_ons` ADD CONSTRAINT `appointment_add_ons_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointment_add_ons` ADD CONSTRAINT `appointment_add_ons_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;