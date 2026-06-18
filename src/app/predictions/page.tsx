import { AuthRequired } from "@/components/auth-required";
import { PredictionsEntryClient } from "@/components/predictions-entry-client";
import { getPredictionsPageData } from "@/lib/predictions-page-data";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const data = await getPredictionsPageData();

  return (
    <AuthRequired>
      <PredictionsEntryClient data={data} />
    </AuthRequired>
  );
}
