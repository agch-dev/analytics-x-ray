import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useConfigStore } from './configStore';

// Mock the logger
vi.mock('@src/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the storage module
vi.mock('@src/lib/storage', () => ({
  createChromeStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
}));

// Helper function to filter dismissed modals by ID
const filterModalsById = (modals: string[], id: string): string[] =>
  modals.filter((modalId) => modalId === id);

describe('configStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useConfigStore.setState({
      maxEvents: 500,
      theme: 'auto',
      preferredEventDetailView: 'structured',
      pinnedProperties: {
        default: {
          properties: [],
          traits: [],
          context: {
            page: [],
            library: [],
            other: [],
            browser: [],
          },
          metadata: {
            identifiers: [],
            captureInfo: [],
            integrations: [],
          },
        },
      },
      dismissedOnboardingModals: [],
      sectionDefaults: {
        sections: {
          properties: true,
          traits: true,
          context: true,
          metadata: true,
        },
        subsections: {
          context: {
            contextPage: false,
            contextLibrary: false,
            contextOther: false,
            contextBrowser: false,
          },
          metadata: {
            metadataIdentifiers: false,
            metadataCaptureInfo: false,
            metadataIntegrations: false,
          },
        },
        specialDefaults: {
          contextPageAlwaysOpenForPageEvents: true,
          metadataIdentifiersAlwaysOpenForIdentityEvents: true,
        },
      },
    });
  });

  describe('setMaxEvents', () => {
    it('should set maxEvents to the provided value', () => {
      useConfigStore.getState().setMaxEvents(1000);
      expect(useConfigStore.getState().maxEvents).toBe(1000);
    });

    it('should enforce minimum value of 1', () => {
      useConfigStore.getState().setMaxEvents(0);
      expect(useConfigStore.getState().maxEvents).toBe(1);

      useConfigStore.getState().setMaxEvents(-10);
      expect(useConfigStore.getState().maxEvents).toBe(1);
    });

    it('should enforce maximum value of 10000', () => {
      useConfigStore.getState().setMaxEvents(20000);
      expect(useConfigStore.getState().maxEvents).toBe(10000);

      useConfigStore.getState().setMaxEvents(15000);
      expect(useConfigStore.getState().maxEvents).toBe(10000);
    });

    it('should allow values within bounds', () => {
      useConfigStore.getState().setMaxEvents(1);
      expect(useConfigStore.getState().maxEvents).toBe(1);

      useConfigStore.getState().setMaxEvents(5000);
      expect(useConfigStore.getState().maxEvents).toBe(5000);

      useConfigStore.getState().setMaxEvents(10000);
      expect(useConfigStore.getState().maxEvents).toBe(10000);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      useConfigStore.getState().setTheme('light');
      expect(useConfigStore.getState().theme).toBe('light');
    });

    it('should set theme to dark', () => {
      useConfigStore.getState().setTheme('dark');
      expect(useConfigStore.getState().theme).toBe('dark');
    });

    it('should set theme to auto', () => {
      useConfigStore.getState().setTheme('auto');
      expect(useConfigStore.getState().theme).toBe('auto');
    });
  });

  describe('setPreferredEventDetailView', () => {
    it('should set preferredEventDetailView to json', () => {
      useConfigStore.getState().setPreferredEventDetailView('json');
      expect(useConfigStore.getState().preferredEventDetailView).toBe('json');
    });

    it('should set preferredEventDetailView to structured', () => {
      useConfigStore.getState().setPreferredEventDetailView('structured');
      expect(useConfigStore.getState().preferredEventDetailView).toBe(
        'structured'
      );
    });
  });

  describe('reset', () => {
    it('should reset user-visible settings to defaults', () => {
      useConfigStore.getState().setMaxEvents(2000);
      useConfigStore.getState().setTheme('dark');
      useConfigStore.getState().setPreferredEventDetailView('json');

      useConfigStore.getState().reset();

      expect(useConfigStore.getState().maxEvents).toBe(500);
      expect(useConfigStore.getState().theme).toBe('auto');
      expect(useConfigStore.getState().preferredEventDetailView).toBe(
        'structured'
      );
    });

    it('should preserve pinnedProperties when resetting', () => {
      useConfigStore.getState().togglePin('properties', null, 'testProperty');
      const pinnedBefore = useConfigStore.getState().pinnedProperties;

      useConfigStore.getState().reset();

      expect(useConfigStore.getState().pinnedProperties).toEqual(pinnedBefore);
    });
  });

  describe('togglePin', () => {
    describe('properties section', () => {
      it('should pin a property when not pinned', () => {
        useConfigStore.getState().togglePin('properties', null, 'userId');
        expect(
          useConfigStore.getState().isPinned('properties', null, 'userId')
        ).toBe(true);
      });

      it('should unpin a property when already pinned', () => {
        useConfigStore.getState().togglePin('properties', null, 'userId');
        useConfigStore.getState().togglePin('properties', null, 'userId');
        expect(
          useConfigStore.getState().isPinned('properties', null, 'userId')
        ).toBe(false);
      });

      it('should handle multiple properties', () => {
        useConfigStore.getState().togglePin('properties', null, 'userId');
        useConfigStore.getState().togglePin('properties', null, 'email');
        useConfigStore.getState().togglePin('properties', null, 'name');

        expect(
          useConfigStore.getState().getPinnedProperties('properties', null)
        ).toEqual(['userId', 'email', 'name']);
      });
    });

    describe('traits section', () => {
      it('should pin a trait when not pinned', () => {
        useConfigStore.getState().togglePin('traits', null, 'email');
        expect(
          useConfigStore.getState().isPinned('traits', null, 'email')
        ).toBe(true);
      });

      it('should unpin a trait when already pinned', () => {
        useConfigStore.getState().togglePin('traits', null, 'email');
        useConfigStore.getState().togglePin('traits', null, 'email');
        expect(
          useConfigStore.getState().isPinned('traits', null, 'email')
        ).toBe(false);
      });
    });

    describe('context section', () => {
      it('should pin a context page property', () => {
        useConfigStore.getState().togglePin('context', 'page', 'url');
        expect(
          useConfigStore.getState().isPinned('context', 'page', 'url')
        ).toBe(true);
      });

      it('should pin a context library property', () => {
        useConfigStore.getState().togglePin('context', 'library', 'name');
        expect(
          useConfigStore.getState().isPinned('context', 'library', 'name')
        ).toBe(true);
      });

      it('should pin a context other property', () => {
        useConfigStore.getState().togglePin('context', 'other', 'customProp');
        expect(
          useConfigStore.getState().isPinned('context', 'other', 'customProp')
        ).toBe(true);
      });

      it('should pin a context browser property', () => {
        useConfigStore.getState().togglePin('context', 'browser', 'name');
        expect(
          useConfigStore.getState().isPinned('context', 'browser', 'name')
        ).toBe(true);
      });

      it('should unpin a context property when already pinned', () => {
        useConfigStore.getState().togglePin('context', 'page', 'url');
        useConfigStore.getState().togglePin('context', 'page', 'url');
        expect(
          useConfigStore.getState().isPinned('context', 'page', 'url')
        ).toBe(false);
      });
    });

    describe('metadata section', () => {
      it('should pin a metadata identifiers property', () => {
        useConfigStore
          .getState()
          .togglePin('metadata', 'identifiers', 'messageId');
        expect(
          useConfigStore
            .getState()
            .isPinned('metadata', 'identifiers', 'messageId')
        ).toBe(true);
      });

      it('should pin a metadata captureInfo property', () => {
        useConfigStore
          .getState()
          .togglePin('metadata', 'captureInfo', 'capturedAt');
        expect(
          useConfigStore
            .getState()
            .isPinned('metadata', 'captureInfo', 'capturedAt')
        ).toBe(true);
      });

      it('should pin a metadata integrations property', () => {
        useConfigStore.getState().togglePin('metadata', 'integrations', 'All');
        expect(
          useConfigStore.getState().isPinned('metadata', 'integrations', 'All')
        ).toBe(true);
      });

      it('should unpin a metadata property when already pinned', () => {
        useConfigStore
          .getState()
          .togglePin('metadata', 'identifiers', 'messageId');
        useConfigStore
          .getState()
          .togglePin('metadata', 'identifiers', 'messageId');
        expect(
          useConfigStore
            .getState()
            .isPinned('metadata', 'identifiers', 'messageId')
        ).toBe(false);
      });
    });

    describe('profile support', () => {
      it('should use default profile when not specified', () => {
        useConfigStore.getState().togglePin('properties', null, 'testProp');
        expect(
          useConfigStore.getState().isPinned('properties', null, 'testProp')
        ).toBe(true);
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'testProp', 'default')
        ).toBe(true);
      });

      it('should support custom profiles', () => {
        useConfigStore
          .getState()
          .togglePin('properties', null, 'testProp', 'custom-profile');
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'testProp', 'custom-profile')
        ).toBe(true);
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'testProp', 'default')
        ).toBe(false);
      });

      it('should isolate pins between profiles', () => {
        useConfigStore
          .getState()
          .togglePin('properties', null, 'prop1', 'profile1');
        useConfigStore
          .getState()
          .togglePin('properties', null, 'prop2', 'profile2');

        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'prop1', 'profile1')
        ).toBe(true);
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'prop1', 'profile2')
        ).toBe(false);
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'prop2', 'profile2')
        ).toBe(true);
        expect(
          useConfigStore
            .getState()
            .isPinned('properties', null, 'prop2', 'profile1')
        ).toBe(false);
      });
    });
  });

  describe('isPinned', () => {
    it('should return false for unpinned properties', () => {
      expect(
        useConfigStore.getState().isPinned('properties', null, 'unpinnedProp')
      ).toBe(false);
    });

    it('should return true for pinned properties', () => {
      useConfigStore.getState().togglePin('properties', null, 'pinnedProp');
      expect(
        useConfigStore.getState().isPinned('properties', null, 'pinnedProp')
      ).toBe(true);
    });

    it('should return false for non-existent profile', () => {
      expect(
        useConfigStore
          .getState()
          .isPinned('properties', null, 'prop', 'non-existent')
      ).toBe(false);
    });
  });

  describe('getPinnedProperties', () => {
    it('should return empty array when no properties are pinned', () => {
      expect(
        useConfigStore.getState().getPinnedProperties('properties', null)
      ).toEqual([]);
    });

    it('should return all pinned properties for a section', () => {
      useConfigStore.getState().togglePin('properties', null, 'prop1');
      useConfigStore.getState().togglePin('properties', null, 'prop2');
      useConfigStore.getState().togglePin('properties', null, 'prop3');

      const pinned = useConfigStore
        .getState()
        .getPinnedProperties('properties', null);
      expect(pinned).toContain('prop1');
      expect(pinned).toContain('prop2');
      expect(pinned).toContain('prop3');
      expect(pinned).toHaveLength(3);
    });

    it('should return empty array for non-existent profile', () => {
      expect(
        useConfigStore
          .getState()
          .getPinnedProperties('properties', null, 'non-existent')
      ).toEqual([]);
    });

    it('should return pinned properties for context subsections', () => {
      useConfigStore.getState().togglePin('context', 'page', 'url');
      useConfigStore.getState().togglePin('context', 'page', 'title');

      const pinned = useConfigStore
        .getState()
        .getPinnedProperties('context', 'page');
      expect(pinned).toEqual(['url', 'title']);
    });
  });

  describe('onboarding modals', () => {
    describe('dismissOnboardingModal', () => {
      it('should add modal ID to dismissed list', () => {
        useConfigStore.getState().dismissOnboardingModal('welcome-modal');
        expect(useConfigStore.getState().dismissedOnboardingModals).toContain(
          'welcome-modal'
        );
      });

      it('should not add duplicate modal IDs', () => {
        useConfigStore.getState().dismissOnboardingModal('welcome-modal');
        useConfigStore.getState().dismissOnboardingModal('welcome-modal');

        const dismissed = useConfigStore.getState().dismissedOnboardingModals;
        const welcomeModalCount = filterModalsById(dismissed, 'welcome-modal');
        expect(welcomeModalCount).toHaveLength(1);
      });

      it('should handle multiple modals', () => {
        useConfigStore.getState().dismissOnboardingModal('modal1');
        useConfigStore.getState().dismissOnboardingModal('modal2');
        useConfigStore.getState().dismissOnboardingModal('modal3');

        const dismissed = useConfigStore.getState().dismissedOnboardingModals;
        expect(dismissed).toContain('modal1');
        expect(dismissed).toContain('modal2');
        expect(dismissed).toContain('modal3');
        expect(dismissed).toHaveLength(3);
      });
    });

    describe('isOnboardingModalDismissed', () => {
      it('should return false for non-dismissed modals', () => {
        expect(
          useConfigStore.getState().isOnboardingModalDismissed('new-modal')
        ).toBe(false);
      });

      it('should return true for dismissed modals', () => {
        useConfigStore.getState().dismissOnboardingModal('dismissed-modal');
        expect(
          useConfigStore
            .getState()
            .isOnboardingModalDismissed('dismissed-modal')
        ).toBe(true);
      });
    });

    describe('resetOnboardingModals', () => {
      it('should clear all dismissed modals', () => {
        useConfigStore.getState().dismissOnboardingModal('modal1');
        useConfigStore.getState().dismissOnboardingModal('modal2');

        useConfigStore.getState().resetOnboardingModals();

        expect(useConfigStore.getState().dismissedOnboardingModals).toEqual([]);
        expect(
          useConfigStore.getState().isOnboardingModalDismissed('modal1')
        ).toBe(false);
        expect(
          useConfigStore.getState().isOnboardingModalDismissed('modal2')
        ).toBe(false);
      });
    });
  });

  describe('section defaults', () => {
    describe('setSectionDefaultExpanded', () => {
      it('should set section default expanded state', () => {
        useConfigStore
          .getState()
          .setSectionDefaultExpanded('properties', false);
        expect(
          useConfigStore.getState().sectionDefaults.sections.properties
        ).toBe(false);
      });

      it('should update existing section state', () => {
        useConfigStore
          .getState()
          .setSectionDefaultExpanded('properties', false);
        useConfigStore.getState().setSectionDefaultExpanded('properties', true);
        expect(
          useConfigStore.getState().sectionDefaults.sections.properties
        ).toBe(true);
      });

      it('should not affect other sections', () => {
        const initialTraits =
          useConfigStore.getState().sectionDefaults.sections.traits;
        useConfigStore
          .getState()
          .setSectionDefaultExpanded('properties', false);
        expect(useConfigStore.getState().sectionDefaults.sections.traits).toBe(
          initialTraits
        );
      });

      it('should handle all section types', () => {
        useConfigStore
          .getState()
          .setSectionDefaultExpanded('properties', false);
        useConfigStore.getState().setSectionDefaultExpanded('traits', false);
        useConfigStore.getState().setSectionDefaultExpanded('context', false);
        useConfigStore.getState().setSectionDefaultExpanded('metadata', false);

        expect(
          useConfigStore.getState().sectionDefaults.sections.properties
        ).toBe(false);
        expect(useConfigStore.getState().sectionDefaults.sections.traits).toBe(
          false
        );
        expect(useConfigStore.getState().sectionDefaults.sections.context).toBe(
          false
        );
        expect(
          useConfigStore.getState().sectionDefaults.sections.metadata
        ).toBe(false);
      });
    });

    describe('setSubsectionDefaultExpanded', () => {
      it('should set context subsection default expanded state', () => {
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextPage', true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextPage
        ).toBe(true);
      });

      it('should set metadata subsection default expanded state', () => {
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded(
            'metadata',
            'metadataIdentifiers',
            true
          );
        expect(
          useConfigStore.getState().sectionDefaults.subsections.metadata
            .metadataIdentifiers
        ).toBe(true);
      });

      it('should not affect other subsections', () => {
        const initialLibrary =
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextLibrary;
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextPage', true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextLibrary
        ).toBe(initialLibrary);
      });

      it('should handle all context subsections', () => {
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextPage', true);
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextLibrary', true);
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextOther', true);
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextBrowser', true);

        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextPage
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextLibrary
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextOther
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextBrowser
        ).toBe(true);
      });

      it('should handle all metadata subsections', () => {
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded(
            'metadata',
            'metadataIdentifiers',
            true
          );
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded(
            'metadata',
            'metadataCaptureInfo',
            true
          );
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded(
            'metadata',
            'metadataIntegrations',
            true
          );

        expect(
          useConfigStore.getState().sectionDefaults.subsections.metadata
            .metadataIdentifiers
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.metadata
            .metadataCaptureInfo
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.metadata
            .metadataIntegrations
        ).toBe(true);
      });
    });

    describe('setSpecialDefault', () => {
      it('should set contextPageAlwaysOpenForPageEvents', () => {
        useConfigStore
          .getState()
          .setSpecialDefault('contextPageAlwaysOpenForPageEvents', false);
        expect(
          useConfigStore.getState().sectionDefaults.specialDefaults
            .contextPageAlwaysOpenForPageEvents
        ).toBe(false);
      });

      it('should set metadataIdentifiersAlwaysOpenForIdentityEvents', () => {
        useConfigStore
          .getState()
          .setSpecialDefault(
            'metadataIdentifiersAlwaysOpenForIdentityEvents',
            false
          );
        expect(
          useConfigStore.getState().sectionDefaults.specialDefaults
            .metadataIdentifiersAlwaysOpenForIdentityEvents
        ).toBe(false);
      });

      it('should not affect other special defaults', () => {
        const initialMetadata =
          useConfigStore.getState().sectionDefaults.specialDefaults
            .metadataIdentifiersAlwaysOpenForIdentityEvents;
        useConfigStore
          .getState()
          .setSpecialDefault('contextPageAlwaysOpenForPageEvents', false);
        expect(
          useConfigStore.getState().sectionDefaults.specialDefaults
            .metadataIdentifiersAlwaysOpenForIdentityEvents
        ).toBe(initialMetadata);
      });
    });

    describe('resetSectionDefaults', () => {
      it('should reset all section defaults to initial values', () => {
        // Modify some defaults
        useConfigStore
          .getState()
          .setSectionDefaultExpanded('properties', false);
        useConfigStore
          .getState()
          .setSubsectionDefaultExpanded('context', 'contextPage', true);
        useConfigStore
          .getState()
          .setSpecialDefault('contextPageAlwaysOpenForPageEvents', false);

        // Reset
        useConfigStore.getState().resetSectionDefaults();

        // Verify defaults
        expect(
          useConfigStore.getState().sectionDefaults.sections.properties
        ).toBe(true);
        expect(useConfigStore.getState().sectionDefaults.sections.traits).toBe(
          true
        );
        expect(useConfigStore.getState().sectionDefaults.sections.context).toBe(
          true
        );
        expect(
          useConfigStore.getState().sectionDefaults.sections.metadata
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.subsections.context
            .contextPage
        ).toBe(false);
        expect(
          useConfigStore.getState().sectionDefaults.specialDefaults
            .contextPageAlwaysOpenForPageEvents
        ).toBe(true);
        expect(
          useConfigStore.getState().sectionDefaults.specialDefaults
            .metadataIdentifiersAlwaysOpenForIdentityEvents
        ).toBe(true);
      });
    });
  });
});
