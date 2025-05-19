import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Basic user model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID
  username: text("username").notNull(),
  phoneNumber: text("phone_number").notNull(),
  photoURL: text("photo_url"),
  rating: integer("rating").default(0),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Package model
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid),
  from: text("from").notNull(),
  to: text("to").notNull(),
  deadline: text("deadline").notNull(),
  size: text("size").notNull(), // small, medium, large
  price: integer("price").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"), // pending, matched, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Trip model
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.uid),
  from: text("from").notNull(),
  to: text("to").notNull(),
  date: text("date").notNull(),
  capacity: integer("capacity").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Match model (connects packages with trips)
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => packages.id),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  status: text("status").notNull().default("pending"), // pending, accepted, completed
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat room model
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  participants: jsonb("participants").notNull(), // Array of user IDs
  packageId: integer("package_id").references(() => packages.id),
  tripId: integer("trip_id").references(() => trips.id),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message model
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"), // text, location, quickAction
  read: boolean("read").notNull().default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Review model
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  receiverId: text("receiver_id").notNull(),
  packageId: integer("package_id").references(() => packages.id),
  tripId: integer("trip_id").references(() => trips.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema insert types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  rating: true,
  reviewCount: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
  lastMessage: true,
  lastMessageTime: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
  read: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Review = typeof reviews.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
