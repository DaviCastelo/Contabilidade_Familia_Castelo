import { LogOut } from "lucide-react";
import { getFamilyContext, getFormOptions } from "@/lib/family";
import QuickAdd from "@/components/QuickAdd";
import { signOut } from "@/app/login/actions";
import { TopNav, BottomNav } from "@/components/NavLinks";
import Logo from "@/components/Logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ family, me }, options] = await Promise.all([getFamilyContext(), getFormOptions()]);
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2">
          <span className="flex items-center gap-2.5">
            <Logo />
            <span className="display text-lg font-semibold">{family.name}</span>
          </span>
          <TopNav />
          <div className="ml-auto flex items-center gap-1 text-sm text-muted">
            <span className="hidden sm:inline">{me.display_name}</span>
            <form action={signOut}>
              <button className="icon-btn" aria-label="Sair da conta" title="Sair">
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <QuickAdd options={options} />
      <BottomNav />
    </div>
  );
}
