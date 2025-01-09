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

-- Add sessions_per_week column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_plans' 
    AND column_name = 'sessions_per_week'
  ) THEN
    ALTER TABLE training_plans ADD COLUMN sessions_per_week INTEGER NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Add training_days column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'training_plans' 
    AND column_name = 'training_days'
  ) THEN
    ALTER TABLE training_plans ADD COLUMN training_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Wednesday', 'Friday'];
  END IF;
END $$;

-- Create the function with correct parameter types
CREATE OR REPLACE FUNCTION public.create_training_plan(
  p_dog_id bigint,
  p_user_id text,
  p_title text,
  p_description text,
  p_behavior_to_correct text,
  p_difficulty text,
  p_duration_weeks integer,
  p_sessions_per_week integer,
  p_training_days text[],
  p_status text,
  p_steps jsonb
)
RETURNS public.training_plans
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
      sessions_per_week,
      training_days,
      status
    ) VALUES (
      p_dog_id,
      p_user_id,
      p_title,
      p_description,
      p_behavior_to_correct,
      p_difficulty::difficulty_level,
      p_duration_weeks,
      p_sessions_per_week,
      p_training_days,
      p_status::training_status
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
END;
$$; 