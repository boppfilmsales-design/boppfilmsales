CREATE TABLE `admin_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_log_created_idx` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `admin_contents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`name_zh` text DEFAULT '' NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_contents_source_id_key` ON `admin_contents` (`source_id`);--> statement-breakpoint
CREATE INDEX `admin_contents_kind_idx` ON `admin_contents` (`kind`);--> statement-breakpoint
CREATE TABLE `admin_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`section_pid` integer,
	`column_source_id` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`reply` text DEFAULT '' NOT NULL,
	`replied_by` text DEFAULT '' NOT NULL,
	`replied_at` integer,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_messages_created_idx` ON `admin_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_messages_status_idx` ON `admin_messages` (`status`);--> statement-breakpoint
CREATE TABLE `admin_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`family_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`sort` integer DEFAULT 10 NOT NULL,
	`title` text NOT NULL,
	`title_zh` text DEFAULT '' NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`subtitle_zh` text DEFAULT '' NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`price` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`gallery_json` text DEFAULT '[]' NOT NULL,
	`body_html` text DEFAULT '' NOT NULL,
	`body_text` text DEFAULT '' NOT NULL,
	`body_html_zh` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`description_zh` text DEFAULT '' NOT NULL,
	`technical` text DEFAULT '' NOT NULL,
	`technical_zh` text DEFAULT '' NOT NULL,
	`offer` text DEFAULT '' NOT NULL,
	`offer_zh` text DEFAULT '' NOT NULL,
	`pdfs_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT '正常' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_products_source_id_key` ON `admin_products` (`source_id`);--> statement-breakpoint
CREATE INDEX `admin_products_family_idx` ON `admin_products` (`family_id`);--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`name_zh` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`permissions_json` text DEFAULT '["*"]' NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_roles_key_key` ON `admin_roles` (`key`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`role_key` text DEFAULT 'owner' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_key` ON `admin_users` (`username`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`contact` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`source_page` text DEFAULT '/contact' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`reply` text DEFAULT '' NOT NULL,
	`replied_by` text DEFAULT '' NOT NULL,
	`replied_at` integer,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_created_at_idx` ON `inquiries` (`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `inquiries_public_idx` ON `inquiries` (`is_public`);--> statement-breakpoint
CREATE TABLE `news_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`source_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_categories_slug_key` ON `news_categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `news_categories_source_id_key` ON `news_categories` (`source_id`);--> statement-breakpoint
CREATE TABLE `news_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`source_id` integer,
	`title` text NOT NULL,
	`list_date` text DEFAULT '' NOT NULL,
	`news_date` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`body_html` text DEFAULT '' NOT NULL,
	`body_text` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`is_published` integer DEFAULT true NOT NULL,
	`sort_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `news_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `news_posts_category_idx` ON `news_posts` (`category_id`);--> statement-breakpoint
CREATE INDEX `news_posts_sort_idx` ON `news_posts` (`sort_date`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`group_name` text DEFAULT 'general' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_settings_key_key` ON `site_settings` (`key`);