ALTER TABLE `products` MODIFY COLUMN `category` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);