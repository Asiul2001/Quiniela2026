import { AuthRequired } from "@/components/auth-required";
import { HomePageClient } from "@/components/home-page-client";
import { getHomePageData } from "@/lib/homepage-data";

export default async function HomePage() {
  const data = await getHomePageData();

  return (
    <AuthRequired>
      <HomePageClient data={data} />
    </AuthRequired>
  );
}
