-- =====================================================================
-- PVC Card Printing & Generator — MySQL schema
-- Phase 1 tables only: users, customers.
-- Later phases add: documents, customer_details, card_types, templates,
-- orders, generated_cards, audit_logs (see project docs for full ERD).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS pvc_card_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pvc_card_db;

-- ---------------------------------------------------------------------
-- users: staff accounts (Super Admin / Admin / Operator / Designer)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            CHAR(36)      NOT NULL PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL,
    email         VARCHAR(150)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('super_admin','admin','operator','designer')
                  NOT NULL DEFAULT 'operator',
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- customers: the person a card is being printed for
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    mobile      VARCHAR(20)  NOT NULL,
    email       VARCHAR(150) NULL,
    address     TEXT         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_customers_name (name),
    KEY ix_customers_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- documents: an uploaded source file (Aadhaar, FSC, ID card, etc.)
-- belonging to a customer, waiting for or having gone through OCR.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id                CHAR(36)      NOT NULL PRIMARY KEY,
    customer_id       CHAR(36)      NOT NULL,
    document_type     ENUM('aadhaar','fsc','employee_id','student_id','other')
                      NOT NULL DEFAULT 'other',
    status            ENUM('uploaded','processing','processed','failed')
                      NOT NULL DEFAULT 'uploaded',
    original_filename VARCHAR(255)  NOT NULL,
    stored_path       VARCHAR(500)  NOT NULL,
    mime_type         VARCHAR(100)  NULL,
    file_size         INT           NOT NULL,
    back_original_filename VARCHAR(255) NULL,
    back_stored_path  VARCHAR(500)  NULL,
    back_mime_type    VARCHAR(100)  NULL,
    back_file_size    INT           NULL,
    uploaded_by       CHAR(36)      NULL,
    processing_error  TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_documents_customer_id (customer_id),
    CONSTRAINT fk_documents_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- customer_details: OCR-extracted (always operator-editable) identity
