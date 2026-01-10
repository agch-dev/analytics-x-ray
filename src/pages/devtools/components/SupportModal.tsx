import {
  HeartCheckIcon,
  Coffee01Icon,
  Mail01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { buttonVariants } from '@src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { cn, getFeedbackMailtoLink } from '@src/lib/utils';

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={HeartCheckIcon}
              size={20}
              className="text-primary"
            />
            Support Analytics X-Ray
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            If you find Analytics X-Ray useful, please consider supporting its
            development.
            <br />
            <br />
            Your support helps keep this project alive and allows for continued
            improvements and new features.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2 pb-4">
          <div>
            <a
              href="https://buymeacoffee.com/aguschaer"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: 'default', size: 'default' }),
                'w-full'
              )}
            >
              <HugeiconsIcon icon={Coffee01Icon} size={18} className="mr-2" />
              Buy Me a Coffee
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Thank you for using Analytics X-Ray! with ❤️ from Uruguay 🇺🇾
          </p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">
              This is an open source project. You can contribute at:
            </p>
            <a
              href="https://github.com/agch-dev/analytics-x-ray"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-mono text-center block"
            >
              github.com/agch-dev/analytics-x-ray
            </a>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Would love to hear your feedback!
            </p>
            <a
              href={getFeedbackMailtoLink()}
              className="text-xs text-primary hover:underline font-mono text-center flex items-center justify-center gap-1.5"
            >
              <HugeiconsIcon icon={Mail01Icon} size={14} />
              feedback@agch.dev
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
