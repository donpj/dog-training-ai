-- Add behavior_to_correct column to training_plans table
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS behavior_to_correct TEXT;

-- Backfill any existing rows with NULL (optional)
UPDATE training_plans SET behavior_to_correct = NULL WHERE behavior_to_correct IS NULL; 