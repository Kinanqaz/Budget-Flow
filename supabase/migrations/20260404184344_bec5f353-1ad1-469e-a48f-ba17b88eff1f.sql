
-- Remove existing rows that have no user
DELETE FROM public.budget_settings;

-- Add user_id column
ALTER TABLE public.budget_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;

-- Add unique constraint on user_id
ALTER TABLE public.budget_settings ADD CONSTRAINT budget_settings_user_id_unique UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read own budget" ON public.budget_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own budget" ON public.budget_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own budget" ON public.budget_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
