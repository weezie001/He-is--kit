ALTER TABLE `orders` ADD `trackingNumber` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `carrier` varchar(80);--> statement-breakpoint
ALTER TABLE `orders` ADD `estimatedDelivery` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `shippingAddress` json;--> statement-breakpoint
ALTER TABLE `users` ADD `marketingOptIn` boolean DEFAULT true;