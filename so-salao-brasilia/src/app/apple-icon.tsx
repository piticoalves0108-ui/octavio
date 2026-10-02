import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function IconeApple() {
  const serif = await readFile(join(process.cwd(), "src/assets/fonts/DMSerifDisplay-Regular.ttf"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#2a2a2e",
        color: "#e8c5bd",
        fontFamily: "DM Serif Display",
        fontSize: 92,
      }}
    >
      SS
    </div>,
    { ...size, fonts: [{ name: "DM Serif Display", data: serif, weight: 400, style: "normal" }] },
  );
}
