import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { LocalizedText } from "@vendelia/shared";

/** Cities the marketplace operates in (launch: Helsinki region). */
export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  abbr: text("abbr").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  icon: text("icon").notNull(),
  sort: integer("sort").notNull().default(0),
});

/** Key/value platform settings editable by admins (e.g. commission rate). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
