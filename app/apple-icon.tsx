import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#22C55E",
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        LOG
      </div>
    ),
    { ...size },
  );
}
