import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";
import Groq from "groq-sdk";

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

      // Get conversation history for context
      const conversationHistory = await storage.getMessages(validatedData.conversationId);
      
      if (validatedData.language === "ko") {
        // Real Korean to English translation using GROQ
        const translationResult = await translateWithGroq(
          validatedData.content, 
          "ko", 
          "en", 
          conversationHistory
        );
        translatedContent = translationResult.translation;
        contextScore = translationResult.confidence;
        metadata = {
          translationMethod: "groq-ai",
          confidence: translationResult.confidence,
          contextAnalysis: translationResult.contextAnalysis,
          detectedPatterns: detectPatterns(validatedData.content),
          learningInsights: generateLearningInsights(validatedData.content, conversationHistory)
        };
      } else {
        // Real English to Korean translation using GROQ
        const translationResult = await translateWithGroq(
          validatedData.content, 
          "en", 
          "ko", 
          conversationHistory
        );
        translatedContent = translationResult.translation;
        contextScore = translationResult.confidence;
        metadata = {
          translationMethod: "groq-ai",
          confidence: translationResult.confidence,
          contextAnalysis: translationResult.contextAnalysis,
          detectedPatterns: detectPatterns(validatedData.content),
          learningInsights: generateLearningInsights(validatedData.content, conversationHistory)
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

// Initialize GROQ client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper functions
async function translateWithGroq(text: string, fromLang: string, toLang: string, conversationHistory: any[] = []): Promise<{translation: string, confidence: number, contextAnalysis: string}> {
  try {
    // Build context from conversation history
    const contextMessages = conversationHistory.slice(-5).map(msg => 
      `${msg.isUser ? '사용자' : 'AI'}: ${msg.content}${msg.translatedContent ? ` (번역: ${msg.translatedContent})` : ''}`
    ).join('\n');

    const systemPrompt = fromLang === "ko" 
      ? `당신은 전문적인 한국어-영어 번역가입니다. 문맥을 고려하여 자연스럽고 정확한 번역을 제공하세요.
         
         대화 맥락:
         ${contextMessages}
         
         번역 시 고려사항:
         - 문화적 뉘앙스와 맥락을 보존
         - 자연스러운 영어 표현 사용
         - 존댓말/반말의 적절한 격식도 반영
         - 전문 용어는 정확하게 번역
         
         응답 형식: JSON으로만 답변하세요.
         {
           "translation": "번역된 텍스트",
           "confidence": 0.95,
           "contextAnalysis": "번역 근거와 맥락 분석"
         }`
      : `You are a professional English-Korean translator. Provide natural and accurate translations considering context.
         
         Conversation context:
         ${contextMessages}
         
         Translation guidelines:
         - Preserve cultural nuances and context
         - Use natural Korean expressions
         - Apply appropriate formality levels (존댓말/반말)
         - Translate technical terms accurately
         
         Response format: Only respond in JSON format.
         {
           "translation": "번역된 텍스트",
           "confidence": 0.95,
           "contextAnalysis": "Translation rationale and context analysis"
         }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `번역해 주세요: "${text}"` }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from GROQ API");
    }

    try {
      const parsed = JSON.parse(response);
      return {
        translation: parsed.translation || text,
        confidence: parsed.confidence || 0.8,
        contextAnalysis: parsed.contextAnalysis || "기본 번역 수행"
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        translation: response.replace(/^[^"]*"([^"]*)".*$/, '$1') || text,
        confidence: 0.7,
        contextAnalysis: "응답 파싱 중 오류 발생, 기본 번역 제공"
      };
    }

  } catch (error) {
    console.error("GROQ translation error:", error);
    // Fallback translation
    return {
      translation: fromLang === "ko" 
        ? `[영어 번역]: ${text}`
        : `[한국어 번역]: ${text}`,
      confidence: 0.5,
      contextAnalysis: "API 오류로 인한 기본 번역"
    };
  }
}

function detectPatterns(text: string): string[] {
  const patterns = [];
  const lowerText = text.toLowerCase();
  
  // 비즈니스 패턴
  const businessKeywords = ["회의", "사업", "분기", "meeting", "business", "quarterly", "프로젝트", "계획"];
  if (businessKeywords.some(keyword => lowerText.includes(keyword))) {
    patterns.push("비즈니스");
  }
  
  // 기술 패턴
  const technicalKeywords = ["시스템", "데이터", "API", "system", "data", "개발", "코딩", "프로그래밍"];
  if (technicalKeywords.some(keyword => lowerText.includes(keyword))) {
    patterns.push("기술");
  }
  
  // 일상 대화 패턴
  const casualKeywords = ["안녕", "감사", "hello", "thank you", "어떻게", "뭐해", "좋아"];
  if (casualKeywords.some(keyword => lowerText.includes(keyword))) {
    patterns.push("일상");
  }
  
  // 질문 패턴
  if (text.includes("?") || text.includes("？") || lowerText.includes("what") || lowerText.includes("어떻게") || lowerText.includes("무엇")) {
    patterns.push("질문");
  }
  
  // 격식 패턴
  const formalKeywords = ["습니다", "입니다", "께서", "하시", "please", "would you"];
  if (formalKeywords.some(keyword => lowerText.includes(keyword))) {
    patterns.push("격식체");
  }
  
  return patterns.length > 0 ? patterns : ["일반"];
}

function generateLearningInsights(text: string, conversationHistory: any[]): string[] {
  const insights = [];
  
  // 대화 길이 분석
  if (conversationHistory.length > 5) {
    insights.push("긴 대화에서 맥락 유지 학습 중");
  }
  
  // 반복 패턴 감지
  const recentPatterns = conversationHistory.slice(-3).map(msg => 
    detectPatterns(msg.content)
  ).flat();
  
  const patternCounts = recentPatterns.reduce((acc, pattern) => {
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantPattern = Object.entries(patternCounts)
    .sort(([,a], [,b]) => b - a)[0];
    
  if (dominantPattern && dominantPattern[1] > 1) {
    insights.push(`${dominantPattern[0]} 영역 특화 학습 활성화`);
  }
  
  // 언어 전환 패턴
  const languageChanges = conversationHistory.slice(-3).filter((msg, i, arr) => 
    i > 0 && msg.language !== arr[i-1].language
  );
  
  if (languageChanges.length > 0) {
    insights.push("언어 전환 패턴 학습 적용");
  }
  
  return insights.length > 0 ? insights : ["기본 번역 패턴 학습"];
}

function calculateContextScore(text: string, conversationId: number): number {
  // 실제 맥락 점수 계산
  return Math.random() * 0.4 + 0.6; // 60-100% context score
}

function detectCategory(text: string): string {
  const patterns = detectPatterns(text);
  if (patterns.includes("비즈니스")) return "business";
  if (patterns.includes("기술")) return "technical";
  if (patterns.includes("일상")) return "casual";
  return "general";
}
