import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #1a2020 0%, #212929 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 水墨晕染背景装饰 */}
        <div
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(122,184,160,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            left: -2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(122,184,160,0.15) 0%, transparent 70%)",
          }}
        />
        {/* "墨" 字 */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#d4cfc8",
            lineHeight: 1,
            letterSpacing: -1,
          }}
        >
          墨
        </span>
      </div>
    ),
    { ...size }
  );
}
