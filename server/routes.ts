import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get a specific conversation
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Create a new message
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Simulate translation processing
      let translatedContent = "";
      let contextScore = 0;
      let metadata = {};

      if (validatedData.language === "ko") {
        // Simulate Korean to English translation
        translatedContent = await simulateTranslation(validatedData.content, "ko", "en");
        contextScore = calculateContextScore(validatedData.content, validatedData.conversationId);
        metadata = {
          translationMethod: "adaptive",
          confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
          detectedPatterns: ["business", "formal"],
        };
      } else {
        // Simulate English to Korean translation
        translatedContent = await simulateTranslation(validatedData.content, "en", "ko");
        contextScore = calculateContextScore(validatedData.content, validatedData.conversationId);
        metadata = {
          translationMethod: "adaptive",
          confidence: Math.random() * 0.3 + 0.7,
          detectedPatterns: ["casual", "inquiry"],
        };
      }

      const message = await storage.createMessage({
        ...validatedData,
        translatedContent,
        contextScore,
        metadata,
      });

      // Update learning metrics
      const currentMetrics = await storage.getLearningMetrics();
      if (currentMetrics) {
        await storage.updateLearningMetrics({
          totalTranslations: currentMetrics.totalTranslations + 1,
          accuracyScore: Math.min(100, currentMetrics.accuracyScore + Math.random() * 0.5),
        });
      }

      // Update learning patterns
      const category = detectCategory(validatedData.content);
      await storage.updateLearningPattern(validatedData.content.substring(0, 20), category, contextScore);

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Submit feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const validatedData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(validatedData);

      // Update message feedback score
      if (validatedData.feedbackType === "positive") {
        await storage.updateMessage(validatedData.messageId, { feedbackScore: 5 });
      } else if (validatedData.feedbackType === "negative") {
        await storage.updateMessage(validatedData.messageId, { feedbackScore: 1 });
      }

      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Get learning metrics
  app.get("/api/learning-metrics", async (req, res) => {
    try {
      const metrics = await storage.getLearningMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning metrics" });
    }
  });

  // Get learning patterns
  app.get("/api/learning-patterns", async (req, res) => {
    try {
      const patterns = await storage.getLearningPatterns();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch learning patterns" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
async function simulateTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
  // In a real implementation, this would call a translation API
  // For now, we'll return a simulated translation
  
  const translations: Record<string, string> = {
    "안녕하세요": "Hello",
    "안녕하세요, 오늘 회의 자료를 번역해 주실 수 있나요?": "Hello, can you please translate today's meeting materials?",
    "Perfect! Here's the document I need translated for our quarterly business review.": "완벽합니다! 분기별 사업 검토를 위해 번역이 필요한 문서입니다.",
    "Thank you for your help with the translation.": "번역을 도와주셔서 감사합니다.",
    "How is the translation quality improving?": "번역 품질이 어떻게 개선되고 있나요?",
  };

  // Try exact match first
  if (translations[text]) {
    return translations[text];
  }

  // Simple fallback for demonstration
  if (fromLang === "ko") {
    return `[Translated to English]: ${text}`;
  } else {
    return `[한국어로 번역됨]: ${text}`;
  }
}

function calculateContextScore(text: string, conversationId: number): number {
  // Simulate context score calculation based on conversation history
  // In a real implementation, this would analyze the conversation context
  return Math.random() * 0.4 + 0.6; // 60-100% context score
}

function detectCategory(text: string): string {
  // Simple pattern detection for categorization
  const businessKeywords = ["회의", "사업", "분기", "meeting", "business", "quarterly"];
  const casualKeywords = ["안녕", "감사", "hello", "thank you"];
  const technicalKeywords = ["시스템", "데이터", "API", "system", "data"];

  const lowerText = text.toLowerCase();
  
  if (businessKeywords.some(keyword => lowerText.includes(keyword))) {
    return "business";
  } else if (technicalKeywords.some(keyword => lowerText.includes(keyword))) {
    return "technical";
  } else if (casualKeywords.some(keyword => lowerText.includes(keyword))) {
    return "casual";
  } else {
    return "general";
  }
}
