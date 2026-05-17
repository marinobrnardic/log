import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon0() {
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
          fontSize: 90,
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
