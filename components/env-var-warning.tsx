// Shown in the header only while the Supabase settings are missing (local development).
export function EnvVarWarning() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
      Not connected to Supabase
    </p>
  );
}