-- fields for a customer, sourced from one document.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_details (
    id               CHAR(36)     NOT NULL PRIMARY KEY,
    customer_id      CHAR(36)     NOT NULL,
    document_id      CHAR(36)     NULL,
    name             VARCHAR(150) NULL,
    name_local       VARCHAR(150) NULL,
    dob              VARCHAR(20)  NULL,
    gender           VARCHAR(20)  NULL,
    address          TEXT         NULL,
    address_local    TEXT         NULL,
    document_number  VARCHAR(50)  NULL,
    vid_number       VARCHAR(50)  NULL,
    photo_path       VARCHAR(500) NULL,
    is_verified      TINYINT(1)   NOT NULL DEFAULT 0,
    verified_by      CHAR(36)     NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_customer_details_customer_id (customer_id),
    CONSTRAINT fk_customer_details_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_details_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_details_verified_by FOREIGN KEY (verified_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- card_types: admin-configurable categories of card the shop prints.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_types (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT         NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    -- credit_cost: added for the Subscription & Package module — card
    -- types double as the "Service" entity that spec calls for (see
    -- app/models/card_type.py), rather than a separate services table.
    credit_cost INT          NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_card_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO card_types (id, name, description, is_active) VALUES
    ('aadhaar', 'Aadhaar PVC', 'Aadhaar PVC card', 1),
    ('fsc', 'FSC / Ration Card', NULL, 1),
    ('employee_id', 'Employee ID', NULL, 1),
    ('student_id', 'Student ID', NULL, 1),
    ('visiting_card', 'Visiting Card', NULL, 1),
    ('membership_card', 'Membership Card', NULL, 1),
    ('custom_card', 'Custom Card', NULL, 1);

-- ---------------------------------------------------------------------
-- templates: a card layout — physical size/DPI plus a JSON list of
-- design elements (text, image, photo, logo, QR, barcode, shape) edited
-- by the card designer UI.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id               CHAR(36)     NOT NULL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    card_type_id     CHAR(36)     NOT NULL,
    width_mm         FLOAT        NOT NULL DEFAULT 85.60,
    height_mm        FLOAT        NOT NULL DEFAULT 53.98,
    dpi              INT          NOT NULL DEFAULT 300,
    background_path  VARCHAR(500) NULL,
    elements         JSON         NOT NULL,
    is_active        TINYINT(1)   NOT NULL DEFAULT 1,
    created_by       CHAR(36)     NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_templates_card_type_id (card_type_id),
    CONSTRAINT fk_templates_card_type FOREIGN KEY (card_type_id) REFERENCES card_types(id),
    CONSTRAINT fk_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- generated_cards: metadata for one rendered card output. order_id has
-- no foreign key yet — the orders table doesn't exist until Phase 5.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_cards (
    id            CHAR(36)     NOT NULL PRIMARY KEY,
    order_id      CHAR(36)     NULL,
    customer_id   CHAR(36)     NOT NULL,
    template_id   CHAR(36)     NOT NULL,
    pdf_path      VARCHAR(500) NULL,
    png_path      VARCHAR(500) NULL,
    jpg_path      VARCHAR(500) NULL,
    created_by    CHAR(36)     NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_generated_cards_customer_id (customer_id),
    KEY ix_generated_cards_template_id (template_id),
    CONSTRAINT fk_generated_cards_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_generated_cards_template FOREIGN KEY (template_id) REFERENCES templates(id),
    CONSTRAINT fk_generated_cards_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- orders: a customer's request for N cards of a given type/template.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id            CHAR(36)     NOT NULL PRIMARY KEY,
    customer_id   CHAR(36)     NOT NULL,
    card_type_id  CHAR(36)     NOT NULL,
    template_id   CHAR(36)     NULL,
    quantity      INT          NOT NULL DEFAULT 1,
    status        ENUM('new','processing','ready','printed','completed','cancelled')
                  NOT NULL DEFAULT 'new',
    created_by    CHAR(36)     NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_orders_customer_id (customer_id),
    KEY ix_orders_card_type_id (card_type_id),
    KEY ix_orders_status (status),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_orders_card_type FOREIGN KEY (card_type_id) REFERENCES card_types(id),
    CONSTRAINT fk_orders_template FOREIGN KEY (template_id) REFERENCES templates(id),
    CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Now that orders exists, generated_cards.order_id gets its FK.
ALTER TABLE generated_cards
    ADD CONSTRAINT fk_generated_cards_order FOREIGN KEY (order_id) REFERENCES orders(id);

-- ---------------------------------------------------------------------
-- audit_logs: append-only record of who did what. Instrumented on
-- login, orders, card generation, and customer/document deletion — see
-- backend/app/utils/audit.py for the exact call sites.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    user_id      CHAR(36)     NULL,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    CHAR(36)     NULL,
    details      TEXT         NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_audit_logs_action (action),
    KEY ix_audit_logs_entity_type (entity_type),
    KEY ix_audit_logs_entity_id (entity_id),
    KEY ix_audit_logs_created_at (created_at),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_categories: self-referential — a "sub-category" is a category
-- whose parent_id points at another category.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    slug         VARCHAR(170) NOT NULL,
    description  TEXT         NULL,
    parent_id    CHAR(36)     NULL,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_product_categories_slug (slug),
    KEY ix_product_categories_parent_id (parent_id),
    CONSTRAINT fk_product_categories_parent FOREIGN KEY (parent_id) REFERENCES product_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    slug         VARCHAR(170) NOT NULL,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id    CHAR(36)    NOT NULL PRIMARY KEY,
    name  VARCHAR(80) NOT NULL,
    slug  VARCHAR(90) NOT NULL,
    UNIQUE KEY ux_tags_name (name),
    UNIQUE KEY ux_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- products: pricing fields live directly here for SIMPLE products; for
-- VARIABLE products they live on product_variants instead (a variable
-- product's own regular_price/etc. are unused — the UI shows a price
-- range derived from its variants).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id                 CHAR(36)      NOT NULL PRIMARY KEY,
    name               VARCHAR(200)  NOT NULL,
    sku                VARCHAR(80)   NOT NULL,
    description        TEXT          NULL,
    short_description  TEXT          NULL,
    category_id        CHAR(36)      NULL,
    brand_id           CHAR(36)      NULL,
    product_type       ENUM('simple','variable') NOT NULL DEFAULT 'simple',
    status             ENUM('draft','published','private','out_of_stock') NOT NULL DEFAULT 'draft',
    visibility         ENUM('visible','catalog_only','search_only','hidden') NOT NULL DEFAULT 'visible',
    is_featured        TINYINT(1)    NOT NULL DEFAULT 0,
    regular_price      DECIMAL(12,2) NULL,
    sale_price         DECIMAL(12,2) NULL,
    sale_start_date    DATE          NULL,
    sale_end_date      DATE          NULL,
    cost_price         DECIMAL(12,2) NULL,
    tax_status         ENUM('taxable','shipping_only','none') NOT NULL DEFAULT 'taxable',
    tax_class          ENUM('standard','reduced_rate','zero_rate') NOT NULL DEFAULT 'standard',
    min_quantity       INT           NULL,
    max_quantity       INT           NULL,
    manage_stock       TINYINT(1)    NOT NULL DEFAULT 0,
    stock_quantity     INT           NULL,
    stock_status       ENUM('in_stock','out_of_stock','on_backorder') NOT NULL DEFAULT 'in_stock',
    low_stock_threshold INT          NULL,
    backorders         ENUM('no','notify','yes') NOT NULL DEFAULT 'no',
    created_by         CHAR(36)      NULL,
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_products_sku (sku),
    KEY ix_products_category_id (category_id),
    KEY ix_products_brand_id (brand_id),
    KEY ix_products_status (status),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_tags: many-to-many
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_tags (
    product_id  CHAR(36) NOT NULL,
    tag_id      CHAR(36) NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    CONSTRAINT fk_product_tags_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_images: one row per uploaded image; is_primary marks the
-- single "featured" image, everything else is gallery.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id                 CHAR(36)     NOT NULL PRIMARY KEY,
    product_id         CHAR(36)     NOT NULL,
    stored_path        VARCHAR(500) NOT NULL,
    original_filename  VARCHAR(255) NOT NULL,
    mime_type          VARCHAR(100) NULL,
    is_primary         TINYINT(1)   NOT NULL DEFAULT 0,
    sort_order         INT          NOT NULL DEFAULT 0,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_product_images_product_id (product_id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_variants: one SKU-bearing attribute combination (Size=M,
-- Color=Red, ...) for a variable product. Carries its own pricing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id                CHAR(36)      NOT NULL PRIMARY KEY,
    product_id        CHAR(36)      NOT NULL,
    sku               VARCHAR(80)   NOT NULL,
    attribute_values  JSON          NOT NULL,
    is_active         TINYINT(1)    NOT NULL DEFAULT 1,
    regular_price     DECIMAL(12,2) NULL,
    sale_price        DECIMAL(12,2) NULL,
    sale_start_date   DATE          NULL,
    sale_end_date     DATE          NULL,
    cost_price        DECIMAL(12,2) NULL,
    tax_status        ENUM('taxable','shipping_only','none') NOT NULL DEFAULT 'taxable',
    tax_class         ENUM('standard','reduced_rate','zero_rate') NOT NULL DEFAULT 'standard',
    min_quantity      INT           NULL,
    max_quantity      INT           NULL,
    manage_stock      TINYINT(1)    NOT NULL DEFAULT 0,
    stock_quantity    INT           NULL,
    stock_status      ENUM('in_stock','out_of_stock','on_backorder') NOT NULL DEFAULT 'in_stock',
    low_stock_threshold INT         NULL,
    backorders        ENUM('no','notify','yes') NOT NULL DEFAULT 'no',
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_product_variants_sku (sku),
    KEY ix_product_variants_product_id (product_id),
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_customer_prices: a price override for one specific customer
-- on one specific product. Product-level only (not per-variant) for now.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_customer_prices (
    id           CHAR(36)      NOT NULL PRIMARY KEY,
    product_id   CHAR(36)      NOT NULL,
    customer_id  CHAR(36)      NOT NULL,
    price        DECIMAL(12,2) NOT NULL,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_product_customer_price (product_id, customer_id),
    KEY ix_product_customer_prices_product_id (product_id),
    KEY ix_product_customer_prices_customer_id (customer_id),
    CONSTRAINT fk_product_customer_prices_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_customer_prices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- product_bulk_pricing_tiers: quantity-based pricing. max_quantity NULL
-- means "and above" for the top tier.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_bulk_pricing_tiers (
    id            CHAR(36)      NOT NULL PRIMARY KEY,
    product_id    CHAR(36)      NOT NULL,
    min_quantity  INT           NOT NULL,
    max_quantity  INT           NULL,
    price         DECIMAL(12,2) NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_product_bulk_pricing_tiers_product_id (product_id),
    CONSTRAINT fk_product_bulk_pricing_tiers_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- inventory_adjustments: append-only stock-change log. product_id is
-- always set (even for a variant-level entry); variant_id is set only
-- when the adjustment was made on a specific variant.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id                 CHAR(36)  NOT NULL PRIMARY KEY,
    product_id         CHAR(36)  NOT NULL,
    variant_id         CHAR(36)  NULL,
    previous_quantity  INT       NOT NULL,
    new_quantity       INT       NOT NULL,
    change_quantity    INT       NOT NULL,
    reason             TEXT      NULL,
    adjusted_by        CHAR(36)  NULL,
    created_at         DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_inventory_adjustments_product_id (product_id),
    KEY ix_inventory_adjustments_variant_id (variant_id),
    CONSTRAINT fk_inventory_adjustments_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_adjustments_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =======================================================================
-- Subscription & Package module — Phase 1 (database layer only).
-- Members are a distinct actor from the staff `users` table above — see
-- app/models/member.py for why. "Services" (spec section 7) are the
-- existing card_types table (credit_cost added above), not a new table.
-- =======================================================================

CREATE TABLE IF NOT EXISTS member_types (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL,
    description TEXT         NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_member_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS packages (
    id                   CHAR(36)      NOT NULL PRIMARY KEY,
    name                 VARCHAR(100)  NOT NULL,
    slug                 VARCHAR(120)  NOT NULL,
    price                DECIMAL(12,2) NOT NULL,
    credits              INT           NOT NULL,
    license_days         INT           NOT NULL,
    device_limit         INT           NOT NULL DEFAULT 1,
    pdf_generation_limit INT           NOT NULL,
    is_active            TINYINT(1)    NOT NULL DEFAULT 1,
    created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_packages_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS package_member_types (
    package_id     CHAR(36) NOT NULL,
    member_type_id CHAR(36) NOT NULL,
    PRIMARY KEY (package_id, member_type_id),
    CONSTRAINT fk_pmt_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_pmt_member_type FOREIGN KEY (member_type_id) REFERENCES member_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS package_services (
    package_id   CHAR(36) NOT NULL,
    card_type_id CHAR(36) NOT NULL,
    PRIMARY KEY (package_id, card_type_id),
    CONSTRAINT fk_ps_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_card_type FOREIGN KEY (card_type_id) REFERENCES card_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_type_services (
    member_type_id CHAR(36) NOT NULL,
    card_type_id    CHAR(36) NOT NULL,
    PRIMARY KEY (member_type_id, card_type_id),
    CONSTRAINT fk_mts_member_type FOREIGN KEY (member_type_id) REFERENCES member_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_mts_card_type FOREIGN KEY (card_type_id) REFERENCES card_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id                CHAR(36)     NOT NULL PRIMARY KEY,
    full_name         VARCHAR(150) NOT NULL,
    phone             VARCHAR(20)  NOT NULL,
    email             VARCHAR(150) NOT NULL,
    login_id          VARCHAR(50)  NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    member_type_id    CHAR(36)     NOT NULL,
    is_active         TINYINT(1)   NOT NULL DEFAULT 1,
    terms_accepted_at DATETIME     NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY ux_members_phone (phone),
    UNIQUE KEY ux_members_email (email),
    UNIQUE KEY ux_members_login_id (login_id),
    KEY ix_members_member_type_id (member_type_id),
    CONSTRAINT fk_members_member_type FOREIGN KEY (member_type_id) REFERENCES member_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscriptions (
    id                CHAR(36)  NOT NULL PRIMARY KEY,
    member_id         CHAR(36)  NOT NULL,
    package_id        CHAR(36)  NOT NULL,
    member_type_id    CHAR(36)  NOT NULL,
    start_date        DATE      NOT NULL,
    expiry_date       DATE      NOT NULL,
    credits_allocated INT       NOT NULL,
    credits_remaining INT       NOT NULL,
    pdf_limit         INT       NOT NULL,
    pdf_used          INT       NOT NULL DEFAULT 0,
    status            ENUM('pending_approval','active','expired','suspended','cancelled')
                      NOT NULL DEFAULT 'pending_approval',
    created_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
    KEY ix_subscriptions_member_id (member_id),
    KEY ix_subscriptions_package_id (package_id),
    KEY ix_subscriptions_status (status),
    CONSTRAINT fk_subscriptions_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_package FOREIGN KEY (package_id) REFERENCES packages(id),
    CONSTRAINT fk_subscriptions_member_type FOREIGN KEY (member_type_id) REFERENCES member_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Multi-tenancy groundwork: which Member (if any) owns a given customer /
-- order / generated card, for when a subscriber manages their own data
-- through their own dashboard. NULL means a "house account" row created
-- directly by internal staff — every row that existed before this module
-- falls into that case. Unused until a later phase's access-control logic
-- reads it; added now (rather than in a future migration + backfill)
-- because it's schema-only and changes no existing behavior.
ALTER TABLE customers ADD COLUMN owner_member_id CHAR(36) NULL,
    ADD KEY ix_customers_owner_member_id (owner_member_id),
    ADD CONSTRAINT fk_customers_owner_member FOREIGN KEY (owner_member_id) REFERENCES members(id);

ALTER TABLE orders ADD COLUMN owner_member_id CHAR(36) NULL,
    ADD KEY ix_orders_owner_member_id (owner_member_id),
    ADD CONSTRAINT fk_orders_owner_member FOREIGN KEY (owner_member_id) REFERENCES members(id);

ALTER TABLE generated_cards ADD COLUMN owner_member_id CHAR(36) NULL,
    ADD KEY ix_generated_cards_owner_member_id (owner_member_id),
    ADD CONSTRAINT fk_generated_cards_owner_member FOREIGN KEY (owner_member_id) REFERENCES members(id);

-- ---------------------------------------------------------------------
-- Seed note: the first Super Admin is created via
-- backend/scripts_seed_admin.py, not via raw SQL, so the password is
-- always bcrypt-hashed by the application rather than pasted in here.
-- ---------------------------------------------------------------------
