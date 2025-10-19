import { NodeSSH } from "node-ssh";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import serverCredentials, { logFileLines } from "@/lib/config";

export async function POST(req: Request) {
  const ssh = new NodeSSH();

  try {
    const { alias, filePath, imeis } = await req.json();

    if (!alias || !filePath || !imeis) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!serverCredentials[alias]) {
      return NextResponse.json({ message: `Given bench ${alias} doesnot exist.` }, { status: 500 });
    }

    const config = {
      host: serverCredentials[alias][0],
      username: serverCredentials[alias][1],
      password: serverCredentials[alias][2],
      port: parseInt(serverCredentials[alias][3] ?? "22"),
      readyTimeout: 30000, // This is the time (in milliseconds) allowed for the server to become ready or available after the connection has been established.
      connectTimeout: 30000, // This is the time (in milliseconds) allowed for establishing a connection to the server
      tryKeyboard: true,
    };

    await ssh.connect(config);

    const imeiList = imeis
      .split(/[\n,]/)
      .map((imei: string) => imei.trim())
      .filter(Boolean);

    if (imeiList.length === 1) {
      const imei = imeiList[0];
      let fileName = imei;
      let remotePath = `${filePath}/${fileName}`;
      try {
        const txtFileExists = await ssh.execCommand(`[ -f "${remotePath}.txt" ]`);
        if (txtFileExists.code != 0) {
          const xmlFileExists = await ssh.execCommand(`[ -f "${remotePath}.xml" ]`);
          if (xmlFileExists.code != 0) {
            return NextResponse.json(
              {
                message: `File for given imei: ${imei} doesnot exist`,
              },
              { status: 500 }
            );
          }
          fileName += ".xml";
        } else {
          fileName += ".txt";
        }

        remotePath = `${filePath}/${fileName}`;

        const content = await ssh.execCommand(`tail -n ${logFileLines} ${remotePath}`);
        if (content.stderr) {
          throw new Error(content.stderr);
        }
        return new NextResponse(content.stdout, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": `inline; filename="${fileName}"`,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          {
            message: `Failed to fetch file for IMEI ${imei}`,
            error: errorMessage,
          },
          { status: 500 }
        );
      }
    } else {
      const zip = new JSZip();
      const files = [];

      for (const imei of imeiList) {
        try {
          let fileName = imei;
          let remotePath = `${filePath}/${fileName}`;

          const txtFileExists = await ssh.execCommand(`[ -f "${remotePath}.txt" ]`);
          if (txtFileExists.code != 0) {
            const xmlFileExists = await ssh.execCommand(`[ -f "${remotePath}.xml" ]`);
            if (xmlFileExists.code != 0) {
              return NextResponse.json(
                {
                  message: `File for given imei: ${imei} doesnot exist at given location.`,
                },
                { status: 500 }
              );
            }
            fileName += ".xml";
          } else {
            fileName += ".txt";
          }

          remotePath = `${filePath}/${fileName}`;

          const content = await ssh.execCommand(`tail -n ${logFileLines} ${remotePath}`);
          if (content.stdout) {
            zip.file(`${imei}`, content.stdout);
            files.push({ imei, status: "success" });
          } else {
            files.push({
              imei,
              status: "error",
              reason: content.stderr || "File is empty",
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          files.push({ imei, status: "error", reason: errorMessage });
        }
      }

      if (Object.keys(zip.files).length === 0) {
        return NextResponse.json(
          {
            message: "No files found or all files were empty or too large",
            files,
          },
          { status: 404 }
        );
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      return new NextResponse(Buffer.from(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="logs.zip"`,
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: "An error occurred", error: errorMessage }, { status: 500 });
  } finally {
    ssh.dispose();
  }
}
