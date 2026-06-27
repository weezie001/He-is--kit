CREATE TABLE `tryOnUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tryOnUsage_id` PRIMARY KEY(`id`)
);
