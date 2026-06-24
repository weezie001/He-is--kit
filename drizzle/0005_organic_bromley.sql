CREATE TABLE `supportMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sender` enum('user','admin') NOT NULL,
	`content` text NOT NULL,
	`readByAdmin` boolean NOT NULL DEFAULT false,
	`readByUser` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportMessages_id` PRIMARY KEY(`id`)
);
