import { useConfigStore } from '@src/stores';

export function useNewFeatureBadge(featureId: string) {
  const isAcknowledged = useConfigStore((s) =>
    s.isFeatureAcknowledged(featureId)
  );
  const hasSeenOnboarding = useConfigStore(
    (s) => s.dismissedOnboardingModals.length > 0
  );
  const acknowledgeFeature = useConfigStore((s) => s.acknowledgeFeature);

  return {
    showBadge: hasSeenOnboarding && !isAcknowledged,
    acknowledge: () => acknowledgeFeature(featureId),
  };
}
