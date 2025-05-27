import { useQuery } from "@tanstack/react-query";
import { translatorApi } from "@/lib/translator-api";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Brain } from "lucide-react";

export function LearningProgress() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/learning-metrics"],
    queryFn: () => translatorApi.getLearningMetrics(),
  });

  if (!metrics) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const accuracyPercentage = Math.min(100, metrics.accuracyScore);
  const contextPercentage = Math.min(100, metrics.contextAccuracy);
  const learningRatePercentage = Math.min(100, (metrics.learningRate / 5) * 100); // Assuming max 5% learning rate

  return (
    <div className="p-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Learning Progress</h3>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Translation Accuracy</span>
            <span>{accuracyPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={accuracyPercentage} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Context Understanding</span>
            <span>{contextPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={contextPercentage} className="h-2 [&>div]:bg-blue-500" />
        </div>
        
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Learning Rate</span>
            <span>+{metrics.learningRate.toFixed(1)}%/week</span>
          </div>
          <Progress value={learningRatePercentage} className="h-2 [&>div]:bg-purple-500" />
        </div>
      </div>
      
      <Card className="mt-4 bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Learning Insight</span>
          </div>
          <p className="text-xs text-blue-800">
            {accuracyPercentage > 95 
              ? "Excellent accuracy achieved! Focus on context refinement."
              : accuracyPercentage > 90
              ? `Improving steadily. ${(95 - accuracyPercentage).toFixed(1)}% to reach excellence.`
              : "Active learning phase. Accuracy improving with each interaction."
            }
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline" className="text-xs bg-white border-blue-300">
              <Brain className="w-3 h-3 mr-1" />
              {metrics.totalTranslations} learned
            </Badge>
            <Badge variant="outline" className="text-xs bg-white border-green-300">
              <TrendingUp className="w-3 h-3 mr-1" />
              {((metrics.positiveFeedback / (metrics.positiveFeedback + metrics.negativeFeedback)) * 100).toFixed(0)}% positive
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
