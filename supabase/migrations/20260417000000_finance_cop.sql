-- Finance: cost of production, production staff, production logs (labour accumulation)

CREATE TABLE public.production_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  notes text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_cost_of_production (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cop_description text,
  fabric_cost numeric(14, 2) NOT NULL DEFAULT 0,
  other_cost numeric(14, 2) NOT NULL DEFAULT 0,
  labour_cost numeric(14, 2) NOT NULL DEFAULT 0,
  gross_cost numeric(14, 2) GENERATED ALWAYS AS (fabric_cost + other_cost + labour_cost) STORED,
  production_staff_id uuid REFERENCES public.production_staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_product_cop_staff ON public.product_cost_of_production(production_staff_id);

CREATE TABLE public.production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_staff_id uuid NOT NULL REFERENCES public.production_staff(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_labour_cost numeric(14, 2) NOT NULL DEFAULT 0,
  total_labour_earned numeric(14, 2) GENERATED ALWAYS AS (quantity * unit_labour_cost) STORED,
  notes text,
  logged_for date NOT NULL DEFAULT (date_trunc('month', timezone('utc', now()))::date),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_production_logs_staff_month ON public.production_logs(production_staff_id, logged_for);
CREATE INDEX idx_production_logs_product ON public.production_logs(product_id);
CREATE INDEX idx_production_logs_month ON public.production_logs(logged_for);

CREATE TRIGGER update_production_staff_updated_at
  BEFORE UPDATE ON public.production_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_cop_updated_at
  BEFORE UPDATE ON public.product_cost_of_production
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.production_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cost_of_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_staff_admin" ON public.production_staff
  FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "product_cop_admin" ON public.product_cost_of_production
  FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "production_logs_admin" ON public.production_logs
  FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_of_production TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_logs TO authenticated;
GRANT ALL ON public.production_staff TO service_role;
GRANT ALL ON public.product_cost_of_production TO service_role;
GRANT ALL ON public.production_logs TO service_role;

UPDATE public.roles
SET permissions = permissions || '{"finance": true}'::jsonb
WHERE id = 'admin';
