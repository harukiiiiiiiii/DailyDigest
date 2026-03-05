import { redirect } from "next/navigation";
import { getTodayString } from "@/lib/data";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const today = getTodayString();
  redirect(`/${channelId}/${today}`);
}
