/**
 * Onboarding Hook
 * 
 * Manages onboarding modal state and dismissal tracking.
 */

import { useConfigStore } from '@src/stores';

/**
 * Hook to manage onboarding modal state
 * 
 * @param modalId - Unique identifier for the onboarding modal
 * @returns Object with isDismissed flag and dismiss function
 */
export function useOnboarding(modalId: string) {
  const isDismissed = useConfigStore((state) => state.isOnboardingModalDismissed(modalId));
  const dismiss = useConfigStore((state) => state.dismissOnboardingModal);

  const dismissModal = () => {
    dismiss(modalId);
  };

  return {
    isDismissed,
    dismiss: dismissModal,
  };
}

