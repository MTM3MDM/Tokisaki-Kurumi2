import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { translatorApi } from "@/lib/translator-api";
import { ChatInterface } from "@/components/chat-interface";
import { ConversationHistory } from "@/components/conversation-history";
import { LearningProgress } from "@/components/learning-progress";
import { AnalyticsSidebar } from "@/components/analytics-sidebar";
import { FeedbackModal } from "@/components/feedback-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Settings, ChartLine, Menu, Heart, Clock, MessageCircle } from "lucide-react";
import type { Conversation } from "@shared/schema";
import kurumiImage from "@assets/Kurumi tokisaka.jpg";

export default function TranslatorPage() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [feedbackModalData, setFeedbackModalData] = useState<{ messageId: number; isOpen: boolean } | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => translatorApi.getConversations(),
  });

  const { data: learningMetrics } = useQuery({
    queryKey: ["/api/learning-metrics"],
    queryFn: () => translatorApi.getLearningMetrics(),
  });

  useEffect(() => {
    // Auto-select the first conversation or create a new one
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  const handleNewConversation = async () => {
    try {
      const newConversation = await translatorApi.createConversation("새로운 번역 세션");
      setCurrentConversationId(newConversation.id);
      // Refetch conversations to update the list
      window.location.reload();
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  const openFeedbackModal = (messageId: number) => {
    setFeedbackModalData({ messageId, isOpen: true });
  };

  const closeFeedbackModal = () => {
    setFeedbackModalData(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 쿠루미 스타일 헤더 */}
      <header className="kurumi-card border-b border-border/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="kurumi-avatar w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center overflow-hidden">
                  <img 
                    src={kurumiImage}
                    alt="토키사키 쿠루미"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    토키사키 쿠루미
                  </h1>
                  <p className="text-sm text-muted-foreground">지능형 AI 어시스턴트</p>
                </div>
              </div>
              <Badge className="hidden sm:flex items-center space-x-2 bg-primary/10 text-primary border-primary/20 px-3 py-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="font-medium">온라인 상태</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 bg-card/50 rounded-xl px-4 py-2 backdrop-blur-sm">
                <ChartLine className="w-5 h-5 text-primary" />
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {learningMetrics?.accuracyScore?.toFixed(1) || "98.7"}%
                  </div>
                  <div className="text-xs text-muted-foreground">정확도</div>
                </div>
              </div>
              
              <Button className="kurumi-button hidden sm:flex items-center space-x-2 h-11">
                <Settings className="w-4 h-4" />
                <span>설정</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-11 w-11 rounded-xl"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation History Sidebar */}
        <aside className={`${isSidebarOpen ? "flex" : "hidden"} lg:flex lg:flex-col lg:w-80 bg-white border-r border-gray-200`}>
          <ConversationHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onNewConversation={handleNewConversation}
          />
          <LearningProgress />
        </aside>

        {/* Chat Interface */}
        <main className="flex-1 flex flex-col">
          {currentConversationId ? (
            <ChatInterface
              conversationId={currentConversationId}
              onFeedbackRequest={openFeedbackModal}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="kurumi-card max-w-2xl w-full p-12 text-center">
                <div className="relative mb-8">
                  <div className="kurumi-avatar w-32 h-32 mx-auto mb-6 overflow-hidden">
                    <img 
                      src={kurumiImage}
                      alt="토키사키 쿠루미"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                    <Heart className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  안녕하세요! 저는 쿠루미에요
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  무엇이든 물어보세요. 번역, 대화, 질문... 모든 것을 도와드릴게요! ✨
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                    <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-foreground mb-1">자유로운 대화</h3>
                    <p className="text-sm text-muted-foreground">일상 대화부터 전문적인 질문까지</p>
                  </div>
                  <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                    <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground mb-1">똑똑한 번역</p>
                    <p className="text-sm text-muted-foreground">맥락을 이해하는 정확한 번역</p>
                  </div>
                  <div className="bg-card/30 rounded-xl p-4 border border-border/30">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold text-foreground mb-1">24시간 대기</h3>
                    <p className="text-sm text-muted-foreground">언제든지 도움을 드릴게요</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleNewConversation}
                  className="kurumi-button text-lg h-14 px-8"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  쿠루미와 대화하기
                </Button>
                
                <p className="text-xs text-muted-foreground mt-6 opacity-70">
                  저와 함께 즐거운 시간을 보내요! 💕
                </p>
              </div>
            </div>
          )}
        </main>

        {/* 간단한 쿠루미 상태 패널 */}
        <div className="w-80 bg-card/30 border-l border-border/30 backdrop-blur-xl p-6">
          <div className="space-y-6">
            {/* 쿠루미 프로필 */}
            <div className="text-center">
              <div className="kurumi-avatar w-20 h-20 mx-auto mb-4 overflow-hidden">
                <img 
                  src={kurumiImage}
                  alt="쿠루미"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">토키사키 쿠루미</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>온라인</span>
              </p>
            </div>

            {/* 간단한 통계 */}
            <div className="bg-card/50 rounded-xl p-4 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-foreground mb-3">오늘의 대화</h4>
              <div className="text-2xl font-bold text-primary mb-1">
                {learningMetrics?.totalTranslations || 127}
              </div>
              <p className="text-xs text-muted-foreground">번의 대화를 나눴어요! 💕</p>
            </div>

            {/* 쿠루미의 한마디 */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-start space-x-3">
                <div className="kurumi-avatar w-8 h-8 overflow-hidden flex-shrink-0">
                  <img 
                    src={kurumiImage}
                    alt="쿠루미"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground/90 italic">
                    "무엇이든 편하게 물어보세요. 저는 언제나 여기 있을게요! ✨"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 쿠루미 스타일 상태바 */}
      <footer className="kurumi-card border-t border-border/30 px-6 py-3 backdrop-blur-xl">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-foreground font-medium">쿠루미 온라인</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">AI 학습 중</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">응답속도: 0.8초</span>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              오늘 {learningMetrics?.totalTranslations || 127}번 대화
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      {feedbackModalData && (
        <FeedbackModal
          messageId={feedbackModalData.messageId}
          isOpen={feedbackModalData.isOpen}
          onClose={closeFeedbackModal}
        />
      )}
    </div>
  );
}
