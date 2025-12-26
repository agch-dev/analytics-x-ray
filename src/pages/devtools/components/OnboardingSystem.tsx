/**
 * Onboarding System
 * 
 * Reusable system for managing onboarding modals.
 * Handles showing modals based on dismissal state and provides
 * a consistent interface for future onboarding flows.
 */

import { useEffect, useState } from 'react';
import { useOnboarding } from '@src/hooks/useOnboarding';

export interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

interface OnboardingSystemProps {
  /**
   * Unique identifier for this onboarding modal
   */
  modalId: string;
  
  /**
   * Component to render as the onboarding modal
   */
  ModalComponent: React.ComponentType<OnboardingModalProps>;
  
  /**
   * Optional delay before showing the modal (in milliseconds)
   * Useful to avoid showing modals immediately on page load
   */
  delay?: number;
  
  /**
   * Whether to show the modal even if it was previously dismissed
   * Useful for testing or re-showing important onboarding
   */
  forceShow?: boolean;
}

/**
 * OnboardingSystem Component
 * 
 * Manages the lifecycle of onboarding modals:
 * - Checks if modal has been dismissed
 * - Shows modal on mount (with optional delay)
 * - Handles dismissal and persistence
 */
export function OnboardingSystem({
  modalId,
  ModalComponent,
  delay = 0,
  forceShow = false,
}: OnboardingSystemProps) {
  const { isDismissed, dismiss } = useOnboarding(modalId);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Don't show if dismissed (unless forced)
    if (isDismissed && !forceShow) {
      return;
    }

    // Show modal after delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isDismissed, forceShow, delay]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    // If closing, dismiss the modal
    if (!open) {
      dismiss();
    }
  };

  const handleDismiss = () => {
    dismiss();
    setIsOpen(false);
  };

  // Don't render if dismissed (unless forced)
  if (isDismissed && !forceShow) {
    return null;
  }

  return (
    <ModalComponent
      open={isOpen}
      onOpenChange={handleOpenChange}
      onDismiss={handleDismiss}
    />
  );
}

