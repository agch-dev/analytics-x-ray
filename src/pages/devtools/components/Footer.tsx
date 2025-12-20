interface FooterProps {
  tabId: number;
}

export function Footer({ tabId }: FooterProps) {
  return (
    <footer className="shrink-0 px-4 py-1.5 border-t border-border bg-card/50 flex items-center justify-between text-xs text-muted-foreground">
      <span>Tab {tabId}</span>
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Listening
      </span>
    </footer>
  );
}

