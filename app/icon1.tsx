import { ImageResponse } from "next/og";
import { ringDataUri } from "@/components/brand/ringSvg";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export const revalidate = 31536000;

export default function Icon1() {
  // Maskable icon: keep the mark inside the inner ~80% safe zone so OS cropping
  // (circle, squircle, rounded-rect) doesn't clip it.
  const ring = Math.round(size.width * 0.46);
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
        }}
      >
        {/* next/og renders this to a PNG — next/image does not apply here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ringDataUri({ size: ring })} width={ring} height={ring} alt="log" />
      </div>
    ),
    { ...size },
  );
}
