import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type WebhookEvent = {
  type: string;
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: { email_address: string }[];
    image_url: string | null;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const email = email_addresses[0]?.email_address ?? "";
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || email;

    await db
      .insert(users)
      .values({
        clerkId: id,
        fullName,
        email,
        avatarUrl: image_url,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          fullName,
          email,
          avatarUrl: image_url,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ received: true });
}
