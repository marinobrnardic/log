import { ImageResponse } from "next/og";
import { ringDataUri } from "@/components/brand/ringSvg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 31536000;

export default function AppleIcon() {
  const ring = Math.round(size.width * 0.58);
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
        <img src={ringDataUri({ size: ring })} width={ring} height={ring} alt="log" />
      </div>
    ),
    { ...size },
  );
}
