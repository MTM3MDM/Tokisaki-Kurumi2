import { apiRequest } from "./queryClient";
import type { Conversation, Message, FeedbackEntry, LearningMetrics } from "@shared/schema";

export const translatorApi = {
  // Conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiRequest("GET", "/api/conversations");
    return response.json();
  },

  getConversation: async (id: number): Promise<Conversation> => {
    const response = await apiRequest("GET", `/api/conversations/${id}`);
    return response.json();
  },

  createConversation: async (title: string): Promise<Conversation> => {
    const response = await apiRequest("POST", "/api/conversations", {
      title,
      totalExchanges: 0,
      accuracyImprovement: 0,
      status: "active",
    });
    return response.json();
  },

  // Messages
  getMessages: async (conversationId: number): Promise<Message[]> => {
    const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
    return response.json();
  },

  sendMessage: async (
    conversationId: number,
    content: string,
    language: string,
    isUser: boolean = true
  ): Promise<Message> => {
    const response = await apiRequest("POST", "/api/messages", {
      conversationId,
      content,
      language,
      isUser,
      contextScore: 0,
    });
    return response.json();
  },

  // Feedback
  submitFeedback: async (
    messageId: number,
    feedbackType: "positive" | "negative" | "suggestion",
    category?: string,
    suggestion?: string
  ): Promise<FeedbackEntry> => {
    const response = await apiRequest("POST", "/api/feedback", {
      messageId,
      feedbackType,
      category,
      suggestion,
    });
    return response.json();
  },

  // Learning metrics
  getLearningMetrics: async (): Promise<LearningMetrics> => {
    const response = await apiRequest("GET", "/api/learning-metrics");
    return response.json();
  },

  // Learning patterns
  getLearningPatterns: async () => {
    const response = await apiRequest("GET", "/api/learning-patterns");
    return response.json();
  },
};
