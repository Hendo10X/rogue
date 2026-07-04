import { ImageResponse } from "next/og";

export const alt = "Rogue Socials — Buy Social Media Accounts & SMM Services";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Auto-used as the Open Graph + Twitter card image site-wide.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #E54D1B 0%, #b93a12 100%)",
          padding: "90px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, opacity: 0.9 }}>
          ROGUE SOCIALS
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-2px",
            marginTop: 20,
            lineHeight: 1.05,
            maxWidth: 950,
          }}
        >
          Buy Social Media Accounts & SMM
        </div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 28, opacity: 0.95 }}>
          Instant delivery · Secure payments
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: 44, opacity: 0.85 }}>
          Instagram · Facebook · TikTok · Twitter · Snapchat
        </div>
      </div>
    ),
    { ...size },
  );
}
