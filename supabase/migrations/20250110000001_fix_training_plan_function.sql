-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.create_training_plan(
  p_dog_id integer,
  p_user_id text,
  p_title text,
  p_description text,
  p_difficulty text,
  p_duration_weeks integer,
  p_status text,
  p_steps jsonb
);

DROP FUNCTION IF EXISTS public.create_training_plan(
  p_dog_id uuid,
  p_user_id uuid,
  p_title text,
  p_description text,
  p_difficulty text,
  p_duration_weeks integer,
  p_status text,
  p_steps jsonb
);

-- Create the function with correct parameter types
CREATE OR REPLACE FUNCTION public.create_training_plan(
  p_dog_id bigint,
  p_user_id text,
  p_title text,
  p_description text,
  p_behavior_to_correct text,
  p_difficulty text,
  p_duration_weeks integer,
  p_status text,
  p_steps jsonb
) RETURNS public.training_plans AS $$
DECLARE
  v_plan_id bigint;
  v_result public.training_plans;
BEGIN
  -- Insert the training plan
  INSERT INTO public.training_plans (
    dog_id,
    user_id,
    title,
    description,
    behavior_to_correct,
    difficulty,
    duration_weeks,
    status
  ) VALUES (
    p_dog_id,
    p_user_id,
    p_title,
    p_description,
    p_behavior_to_correct,
    p_difficulty,
    p_duration_weeks,
    p_status
  ) RETURNING id INTO v_plan_id;

  -- Insert the steps
  INSERT INTO public.training_steps (
    plan_id,
    title,
    description,
    day_number,
    duration_minutes
  )
  SELECT
    v_plan_id,
    (step->>'title')::text,
    (step->>'description')::text,
    (step->>'dayNumber')::integer,
    (step->>'durationMinutes')::integer
  FROM jsonb_array_elements(p_steps) AS step;

  -- Return the created plan
  SELECT * INTO v_result FROM public.training_plans WHERE id = v_plan_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 