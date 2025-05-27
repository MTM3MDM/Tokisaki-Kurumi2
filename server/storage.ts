import { 
  conversations, 
  messages, 
  learningMetrics, 
  feedbackEntries, 
  learningPatterns,
  type Conversation, 
  type Message, 
  type LearningMetrics, 
  type FeedbackEntry,
  type LearningPattern,
  type InsertConversation, 
  type InsertMessage, 
  type InsertFeedback,
  type InsertLearningMetrics
} from "@shared/schema";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined>;
  
  // Learning Metrics
  getLearningMetrics(): Promise<LearningMetrics | undefined>;
  updateLearningMetrics(metrics: InsertLearningMetrics): Promise<LearningMetrics>;
  
  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<FeedbackEntry>;
  getFeedbackByMessage(messageId: number): Promise<FeedbackEntry[]>;
  
  // Learning Patterns
  getLearningPatterns(): Promise<LearningPattern[]>;
  updateLearningPattern(pattern: string, category: string, accuracy: number): Promise<LearningPattern>;
}

export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private learningMetrics: LearningMetrics;
  private feedbackEntries: Map<number, FeedbackEntry>;
  private learningPatterns: Map<string, LearningPattern>;
  private currentConversationId: number;
  private currentMessageId: number;
  private currentFeedbackId: number;
  private currentPatternId: number;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.feedbackEntries = new Map();
    this.learningPatterns = new Map();
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    this.currentFeedbackId = 1;
    this.currentPatternId = 1;
    
    // Initialize with baseline learning metrics
    this.learningMetrics = {
      id: 1,
      date: new Date(),
      totalTranslations: 1247,
      accuracyScore: 94.2,
      contextAccuracy: 87.8,
      learningRate: 2.3,
      positiveFeedback: 89,
      negativeFeedback: 11,
      improvementSuggestions: 12,
    };
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: this.currentConversationId++,
      ...insertConversation,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.currentMessageId++,
      ...insertMessage,
      timestamp: new Date(),
    };
    this.messages.set(message.id, message);
    
    // Update conversation exchange count
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      await this.updateConversation(conversation.id, {
        totalExchanges: conversation.totalExchanges + 1,
      });
    }
    
    return message;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updates };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async getLearningMetrics(): Promise<LearningMetrics | undefined> {
    return this.learningMetrics;
  }

  async updateLearningMetrics(metrics: InsertLearningMetrics): Promise<LearningMetrics> {
    this.learningMetrics = {
      ...this.learningMetrics,
      ...metrics,
      date: new Date(),
    };
    return this.learningMetrics;
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<FeedbackEntry> {
    const feedback: FeedbackEntry = {
      id: this.currentFeedbackId++,
      ...insertFeedback,
      timestamp: new Date(),
      applied: false,
    };
    this.feedbackEntries.set(feedback.id, feedback);
    
    // Update learning metrics based on feedback
    const currentMetrics = this.learningMetrics;
    if (insertFeedback.feedbackType === 'positive') {
      await this.updateLearningMetrics({
        positiveFeedback: currentMetrics.positiveFeedback + 1,
      });
    } else if (insertFeedback.feedbackType === 'negative') {
      await this.updateLearningMetrics({
        negativeFeedback: currentMetrics.negativeFeedback + 1,
      });
    } else if (insertFeedback.feedbackType === 'suggestion') {
      await this.updateLearningMetrics({
        improvementSuggestions: currentMetrics.improvementSuggestions + 1,
      });
    }
    
    return feedback;
  }

  async getFeedbackByMessage(messageId: number): Promise<FeedbackEntry[]> {
    return Array.from(this.feedbackEntries.values())
      .filter(feedback => feedback.messageId === messageId);
  }

  async getLearningPatterns(): Promise<LearningPattern[]> {
    return Array.from(this.learningPatterns.values());
  }

  async updateLearningPattern(pattern: string, category: string, accuracy: number): Promise<LearningPattern> {
    const key = `${pattern}-${category}`;
    const existing = this.learningPatterns.get(key);
    
    if (existing) {
      const updated = {
        ...existing,
        frequency: existing.frequency + 1,
        accuracy: (existing.accuracy + accuracy) / 2, // Average accuracy
        lastSeen: new Date(),
      };
      this.learningPatterns.set(key, updated);
      return updated;
    } else {
      const newPattern: LearningPattern = {
        id: this.currentPatternId++,
        pattern,
        category,
        frequency: 1,
        accuracy,
        lastSeen: new Date(),
      };
      this.learningPatterns.set(key, newPattern);
      return newPattern;
    }
  }
}

export const storage = new MemStorage();
