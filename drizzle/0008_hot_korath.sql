CREATE TABLE `matchHistory` (
	`id` varchar(64) NOT NULL,
	`data` json NOT NULL,
	`finishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matchHistory_id` PRIMARY KEY(`id`)
);
