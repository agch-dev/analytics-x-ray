/**
 * Detail Components Barrel Export
 * 
 * Central export point for all event detail view components.
 */

// Main view components
export { EventDetailView } from './EventDetailView';
export { EventDetailSection } from './EventDetailSection';

// Section components
export { PinnableSection } from './PinnableSection';
export { SubsectionGroup, type SubsectionDefinition } from './SubsectionGroup';

// Re-export sections
export * from './sections';

// Re-export primitives
export * from './primitives';
