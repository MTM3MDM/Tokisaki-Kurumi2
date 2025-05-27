import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { translatorApi } from "@/lib/translator-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";

interface FeedbackModalProps {
  messageId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ messageId, isOpen, onClose }: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [category, setCategory] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const feedbackMutation = useMutation({
    mutationFn: () =>
      translatorApi.submitFeedback(messageId, "suggestion", category, feedbackText),
    onSuccess: () => {
      toast({
        title: "Feedback submitted successfully",
        description: "Thank you for helping improve our translation quality. Your suggestion will be reviewed and applied to future translations.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-metrics"] });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFeedbackText("");
    setCategory("");
    onClose();
  };

  const handleSubmit = () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Please provide feedback",
        description: "Your suggestion cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    feedbackMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span>Improve Translation</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="feedback-text" className="text-sm font-medium">
              Your suggestion:
            </Label>
            <Textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="How can this translation be improved? Please be specific about what could be better."
              rows={4}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="feedback-category" className="text-sm font-medium">
              Category:
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grammar">Grammar</SelectItem>
                <SelectItem value="context">Context</SelectItem>
                <SelectItem value="tone">Tone</SelectItem>
                <SelectItem value="technical">Technical Terms</SelectItem>
                <SelectItem value="cultural">Cultural Nuance</SelectItem>
                <SelectItem value="fluency">Fluency</SelectItem>
                <SelectItem value="accuracy">Accuracy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={feedbackMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={feedbackMutation.isPending || !feedbackText.trim()}
            >
              {feedbackMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
            <p className="font-medium text-blue-900 mb-1">How your feedback helps:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Improves future translation accuracy</li>
              <li>Helps the AI understand context better</li>
              <li>Contributes to the learning algorithm</li>
              <li>Benefits all users of the system</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
