CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_id` int NOT NULL,
	`date` date NOT NULL,
	`time_slot` varchar(8) NOT NULL,
	`client_name` varchar(100) NOT NULL,
	`client_email` varchar(255) NOT NULL,
	`client_phone` varchar(30),
	`notes` text,
	`status` enum('confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'confirmed',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_times` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`time_slot` varchar(8) NOT NULL,
	`reason` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_times_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opening_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`day_of_week` int NOT NULL,
	`open_time` time NOT NULL,
	`close_time` time NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `opening_hours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`duration` int NOT NULL DEFAULT 45,
	`category` varchar(50) NOT NULL DEFAULT 'hair',
	`is_signature` boolean NOT NULL DEFAULT false,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`role` enum('master','staff') NOT NULL DEFAULT 'staff',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
