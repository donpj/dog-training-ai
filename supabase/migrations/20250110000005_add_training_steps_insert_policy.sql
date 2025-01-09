-- Add INSERT policy for training_steps
CREATE POLICY "Users can create training steps"
  ON training_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM training_plans
    WHERE training_plans.id = plan_id
    AND training_plans.user_id = auth.uid()::text
  )); 