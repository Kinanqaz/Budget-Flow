CREATE TABLE public.budget_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  finance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.budget_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert" ON public.budget_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.budget_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);