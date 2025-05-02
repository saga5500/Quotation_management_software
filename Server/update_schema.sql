-- Add status column to quotations table
ALTER TABLE quotations
ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

-- Add updated_at column to quotations table
ALTER TABLE quotations
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Verify the changes
SELECT * FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'quotation_management' 
AND TABLE_NAME = 'quotations';