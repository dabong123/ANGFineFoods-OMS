import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#ffffff",
          fontSize: 232,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: -6,
        }}
      >
        AF
      </div>
    ),
    { width: 512, height: 512 }
  );
}
