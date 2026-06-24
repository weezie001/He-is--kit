CREATE TABLE `cartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`size` varchar(10) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cartItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`status` enum('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2) NOT NULL,
	`items` json,
	`shippingAddress` json,
	`paymentMethod` varchar(50),
	`paymentStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('kits','training_tops','casual_wear') NOT NULL,
	`team` varchar(100),
	`price` decimal(10,2) NOT NULL,
	`originalPrice` decimal(10,2),
	`imageUrl` varchar(500) NOT NULL,
	`imageUrls` json,
	`color` varchar(100),
	`material` varchar(100),
	`sizes` json,
	`style` varchar(100),
	`tags` json,
	`stock` int DEFAULT 0,
	`featured` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`query` text NOT NULL,
	`results` json,
	`clicked` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `favoriteSport` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `favoriteTeam` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `userType` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `stylePreference` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `profileCompleted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `height` int;--> statement-breakpoint
ALTER TABLE `users` ADD `weight` int;--> statement-breakpoint
ALTER TABLE `users` ADD `measurements` json;--> statement-breakpoint
ALTER TABLE `users` ADD `recommendedSize` varchar(10);