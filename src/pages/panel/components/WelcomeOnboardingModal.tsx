import {
  Layout01Icon,
  Search01Icon,
  PinIcon,
  Clock04Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Logo } from '@src/components/Logo';
import { Button } from '@src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';

import type { OnboardingModalProps } from './OnboardingSystem';

interface Feature {
  icon: typeof Layout01Icon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Layout01Icon,
    title: 'Structured & JSON Views',
    description:
      "Provides a more readable Structured View that let's you easily inspect what is important to you. Still has the Raw JSON View available for those who prefer it. Set your preferred view in the extension settings.",
  },
  {
    icon: Search01Icon,
    title: 'Powerful Search & Filter',
    description:
      'Search across events, properties, and values. Filter by event type or hide/mute specific events to focus on what matters.',
  },
  {
    icon: PinIcon,
    title: 'Property Pinning',
    description:
      'Pin important properties to the top of event details to verify things faster and keep key data visible. Do so by hovering over the property and clicking the pin icon.',
  },
  {
    icon: Clock04Icon,
    title: 'Timeline View Improvements',
    description:
      'Navigate through your analytics timeline with clear visual separators for page reloads and navigation events. So you can easily see what happened when.',
  },
];

export function WelcomeOnboardingModal({
  open,
  onOpenChange,
}: Readonly<OnboardingModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div
              className={`
                flex h-10 w-10 items-center justify-center rounded-lg
                bg-primary/10 p-2
              `}
            >
              <Logo size={24} />
            </div>
            <DialogTitle className="text-2xl">
              Welcome to Analytics X-Ray
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Your powerful tool for inspecting and verifying Segment analytics
            events in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4 pb-2">
          {/* Key Features Section */}
          <div>
            <h3
              className={`
                mb-4 flex items-center gap-2 text-sm font-semibold
                text-foreground
              `}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={16}
                className="text-primary"
              />
              What Makes Analytics X-Ray Stand Out
            </h3>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`
                    flex gap-3 rounded-lg border border-border bg-card/50 p-3
                    transition-colors
                    hover:bg-card
                  `}
                >
                  <div
                    className={`
                      flex h-10 w-10 shrink-0 items-center justify-center
                      rounded-lg bg-primary/10 p-2
                    `}
                  >
                    <HugeiconsIcon
                      icon={feature.icon}
                      size={20}
                      className="text-primary"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 text-sm font-semibold text-foreground">
                      {feature.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className={`
              w-full
              sm:w-auto
            `}
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
