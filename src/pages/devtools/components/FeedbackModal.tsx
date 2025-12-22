import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon } from '@hugeicons/core-free-icons';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Mail01Icon} size={20} />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Please send your feedback to:
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted">
            <HugeiconsIcon icon={Mail01Icon} size={16} className="text-muted-foreground" />
            <a
              href={`mailto:feedback@agch.dev?subject=${encodeURIComponent('Analytics x-ray - Feedback')}&body=${encodeURIComponent('Hi,\n\nI wanted to share some feedback about Analytics x-ray:\n\n\n\n---\n\n(Please include any relevant details about your feedback, suggestions, or issues you\'ve encountered)')}`}
              className="text-sm font-mono text-primary hover:underline"
            >
              feedback@agch.dev
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Your feedback helps us improve Analytics X-Ray. Thank you for taking the time to share your thoughts!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

