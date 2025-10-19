import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const realTimeLogs = body?.realTimeLogs;

  // Save logs to a file or database

  if (!realTimeLogs) {
    return new Response(
      JSON.stringify({ success: false, message: "No logs received" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    await prisma.logs.create({
      data: {
        message: realTimeLogs,
      },
    });
    console.log("Logs saved to database.");
  } catch (error) {
    console.error("Error saving logs:", error);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
