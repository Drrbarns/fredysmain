-- Preorder support
-- Adds is_preorder flags on orders and order_items so out-of-stock items
-- can still be ordered and surfaced in a dedicated admin "Preorders" view.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false;

-- Helpful filtering index for the Preorders admin page
CREATE INDEX IF NOT EXISTS idx_orders_is_preorder_created_at
  ON public.orders (is_preorder, created_at DESC)
  WHERE is_preorder = true;
