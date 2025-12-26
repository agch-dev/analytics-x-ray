import { Logo } from '@src/components/Logo';

export const OptionsHeader = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <Logo className="h-12 w-12 pointer-events-none" size={48} />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics X-Ray Settings</h1>
        <p className="text-muted-foreground">
          Configure how the extension captures and displays Segment analytics events.
        </p>
      </div>
    </div>
  </div>
);

