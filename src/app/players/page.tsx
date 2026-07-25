import { AuthRequired } from "@/components/auth-required";
import { PlayersPageClient } from "@/components/players-page-client";
import { getPlayersBrowseData } from "@/lib/players-browse-data";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const initialData = await getPlayersBrowseData().catch(() => null);

  return (
    <AuthRequired>
      <PlayersPageClient initialData={initialData} />
    </AuthRequired>
  );
}
