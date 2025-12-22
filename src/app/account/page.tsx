import { Badge } from "@/components/ui/badge";

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:px-8">
      <Badge variant="green">Account</Badge>
      <h1 className="mt-4 font-display text-4xl">Coming soon</h1>
      <p className="mt-4 text-white/70">
        Your Lucky account hub is on the way. Track orders, manage custom
        embroidery, and unlock loyalty drops.
      </p>
    </div>
  );
}
