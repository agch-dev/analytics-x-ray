import { Mail01Icon, GithubIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { getFeedbackMailtoLink } from '@src/lib/utils';

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
            We&apos;d love to hear your thoughts, suggestions, or report any
            issues you&apos;ve encountered.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose how you&apos;d like to send your feedback:
          </p>
          <div className="space-y-3">
            <a
              href={getFeedbackMailtoLink()}
              className="flex items-center gap-2 p-3 bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <HugeiconsIcon
                icon={Mail01Icon}
                size={16}
                className="text-muted-foreground"
              />
              <span className="text-sm font-mono text-primary hover:underline">
                feedback@agch.dev
              </span>
            </a>
            <a
              href="https://github.com/agch-dev/analytics-x-ray/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <HugeiconsIcon
                icon={GithubIcon}
                size={16}
                className="text-muted-foreground"
              />
              <span className="text-sm font-mono text-primary hover:underline">
                Create GitHub Issue
              </span>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Your feedback helps us improve Analytics X-Ray. Thank you for taking
            the time to share your thoughts!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
