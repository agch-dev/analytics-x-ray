import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/components/ui/card';
import { Label } from '@src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/ui/select';
import {
  useConfigStore,
  selectTheme,
  selectPreferredEventDetailView,
} from '@src/stores';

export const AppearanceSection = () => {
  const theme = useConfigStore(selectTheme);
  const preferredEventDetailView = useConfigStore(
    selectPreferredEventDetailView
  );
  const setTheme = useConfigStore((state) => state.setTheme);
  const setPreferredEventDetailView = useConfigStore(
    (state) => state.setPreferredEventDetailView
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the extension&apos;s visual appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="theme">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (System)</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose the color theme for the extension interface
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferred-view">Preferred Event Details View</Label>
          <Select
            value={preferredEventDetailView}
            onValueChange={setPreferredEventDetailView}
          >
            <SelectTrigger id="preferred-view">
              <SelectValue placeholder="Select view mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="structured">Structured</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Default view mode when expanding event details. You can still toggle
            between views for individual events.
          </p>
        </div>
        <div className="pt-4 mt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Tip:</span> You can customize the
            default open/collapsed state of sections and subsections directly
            from the section menu (⋮) in the event detail view.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
