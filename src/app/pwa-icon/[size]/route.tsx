import { appIcon } from "@/lib/appIcon";

export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192" }, { size: "512" }];

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "192" ? 192 : 512;
  return appIcon(size);
}
