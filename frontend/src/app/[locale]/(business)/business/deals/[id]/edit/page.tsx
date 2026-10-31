import { DealEditor } from "@/features/portal-demo/DealEditor";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DealEditor id={id} />;
}
