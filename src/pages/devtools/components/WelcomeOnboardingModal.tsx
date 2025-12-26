/**
 * Welcome Onboarding Modal
 * 
 * Introduces users to Analytics X-Ray and highlights key features
 * that make the extension stand out.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { Button } from '@src/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Layout01Icon,
  Search01Icon,
  PinIcon,
  Clock04Icon,
  CheckmarkCircle01Icon,
  Rocket01Icon,
} from '@hugeicons/core-free-icons';
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
    description: 'Switch between structured and raw JSON views to inspect events the way that works best for you.',
  },
  {
    icon: Search01Icon,
    title: 'Powerful Search & Filter',
    description: 'Search across events, properties, and values. Filter by event type or hide specific events to focus on what matters.',
  },
  {
    icon: PinIcon,
    title: 'Property Pinning',
    description: 'Pin important properties to the top of event details to verify things faster and keep key data visible.',
  },
  {
    icon: Clock04Icon,
    title: 'Timeline View Improvements',
    description: 'Navigate through your analytics timeline with clear visual separators for page reloads and navigation events.',
  },
];

export function WelcomeOnboardingModal({
  open,
  onOpenChange,
  onDismiss,
}: OnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg w-10 h-10 flex items-center justify-center">
              <HugeiconsIcon
                icon={Rocket01Icon}
                size={24}
                className="text-primary"
              />
            </div>
            <DialogTitle className="text-2xl">
              Welcome to Analytics X-Ray
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Your powerful tool for inspecting and verifying Segment analytics events in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4 pb-2 space-y-6">
          {/* Key Features Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
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
                  className="flex gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="shrink-0 p-2 bg-primary/10 rounded-lg w-10 h-10 flex items-center justify-center">
                    <HugeiconsIcon
                      icon={feature.icon}
                      size={20}
                      className="text-primary"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Tips */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Quick Start
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>
                  Navigate to any website that uses Segment analytics
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>
                  Events will appear automatically as they're captured
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>
                  Use the search bar to find specific events or properties
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>
                  Click on any event to inspect its full payload and metadata
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

