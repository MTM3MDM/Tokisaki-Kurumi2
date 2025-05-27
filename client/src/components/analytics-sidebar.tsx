import { useQuery } from "@tanstack/react-query";
import { translatorApi } from "@/lib/translator-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Download, 
  Sliders, 
  RefreshCw, 
  TrendingUp, 
  Target, 
  Lightbulb,
  AlertTriangle
} from "lucide-react";

export function AnalyticsSidebar() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/learning-metrics"],
    queryFn: () => translatorApi.getLearningMetrics(),
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ["/api/learning-patterns"],
    queryFn: () => translatorApi.getLearningPatterns(),
  });

  if (!metrics) {
    return (
      <aside className="hidden xl:flex xl:flex-col xl:w-80 bg-white border-l border-gray-200">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </aside>
    );
  }

  const positiveFeedbackRate = Math.round(
    (metrics.positiveFeedback / (metrics.positiveFeedback + metrics.negativeFeedback)) * 100
  );

  const topPatterns = patterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-80 bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Analytics & Learning</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Performance Metrics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Performance Metrics</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-green-700">
                  {metrics.totalTranslations.toLocaleString()}
                </div>
                <div className="text-xs text-green-600">Total Translations</div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-blue-700">
                  +{metrics.learningRate.toFixed(1)}%
                </div>
                <div className="text-xs text-blue-600">This Month</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Accuracy Trend Chart */}
          <Card className="bg-gray-50">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Accuracy Trend</span>
                <span className="text-xs text-gray-500">Last 7 days</span>
              </div>
              <div className="flex items-end space-x-1 h-16">
                {[8, 10, 12, 9, 14, 16, 15].map((height, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 w-4 rounded-t transition-all duration-300"
                    style={{ height: `${height * 4}px` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Mon</span>
                <span>Sun</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Insights */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Learning Insights</h3>
          
          <div className="space-y-3">
            <Card className="bg-purple-50 border-l-4 border-purple-400">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Pattern Recognition</span>
                </div>
                <p className="text-xs text-purple-700">
                  Identified {topPatterns.length} key patterns this week. 
                  {topPatterns.length > 0 && ` Top pattern: ${topPatterns[0].category} language.`}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-l-4 border-orange-400">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Context Analysis</span>
                </div>
                <p className="text-xs text-orange-700">
                  Context understanding improved by {((metrics.contextAccuracy - 80) / 80 * 100).toFixed(1)}%. 
                  Better handling of conversation flow.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-l-4 border-green-400">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Goal Progress</span>
                </div>
                <p className="text-xs text-green-700">
                  95% accuracy target: {metrics.accuracyScore.toFixed(1)}% achieved. 
                  {metrics.accuracyScore >= 95 ? " Goal reached! 🎉" : " Almost there!"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Feedback Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">User Feedback</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Positive Feedback</span>
              <span className="text-sm font-medium text-green-600">{positiveFeedbackRate}%</span>
            </div>
            <Progress value={positiveFeedbackRate} className="h-2 [&>div]:bg-green-500" />
            
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-600">Improvement Suggestions</span>
              <Badge variant="secondary" className="text-xs">
                {metrics.improvementSuggestions}
              </Badge>
            </div>
            
            {metrics.improvementSuggestions > 10 && (
              <Card className="mt-3 bg-yellow-50 border-l-4 border-yellow-400">
                <CardContent className="p-2">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    <p className="text-xs text-yellow-800">
                      High suggestion volume. Consider reviewing common feedback themes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Learning Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Learning Actions</h3>
          
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
              <div className="flex items-center space-x-3">
                <Download className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Export Learning Data</div>
                  <div className="text-xs text-gray-600">Download training insights</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
              <div className="flex items-center space-x-3">
                <Sliders className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Adjust Learning Rate</div>
                  <div className="text-xs text-gray-600">Fine-tune adaptation speed</div>
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="w-full justify-start text-left h-auto p-3">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-4 h-4 text-red-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Reset Learning</div>
                  <div className="text-xs text-gray-600">Start fresh training</div>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
