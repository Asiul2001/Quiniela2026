import { AuthRequired } from "@/components/auth-required";
import { AdminPredictionOverridesPanel } from "@/components/admin-prediction-overrides-panel";
import { PlayerAccessCodesPanel } from "@/components/player-access-codes-panel";

export default function AdminPage() {
  return (
    <AuthRequired>
      <main
        className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
      >
        
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <AdminPredictionOverridesPanel />
          <PlayerAccessCodesPanel />
        </div>
      </main>
    </AuthRequired>
  );
}
