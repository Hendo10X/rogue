import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// --- Marketplace & Payments ---

export const wallet = pgTable(
  "wallet",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    balance: numeric("balance", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("wallet_user_currency_idx").on(table.userId, table.currency),
  ],
);

export const supplier = pgTable("supplier", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key").notNull(),
  status: text("status").default("active").notNull(),
  capabilities: jsonb("capabilities").$type<{
    accounts?: boolean;
    services?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const listing = pgTable(
  "listing",
  {
    id: text("id").primaryKey(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id").notNull(),
    type: text("type").notNull(), // "account" | "service"
    platform: text("platform").notNull(), // instagram, tiktok, twitter, youtube, vpn, etc
    categoryName: text("category_name"),
    title: text("title").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    supplierPrice: numeric("supplier_price", { precision: 18, scale: 8 }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull(),
    stock: integer("stock").default(0).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("listing_supplier_idx").on(table.supplierId),
    index("listing_slug_idx").on(table.slug),
    index("listing_status_idx").on(table.status),
    uniqueIndex("listing_supplier_product_idx").on(
      table.supplierId,
      table.externalProductId
    ),
  ],
);

export const order = pgTable(
  "order",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    status: text("status").default("pending").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    walletId: text("wallet_id").references(() => wallet.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("order_user_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_created_idx").on(table.createdAt),
  ],
);

export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey(),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // deposit, withdrawal, order_payment, refund, supplier_payout, adjustment
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").default("pending").notNull(),
    externalReference: text("external_reference"),
    orderId: text("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("transaction_wallet_idx").on(table.walletId),
    index("transaction_order_idx").on(table.orderId),
    index("transaction_created_idx").on(table.createdAt),
  ],
);

export const supplierOrder = pgTable(
  "supplier_order",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "restrict" }),
    externalId: text("external_id"),
    status: text("status").default("pending").notNull(),
    requestPayload: jsonb("request_payload").$type<Record<string, unknown>>(),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("supplier_order_order_idx").on(table.orderId),
    index("supplier_order_supplier_idx").on(table.supplierId),
    index("supplier_order_external_idx").on(table.externalId),
  ],
);

export const accountDelivery = pgTable(
  "account_delivery",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" })
      .unique(),
    platform: text("platform").notNull(),
    username: text("username"),
    email: text("email"),
    password: text("password"),
    emailPassword: text("email_password"),
    deliveryStatus: text("delivery_status").default("pending").notNull(),
    deliveredAt: timestamp("delivered_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_delivery_order_idx").on(table.orderId)],
);

export const deposit = pgTable(
  "deposit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull(),
    provider: text("provider").default("plisio").notNull(),
    plisioTxnId: text("plisio_txn_id"),
    plisioOrderNumber: text("plisio_order_number").notNull().unique(),
    status: text("status").default("pending").notNull(),
    invoiceUrl: text("invoice_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("deposit_user_idx").on(table.userId),
    index("deposit_status_idx").on(table.status),
    index("deposit_plisio_order_idx").on(table.plisioOrderNumber),
  ],
);

export const boostingOrder = pgTable(
  "boosting_order",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "restrict" }),
    serviceId: integer("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    category: text("category"),
    link: text("link").notNull(),
    quantity: integer("quantity").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    externalOrderId: integer("external_order_id"),
    status: text("status").default("pending").notNull(),
    externalStatus: text("external_status"),
    charge: numeric("charge"),
    startCount: text("start_count"),
    remains: text("remains"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("boosting_order_user_idx").on(table.userId),
    index("boosting_order_status_idx").on(table.status),
    index("boosting_order_external_idx").on(table.externalOrderId),
  ],
);

export const admin = pgTable("admin", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const adminSession = pgTable(
  "admin_session",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => admin.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_session_admin_idx").on(table.adminId),
    index("admin_session_expires_idx").on(table.expiresAt),
  ],
);

export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const webhookLog = pgTable(
  "webhook_log",
  {
    id: text("id").primaryKey(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => supplier.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    status: text("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_log_supplier_idx").on(table.supplierId),
    index("webhook_log_created_idx").on(table.createdAt),
  ],
);

// --- Relations ---

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  wallets: many(wallet),
  orders: many(order),
  boostingOrders: many(boostingOrder),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const walletRelations = relations(wallet, ({ one, many }) => ({
  user: one(user, { fields: [wallet.userId], references: [user.id] }),
  transactions: many(transaction),
  orders: many(order),
  deposits: many(deposit),
}));

export const depositRelations = relations(deposit, ({ one }) => ({
  user: one(user, { fields: [deposit.userId], references: [user.id] }),
  wallet: one(wallet, {
    fields: [deposit.walletId],
    references: [wallet.id],
  }),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  wallet: one(wallet, {
    fields: [transaction.walletId],
    references: [wallet.id],
  }),
  order: one(order, { fields: [transaction.orderId], references: [order.id] }),
}));

export const supplierRelations = relations(supplier, ({ many }) => ({
  listings: many(listing),
  supplierOrders: many(supplierOrder),
  webhookLogs: many(webhookLog),
}));

export const listingRelations = relations(listing, ({ one, many }) => ({
  supplier: one(supplier, {
    fields: [listing.supplierId],
    references: [supplier.id],
  }),
  orders: many(order),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  listing: one(listing, {
    fields: [order.listingId],
    references: [listing.id],
  }),
  wallet: one(wallet, { fields: [order.walletId], references: [wallet.id] }),
  transactions: many(transaction),
  supplierOrders: many(supplierOrder),
  accountDelivery: one(accountDelivery),
}));

export const supplierOrderRelations = relations(supplierOrder, ({ one }) => ({
  order: one(order, {
    fields: [supplierOrder.orderId],
    references: [order.id],
  }),
  supplier: one(supplier, {
    fields: [supplierOrder.supplierId],
    references: [supplier.id],
  }),
}));

export const accountDeliveryRelations = relations(
  accountDelivery,
  ({ one }) => ({
    order: one(order, {
      fields: [accountDelivery.orderId],
      references: [order.id],
    }),
  }),
);

export const webhookLogRelations = relations(webhookLog, ({ one }) => ({
  supplier: one(supplier, {
    fields: [webhookLog.supplierId],
    references: [supplier.id],
  }),
}));

export const boostingOrderRelations = relations(boostingOrder, ({ one }) => ({
  user: one(user, { fields: [boostingOrder.userId], references: [user.id] }),
  wallet: one(wallet, {
    fields: [boostingOrder.walletId],
    references: [wallet.id],
  }),
}));

export const schema = {
  account,
  session,
  admin,
  adminSession,
  adminSettings,
  user,
  verification,
  wallet,
  deposit,
  supplier,
  listing,
  order,
  transaction,
  supplierOrder,
  accountDelivery,
  webhookLog,
  boostingOrder,
};
