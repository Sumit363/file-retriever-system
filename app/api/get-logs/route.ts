import {prisma} from "@/lib/prisma";
import { displayLastNLogs } from "@/lib/config";

export async function GET (req: Request) {
  // todo: gotta order by
  const logs = await prisma.logs.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: displayLastNLogs
  });
  
  return new Response(JSON.stringify(logs), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
