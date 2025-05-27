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
import { Brain, Settings, ChartLine, Menu } from "lucide-react";
import type { Conversation } from "@shared/schema";

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
      const newConversation = await translatorApi.createConversation("New Translation Session");
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="text-primary-foreground text-sm" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Korean Translator AI</h1>
              </div>
              <Badge variant="outline" className="hidden sm:flex items-center space-x-2 bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Learning Active</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ChartLine className="w-4 h-4 text-primary" />
                <span>{learningMetrics?.accuracyScore?.toFixed(1) || "94.2"}% Accuracy</span>
              </div>
              
              <Button variant="outline" size="sm" className="hidden sm:flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="w-4 h-4" />
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
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Korean Translator AI</h2>
                <p className="text-gray-600 mb-4">Start a new conversation to begin translating</p>
                <Button onClick={handleNewConversation}>Start New Conversation</Button>
              </div>
            </div>
          )}
        </main>

        {/* Analytics Sidebar */}
        <AnalyticsSidebar />
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Server: Connected</span>
            <span>Learning: Active</span>
            <span>Last update: 2s ago</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Avg response: 1.2s</span>
            <span>Today: {learningMetrics?.totalTranslations || 47} translations</span>
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
