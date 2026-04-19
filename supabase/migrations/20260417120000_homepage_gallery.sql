-- Homepage lookbook / dress gallery (admin-managed, public via API)
CREATE TABLE public.homepage_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  caption text,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_homepage_gallery_active_sort ON public.homepage_gallery (is_active, sort_order);

CREATE TRIGGER update_homepage_gallery_updated_at
  BEFORE UPDATE ON public.homepage_gallery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.homepage_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homepage_gallery_admin_all" ON public.homepage_gallery
  FOR ALL USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_gallery TO authenticated;
GRANT ALL ON public.homepage_gallery TO service_role;
