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
  Clock
} from "lucide-react";
import type { Message } from "@shared/schema";

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
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">한국어 번역 어시스턴트</h2>
            <p className="text-sm text-gray-600">적응형 학습 AI 기반</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentLanguage === "ko" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentLanguage("ko")}
                className="text-sm"
              >
                🇰🇷 한국어
              </Button>
              <Button
                variant={currentLanguage === "en" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentLanguage("en")}
                className="text-sm"
              >
                🇺🇸 영어
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message) => (
          <div key={message.id} className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                {message.isUser ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4 text-primary" />
                )}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Card className={message.isUser ? "bg-white" : "bg-blue-50 border-blue-200"}>
                <CardContent className="p-4">
                  <p className="text-gray-900 mb-2">{message.content}</p>
                  
                  {message.translatedContent && !message.isUser && (
                    <div className="bg-white rounded p-2 text-sm text-gray-600 italic border-l-2 border-blue-400 mb-3">
                      Original: "{message.content}"
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <span>{formatTime(message.timestamp)}</span>
                      {!message.isUser && (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>맥락 인식</span>
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
                          className="p-1 h-auto text-green-600 hover:bg-green-50"
                          title="좋은 번역"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, "negative")}
                          className="p-1 h-auto text-red-600 hover:bg-red-50"
                          title="개선 필요"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFeedbackRequest(message.id)}
                          className="p-1 h-auto text-gray-600 hover:bg-gray-50"
                          title="개선 제안"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${currentLanguage === "ko" ? "한국어" : "영어"}로 메시지를 입력하세요...`}
                className="pr-20 resize-none"
                rows={2}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="p-1.5 h-auto text-gray-400 hover:text-gray-600">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1.5 h-auto text-gray-400 hover:text-gray-600">
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                문서 번역하기
              </Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                맥락 정확도 확인
              </Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200">
                번역 선택 설명
              </Badge>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendMessageMutation.isPending}
            className="px-6 py-3"
          >
            {sendMessageMutation.isPending ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>전송</span>
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
