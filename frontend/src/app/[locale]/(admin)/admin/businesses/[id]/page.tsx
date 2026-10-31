import { BusinessDetail } from "@/features/admin/components/BusinessDetail";

/** One business in full: profile, sign-in details, deals, activity log and admin notes. */
export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessDetail id={id} />;
}
