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
          <p className="mb-4 text-sm text-muted-foreground">
            Choose how you&apos;d like to send your feedback:
          </p>
          <div className="space-y-3">
            <a
              href={getFeedbackMailtoLink()}
              className={`
                flex items-center gap-2 rounded-md bg-muted p-3
                transition-colors
                hover:bg-muted/80
              `}
            >
              <HugeiconsIcon
                icon={Mail01Icon}
                size={16}
                className="text-muted-foreground"
              />
              <span
                className={`
                  font-mono text-sm text-primary
                  hover:underline
                `}
              >
                feedback@agch.dev
              </span>
            </a>
            <a
              href="https://github.com/agch-dev/analytics-x-ray/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-2 rounded-md bg-muted p-3
                transition-colors
                hover:bg-muted/80
              `}
            >
              <HugeiconsIcon
                icon={GithubIcon}
                size={16}
                className="text-muted-foreground"
              />
              <span
                className={`
                  font-mono text-sm text-primary
                  hover:underline
                `}
              >
                Create GitHub Issue
              </span>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Your feedback helps us improve Analytics X-Ray. Thank you for taking
            the time to share your thoughts!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
