-- Drop existing policy
DROP POLICY IF EXISTS "Users can update their training steps" ON training_steps;

-- Recreate policy with proper type casting
CREATE POLICY "Users can update their training steps"
  ON training_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = training_steps.plan_id
    AND training_plans.user_id = auth.uid()::text
  )); 