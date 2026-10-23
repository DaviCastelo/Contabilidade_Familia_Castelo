import { getFamilyContext, getCategories, categoryLabel } from "@/lib/family";
import ImportWizard from "./ImportWizard";

export default async function ImportarPage() {
  const { supabase, family } = await getFamilyContext();
  const [categories, { data: accounts }] = await Promise.all([
    getCategories(),
    supabase.from("accounts").select("id, name, kind").eq("family_id", family.id).order("name"),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-semibold">Importar extrato</h1>
        <p className="text-muted">
          Baixe o extrato no app ou site do banco em <b>OFX</b> (o mais completo) ou <b>CSV</b>. Eu sugiro as categorias pelo
          que vocês já lançaram antes e deixo de fora o que já existe e os pagamentos de fatura.
        </p>
      </div>
      <ImportWizard
        accounts={accounts ?? []}
        categories={categories.map((c) => ({ id: c.id, label: categoryLabel(c, categories), kind: c.kind }))}
      />
    </div>
  );
}
