import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon1() {
  // Maskable icon: keep the wordmark inside the inner ~80% safe zone so OS
  // cropping (circle, squircle, rounded-rect) doesn't clip the brand.
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
          fontSize: 180,
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
