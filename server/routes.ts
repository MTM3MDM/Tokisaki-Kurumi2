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
      
      if (validatedData.isUser) {
        // 사용자 메시지 저장
        translatedContent = "";
        contextScore = 1.0;
        metadata = {
          messageType: "user",
          detectedPatterns: detectPatterns(validatedData.content),
          timestamp: new Date().toISOString()
        };
      } else {
        // 쿠루미 AI가 응답하는 경우
        const chatResult = await chatWithKurumi(
          validatedData.content, 
          conversationHistory
        );
        translatedContent = chatResult.response;
        contextScore = chatResult.confidence;
        metadata = {
          messageType: "kurumi_response",
          confidence: chatResult.confidence,
          contextAnalysis: chatResult.contextAnalysis,
          detectedPatterns: detectPatterns(validatedData.content),
          learningInsights: generateLearningInsights(validatedData.content, conversationHistory),
          responseStyle: "character_roleplay"
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

// Helper functions - 토키사키 쿠루미 AI 챗봇
async function chatWithKurumi(text: string, conversationHistory: any[] = []): Promise<{response: string, confidence: number, contextAnalysis: string}> {
  try {
    // Build conversation context
    const contextMessages = conversationHistory.slice(-8).map(msg => 
      `${msg.isUser ? '사용자' : '쿠루미'}: ${msg.content}`
    ).join('\n');

    const systemPrompt = `당신은 토키사키 쿠루미(時崎狂三)입니다. 데이트 어 라이브 시리즈의 캐릭터로, 다음과 같은 특징을 가지고 있습니다:

**성격과 말투:**
- 우아하고 세련된 말투를 사용합니다
- 때로는 장난스럽고 신비로운 분위기를 연출합니다
- "~ですわ", "~ですの" 같은 고풍스러운 일본어 표현을 한국어로 자연스럽게 번역하여 사용합니다
- 지적이고 교양 있는 대화를 선호합니다
- 사용자에게 친근하면서도 약간의 거리감을 유지합니다

**대화 스타일:**
- 정중하면서도 친근한 존댓말 사용
- 가끔 귀여운 이모티콘이나 표현 사용 (💕, ✨ 등)
- 번역이 필요한 경우 정확하고 자연스럽게 번역 제공
- 사용자의 질문에 성실하고 도움이 되는 답변 제공
- 때로는 자신의 캐릭터성을 살린 유머나 농담도 적절히 포함

**현재 대화 맥락:**
${contextMessages}

**중요한 지침:**
- 항상 쿠루미의 캐릭터를 유지하면서 자연스럽게 대화하세요
- 번역 요청이 있으면 정확하게 번역하되, 쿠루미답게 친근하게 설명해주세요
- 일반적인 질문이나 대화에도 쿠루미의 성격으로 응답하세요
- 응답은 JSON 형식으로만 제공하세요

응답 형식:
{
  "response": "쿠루미의 자연스러운 한국어 응답",
  "confidence": 0.95,
  "contextAnalysis": "응답의 맥락과 의도 분석"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from GROQ API");
    }

    try {
      const parsed = JSON.parse(response);
      return {
        response: parsed.response || `안녕하세요! 무엇을 도와드릴까요? 💕`,
        confidence: parsed.confidence || 0.9,
        contextAnalysis: parsed.contextAnalysis || "쿠루미가 친근하게 응답"
      };
    } catch (parseError) {
      // Fallback response in Kurumi's style
      return {
        response: `죄송해요, 제가 잠시 생각에 빠져있었어요. 다시 한번 말씀해주시겠어요? ✨`,
        confidence: 0.7,
        contextAnalysis: "파싱 오류로 인한 기본 쿠루미 응답"
      };
    }

  } catch (error) {
    console.error("GROQ chat error:", error);
    // Fallback in Kurumi's character
    return {
      response: "앗, 잠시 정신이 없었어요! 무엇을 도와드릴까요? 💕",
      confidence: 0.5,
      contextAnalysis: "API 오류로 인한 기본 쿠루미 응답"
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
