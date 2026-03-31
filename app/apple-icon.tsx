import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, #1a2020 0%, #212929 60%, #253030 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 水墨晕染效果 - 大尺寸可以做更多细节 */}
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(122,184,160,0.25) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -15,
            left: -10,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(122,184,160,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 10,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(158,207,186,0.08) 0%, transparent 70%)",
          }}
        />
        {/* 主体文字 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 90,
              fontWeight: 700,
              color: "#d4cfc8",
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            墨
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: "#7ab8a0",
              letterSpacing: 8,
              marginTop: -4,
            }}
          >
            迹
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
