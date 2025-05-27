import { pgTable, text, serial, integer, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  totalExchanges: integer("total_exchanges").default(0).notNull(),
  accuracyImprovement: real("accuracy_improvement").default(0).notNull(),
  status: text("status").default("active").notNull(), // active, learning, completed
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  content: text("content").notNull(),
  translatedContent: text("translated_content"),
  isUser: boolean("is_user").notNull(),
  language: text("language").notNull(), // ko, en
  contextScore: real("context_score").default(0),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  feedbackScore: integer("feedback_score"), // 1 (negative) to 5 (positive)
  metadata: json("metadata"), // Additional context, confidence scores, etc.
});

export const learningMetrics = pgTable("learning_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  totalTranslations: integer("total_translations").default(0).notNull(),
  accuracyScore: real("accuracy_score").default(0).notNull(),
  contextAccuracy: real("context_accuracy").default(0).notNull(),
  learningRate: real("learning_rate").default(0).notNull(),
  positiveFeedback: integer("positive_feedback").default(0).notNull(),
  negativeFeedback: integer("negative_feedback").default(0).notNull(),
  improvementSuggestions: integer("improvement_suggestions").default(0).notNull(),
});

export const feedbackEntries = pgTable("feedback_entries", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  feedbackType: text("feedback_type").notNull(), // positive, negative, suggestion
  category: text("category"), // grammar, context, tone, technical, cultural
  suggestion: text("suggestion"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  applied: boolean("applied").default(false).notNull(),
});

export const learningPatterns = pgTable("learning_patterns", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  frequency: integer("frequency").default(1).notNull(),
  accuracy: real("accuracy").default(0).notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  category: text("category").notNull(), // business, casual, technical, formal
});

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbackEntries).omit({
  id: true,
  timestamp: true,
  applied: true,
});

export const insertLearningMetricsSchema = createInsertSchema(learningMetrics).omit({
  id: true,
  date: true,
});

// Types
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type LearningMetrics = typeof learningMetrics.$inferSelect;
export type FeedbackEntry = typeof feedbackEntries.$inferSelect;
export type LearningPattern = typeof learningPatterns.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type InsertLearningMetrics = z.infer<typeof insertLearningMetricsSchema>;
