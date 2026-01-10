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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
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
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Thank you for using Analytics X-Ray! with ❤️ from Uruguay 🇺🇾
          </p>
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-center text-xs text-muted-foreground">
              This is an open source project. You can contribute at:
            </p>
            <a
              href="https://github.com/agch-dev/analytics-x-ray"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                block text-center font-mono text-xs text-primary
                hover:underline
              `}
            >
              github.com/agch-dev/analytics-x-ray
            </a>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-center text-xs text-muted-foreground">
              Would love to hear your feedback!
            </p>
            <a
              href={getFeedbackMailtoLink()}
              className={`
                flex items-center justify-center gap-1.5 text-center font-mono
                text-xs text-primary
                hover:underline
              `}
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
