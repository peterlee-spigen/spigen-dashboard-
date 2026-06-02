-- ad_campaigns (SP/SB/SD 통합, 타입별 고유 필드는 meta JSONB)
CREATE TABLE ad_campaigns (
  id                     bigserial PRIMARY KEY,
  date                   date        NOT NULL,
  type                   text        NOT NULL CHECK (type IN ('SP','SB','SD')),
  campaign_id            text        NOT NULL,
  campaign_name          text        NOT NULL DEFAULT '',
  status                 text        NOT NULL DEFAULT '',
  budget_amount          numeric     NOT NULL DEFAULT 0,
  budget_type            text        NOT NULL DEFAULT '',
  cost_type              text        NOT NULL DEFAULT 'CPC',
  impressions            integer     NOT NULL DEFAULT 0,
  clicks                 integer     NOT NULL DEFAULT 0,
  cost                   numeric     NOT NULL DEFAULT 0,
  sales_14d              numeric     NOT NULL DEFAULT 0,
  purchases_14d          integer     NOT NULL DEFAULT 0,
  units_sold_14d         integer     NOT NULL DEFAULT 0,
  new_to_brand_sales     numeric     NOT NULL DEFAULT 0,
  new_to_brand_purchases integer     NOT NULL DEFAULT 0,
  meta                   jsonb       NOT NULL DEFAULT '{}',
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, type, campaign_id)
);
CREATE INDEX ad_campaigns_date_idx ON ad_campaigns (date);
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON ad_campaigns FOR SELECT TO authenticated USING (true);

-- attribution
CREATE TABLE attribution (
  id                         bigserial PRIMARY KEY,
  date                       date     NOT NULL,
  campaign_id                text     NOT NULL DEFAULT '',
  ad_group_id                text     NOT NULL DEFAULT '',
  publisher                  text     NOT NULL DEFAULT '',
  product_asin               text     NOT NULL DEFAULT '',
  product_name               text     NOT NULL DEFAULT '',
  attributed_sales_14d       numeric  NOT NULL DEFAULT 0,
  attributed_purchases_14d   integer  NOT NULL DEFAULT 0,
  brand_halo_sales_14d       numeric  NOT NULL DEFAULT 0,
  brand_halo_purchases_14d   integer  NOT NULL DEFAULT 0,
  new_to_brand_sales_14d     numeric  NOT NULL DEFAULT 0,
  new_to_brand_purchases_14d integer  NOT NULL DEFAULT 0,
  detail_page_views_14d      integer  NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, campaign_id, product_asin, publisher)
);
CREATE INDEX attribution_date_idx ON attribution (date);
ALTER TABLE attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON attribution FOR SELECT TO authenticated USING (true);

-- orders (order_id+sku+purchase_date UK → 재업로드 중복 방지)
CREATE TABLE orders (
  id                  bigserial PRIMARY KEY,
  order_id            text    NOT NULL DEFAULT '',
  purchase_date       date    NOT NULL,
  asin                text    NOT NULL DEFAULT '',
  sku                 text    NOT NULL DEFAULT '',
  quantity            integer NOT NULL DEFAULT 0,
  item_price          numeric NOT NULL DEFAULT 0,
  ship_country        text    NOT NULL DEFAULT '',
  fulfillment_channel text    NOT NULL DEFAULT '',
  order_status        text    NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, sku, purchase_date)
);
CREATE INDEX orders_purchase_date_idx ON orders (purchase_date);
CREATE INDEX orders_asin_idx ON orders (asin);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON orders FOR SELECT TO authenticated USING (true);

-- listing
CREATE TABLE listing (
  id                  bigserial PRIMARY KEY,
  asin                text    NOT NULL UNIQUE,
  sku                 text    NOT NULL DEFAULT '',
  item_name           text    NOT NULL DEFAULT '',
  price               numeric NOT NULL DEFAULT 0,
  status              text    NOT NULL DEFAULT '',
  fulfillment_channel text    NOT NULL DEFAULT '',
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE listing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON listing FOR SELECT TO authenticated USING (true);

-- inventory
CREATE TABLE inventory (
  id                bigserial PRIMARY KEY,
  report_date       date    NOT NULL,
  sku               text    NOT NULL,
  asin              text    NOT NULL DEFAULT '',
  product_name      text    NOT NULL DEFAULT '',
  your_price        numeric NOT NULL DEFAULT 0,
  afn_fulfillable   integer NOT NULL DEFAULT 0,
  afn_reserved      integer NOT NULL DEFAULT 0,
  afn_inbound_total integer NOT NULL DEFAULT 0,
  afn_total         integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_date, sku)
);
CREATE INDEX inventory_report_date_idx ON inventory (report_date);
CREATE INDEX inventory_asin_idx ON inventory (asin);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON inventory FOR SELECT TO authenticated USING (true);

-- traffic
CREATE TABLE traffic (
  id                      bigserial PRIMARY KEY,
  report_date             date    NOT NULL,
  parent_asin             text    NOT NULL DEFAULT '',
  child_asin              text    NOT NULL,
  title                   text    NOT NULL DEFAULT '',
  sessions_total          integer NOT NULL DEFAULT 0,
  page_views_total        integer NOT NULL DEFAULT 0,
  buy_box_percentage      numeric NOT NULL DEFAULT 0,
  units_ordered           integer NOT NULL DEFAULT 0,
  unit_session_percentage numeric NOT NULL DEFAULT 0,
  ordered_product_sales   numeric NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_date, child_asin)
);
CREATE INDEX traffic_report_date_idx ON traffic (report_date);
CREATE INDEX traffic_child_asin_idx ON traffic (child_asin);
ALTER TABLE traffic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON traffic FOR SELECT TO authenticated USING (true);
