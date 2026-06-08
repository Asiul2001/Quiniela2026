import { AuthRequired } from "@/components/auth-required";
import { PlayersPageClient } from "@/components/players-page-client";

export default function PlayersPage() {
  return (
    <AuthRequired>
      <PlayersPageClient />
    </AuthRequired>
  );
}
