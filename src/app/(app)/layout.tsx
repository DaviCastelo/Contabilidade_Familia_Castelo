import { getFamilyContext } from "@/lib/family";
import { signOut } from "@/app/login/actions";
import NavLinks from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { family, me } = await getFamilyContext();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">🏰 {family.name}</span>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            {me.display_name}
            <form action={signOut}><button className="btn-ghost">Sair</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
