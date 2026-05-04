-- Change role enum from 'master'/'beheer' to 'owner'/'manager'/'staff'
-- Step 1: Update existing 'master' or 'beheer' records to 'owner'
UPDATE `users` SET `role` = 'owner' WHERE `role` IN ('master', 'beheer') LIMIT 1;
UPDATE `users` SET `role` = 'manager' WHERE `role` IN ('master', 'beheer');

-- Step 2: Change the enum definition
ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'staff';
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('owner','manager','staff') NOT NULL DEFAULT 'staff';
