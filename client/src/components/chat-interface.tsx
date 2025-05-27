import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { translatorApi } from "@/lib/translator-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  Send, 
  Paperclip, 
  Mic,
  Brain,
  CheckCircle,
  Clock,
  Heart,
  Sparkles,
  MessageCircle
} from "lucide-react";
import type { Message } from "@shared/schema";
import kurumiImage from "@assets/Kurumi tokisaka.jpg";

interface ChatInterfaceProps {
  conversationId: number;
  onFeedbackRequest: (messageId: number) => void;
}

export function ChatInterface({ conversationId, onFeedbackRequest }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState<"ko" | "en">("ko");
  const [isTranslating, setIsTranslating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: () => translatorApi.getMessages(conversationId),
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ content, language }: { content: string; language: string }) =>
      translatorApi.sendMessage(conversationId, content, language, true),
    onSuccess: async (userMessage) => {
      // Invalidate messages to show the user message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Start translation simulation
      setIsTranslating(true);
      
      // Simulate AI response delay
      setTimeout(async () => {
        try {
          // Create AI response message
          const aiResponse = await translatorApi.sendMessage(
            conversationId,
            userMessage.translatedContent || "Translation in progress...",
            currentLanguage === "ko" ? "en" : "ko",
            false
          );
          
          setIsTranslating(false);
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/learning-metrics"] });
          
          toast({
            title: "Translation completed",
            description: "AI has processed your message with context awareness.",
          });
        } catch (error) {
          setIsTranslating(false);
          toast({
            title: "Translation failed",
            description: "Failed to generate AI response. Please try again.",
            variant: "destructive",
          });
        }
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, type }: { messageId: number; type: "positive" | "negative" }) =>
      translatorApi.submitFeedback(messageId, type),
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping improve the translation quality.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-metrics"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    sendMessageMutation.mutate({
      content: inputMessage,
      language: currentLanguage,
    });

    setInputMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = (messageId: number, type: "positive" | "negative") => {
    feedbackMutation.mutate({ messageId, type });
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 쿠루미 채팅 헤더 */}
      <div className="kurumi-card border-b border-border/30 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="kurumi-avatar w-10 h-10 overflow-hidden">
              <img 
                src={kurumiImage}
                alt="쿠루미"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                쿠루미와의 대화
              </h2>
              <p className="text-sm text-muted-foreground flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>지금 온라인이에요! 무엇이든 물어보세요 💕</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-card/50 rounded-xl p-2 backdrop-blur-sm">
              <div className="flex space-x-1">
                <Button
                  variant={currentLanguage === "ko" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentLanguage("ko")}
                  className={`text-sm px-3 py-1.5 rounded-lg ${currentLanguage === "ko" ? "kurumi-button" : ""}`}
                >
                  🇰🇷 한국어
                </Button>
                <Button
                  variant={currentLanguage === "en" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentLanguage("en")}
                  className={`text-sm px-3 py-1.5 rounded-lg ${currentLanguage === "en" ? "kurumi-button" : ""}`}
                >
                  🇺🇸 English
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message) => (
          <div key={message.id} className={`flex items-start space-x-4 ${message.isUser ? 'justify-end' : ''}`}>
            {!message.isUser && (
              <div className="kurumi-avatar w-8 h-8 overflow-hidden flex-shrink-0">
                <img 
                  src={kurumiImage}
                  alt="쿠루미"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className={`max-w-[70%] ${message.isUser ? 'order-first' : ''}`}>
              <div className={`${message.isUser ? 'message-bubble-user ml-auto' : 'message-bubble-ai'} relative`}>
                {!message.isUser && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-semibold text-primary-foreground">쿠루미</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-white/20 text-white border-white/30">
                      AI
                    </Badge>
                  </div>
                )}
                
                <p className={`${message.isUser ? 'text-foreground' : 'text-primary-foreground'} mb-3 leading-relaxed`}>
                  {message.content}
                </p>
                
                {message.translatedContent && !message.isUser && (
                  <div className="bg-white/10 rounded-lg p-3 text-sm text-white/90 italic border-l-4 border-white/30 mb-3 backdrop-blur-sm">
                    <span className="text-white/70 text-xs block mb-1">번역된 내용:</span>
                    "{message.translatedContent}"
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className={`text-xs flex items-center space-x-2 ${message.isUser ? 'text-muted-foreground' : 'text-white/70'}`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {!message.isUser && (
                      <>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AI 응답</span>
                        </span>
                        {message.contextScore && (
                          <>
                            <span>•</span>
                            <span>{Math.round(message.contextScore * 100)}% 신뢰도</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {!message.isUser && (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(message.id, "positive")}
                        className="p-1.5 h-auto text-white/80 hover:bg-white/20 rounded-lg"
                        title="좋아요"
                      >
                        <Heart className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(message.id, "negative")}
                        className="p-1.5 h-auto text-white/80 hover:bg-white/20 rounded-lg"
                        title="개선 필요"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFeedbackRequest(message.id)}
                        className="p-1.5 h-auto text-white/80 hover:bg-white/20 rounded-lg"
                        title="피드백"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {message.isUser && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-muted">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {/* Translation Progress */}
        {isTranslating && (
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                <Bot className="w-4 h-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">메시지 번역 중...</span>
                      <span className="text-sm text-gray-600">처리 중</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <div className="mt-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>맥락과 패턴 분석 중</span>
                        <span>예상 시간: 2초</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded p-3 border-l-4 border-green-400">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">학습 진행 중</span>
                    </div>
                    <p className="text-xs text-green-700">
                      대화 패턴에 적응 중입니다. 이번 세션에서 정확도가 0.3% 향상되었습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 쿠루미 스타일 입력 영역 */}
      <div className="kurumi-card border-t border-border/30 p-6 backdrop-blur-xl">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`쿠루미에게 ${currentLanguage === "ko" ? "한국어" : "영어"}로 메시지를 보내보세요... 💕`}
                className="bg-card/50 border-border/50 rounded-xl pr-20 resize-none backdrop-blur-sm focus:bg-card/80 transition-all duration-300 text-foreground placeholder:text-muted-foreground/70"
                rows={3}
              />
              
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 h-auto text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 h-auto text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-all duration-200 bg-card/50 border-border/50 backdrop-blur-sm"
              >
                💬 자유롭게 대화하기
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-all duration-200 bg-card/50 border-border/50 backdrop-blur-sm"
              >
                🌍 번역 도움 요청
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-all duration-200 bg-card/50 border-border/50 backdrop-blur-sm"
              >
                ❓ 질문하기
              </Badge>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendMessageMutation.isPending}
            className="kurumi-button h-12 px-6 flex items-center space-x-2"
          >
            {sendMessageMutation.isPending ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>전송 중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>전송</span>
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/60 flex items-center space-x-2">
            <Heart className="w-3 h-3 text-primary" />
            <span>쿠루미가 정성껏 답변해드릴게요!</span>
          </p>
        </div>
      </div>
    </>
  );
}
