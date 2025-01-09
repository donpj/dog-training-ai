-- Drop existing function
DROP FUNCTION IF EXISTS public.create_training_plan(
  p_dog_id bigint,
  p_user_id text,
  p_title text,
  p_description text,
  p_behavior_to_correct text,
  p_difficulty text,
  p_duration_weeks integer,
  p_status text,
  p_steps jsonb
);

-- Recreate function with proper type casting and steps handling
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
  -- Insert the training plan with type casting for both enums
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
    p_difficulty::difficulty_level,  -- Cast text to difficulty_level enum
    p_duration_weeks,
    p_status::training_status  -- Cast text to training_status enum
  ) RETURNING id INTO v_plan_id;

  -- Insert the steps with proper null handling and default values
  INSERT INTO public.training_steps (
    plan_id,
    title,
    description,
    day_number,
    duration_minutes,
    completed
  )
  SELECT
    v_plan_id,
    COALESCE((step->>'title')::text, 'Untitled Step'),
    COALESCE((step->>'description')::text, ''),
    COALESCE(
      (step->>'dayNumber')::integer,
      (step->>'day_number')::integer,
      1  -- Default to day 1 if no day number provided
    ),
    COALESCE(
      (step->>'durationMinutes')::integer,
      (step->>'duration_minutes')::integer,
      15  -- Default to 15 minutes if no duration provided
    ),
    false  -- Default to not completed
  FROM jsonb_array_elements(p_steps) AS step;

  -- Return the created plan
  SELECT * INTO v_result FROM public.training_plans WHERE id = v_plan_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 