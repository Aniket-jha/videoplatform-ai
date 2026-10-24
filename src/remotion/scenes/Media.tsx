// Synced from the backend repo (remotion/) by scripts/sync-remotion.mjs. Edit it there.
import React from "react";
import { AbsoluteFill, Img, Video, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { Visual } from "../types";
import type { Theme } from "../theme";
import { formatNumber } from "../theme";
import { SceneVisual } from "./Visuals";

/** Slow zoom-and-drift over a photo (or gentle zoom over footage). */
export const KenBurns: React.FC<{ src: string; isVideo: boolean; seed: number; style?: React.CSSProperties }> = ({ src, isVideo, seed, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const zoomIn = seed % 2 === 0;
  const scale = isVideo ? 1 + 0.06 * t : zoomIn ? 1.04 + 0.14 * t : 1.18 - 0.14 * t;
  const dx = (seed % 3 - 1) * 3 * t;
  const dy = ((seed + 1) % 3 - 1) * 2 * t;
  const media: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${dx}%, ${dy}%)` };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      {isVideo ? <Video src={src} muted loop style={media} /> : <Img src={src} style={media} />}
    </div>
  );
};

const onImage = (theme: Theme): Theme => ({
  ...theme, text: "#ffffff", muted: "rgba(255,255,255,0.82)", card: "rgba(255,255,255,0.12)", cardBorder: "rgba(255,255,255,0.22)",
});

/** "Motion graphics + images": a photo frame beside the animated content; title/closing go full-bleed. */
export const ImageLayout: React.FC<{ visual: Visual; theme: Theme; src: string; isVideo: boolean; index: number; portrait: boolean; reserveBottom: number }> = ({
  visual, theme, src, isVideo, index, portrait, reserveBottom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 200, mass: 0.7 } });
  const fullBleed = visual.type === "title" || visual.type === "closing" || visual.type === "quote";

  if (fullBleed) {
    return (
      <AbsoluteFill>
        <KenBurns src={src} isVideo={isVideo} seed={index} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)" }} />
        <AbsoluteFill style={{ padding: portrait ? `200px 70px ${reserveBottom}px` : `110px 160px ${reserveBottom}px`, justifyContent: "center" }}>
          <SceneVisual visual={visual} theme={onImage(theme)} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const radius = theme.radius ?? 24;
  const frameStyle: React.CSSProperties = {
    position: "relative", overflow: "hidden", borderRadius: radius, boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
    opacity: enter, transform: `translate${portrait ? "Y" : "X"}(${(1 - enter) * (index % 2 ? -80 : 80)}px)`,
  };
  if (portrait) {
    return (
      <AbsoluteFill style={{ padding: `130px 60px ${reserveBottom}px`, gap: 50 }}>
        <div style={{ ...frameStyle, height: "40%", flexShrink: 0 }}><KenBurns src={src} isVideo={isVideo} seed={index} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}><SceneVisual visual={visual} theme={theme} /></div>
      </AbsoluteFill>
    );
  }
  const image = <div style={{ ...frameStyle, flex: "0 0 40%", height: "100%" }}><KenBurns src={src} isVideo={isVideo} seed={index} /></div>;
  const content = <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}><SceneVisual visual={visual} theme={theme} /></div>;
  return (
    <AbsoluteFill style={{ padding: `110px 110px ${reserveBottom}px`, flexDirection: "row", gap: 80, alignItems: "stretch" }}>
      {index % 2 ? <>{image}{content}</> : <>{content}{image}</>}
    </AbsoluteFill>
  );
};

/** "Visual video": full-screen photo or footage with a cinematic lower third. */
export const VisualLayout: React.FC<{ visual: Visual; theme: Theme; src: string; isVideo: boolean; index: number; portrait: boolean; reserveBottom: number }> = ({
  visual, theme, src, isVideo, index, portrait, reserveBottom,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const p = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const centered = visual.type === "title" || visual.type === "closing";
  const statValue = visual.type === "stat" && visual.stat
    ? interpolate(frame, [8, 45], [0, visual.stat.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })
    : null;
  const sub = visual.subheading ?? (visual.type === "stat" ? visual.stat?.label : visual.bullets?.[0]) ?? null;

  return (
    <AbsoluteFill>
      <KenBurns src={src} isVideo={isVideo} seed={index} />
      <AbsoluteFill style={{ background: centered
        ? "radial-gradient(ellipse at center, rgba(0,0,0,0.35), rgba(0,0,0,0.75))"
        : "linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.82) 100%)" }} />
      <AbsoluteFill style={{
        padding: portrait ? `160px 70px ${reserveBottom + 40}px` : `100px 140px ${reserveBottom + 20}px`,
        justifyContent: centered ? "center" : "flex-end", alignItems: centered ? "center" : "flex-start",
        textAlign: centered ? "center" : "left", color: "#fff",
        opacity: p, transform: `translateY(${(1 - p) * 40}px)`,
      }}>
        {!centered && (
          <div className="rr-heading" style={{ display: "inline-block", background: theme.accent, color: "#fff", padding: `${8 * unit}px ${18 * unit}px`, borderRadius: Math.min(theme.radius ?? 12, 14), fontSize: 26 * unit, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 22 * unit }}>
            {visual.heading}
          </div>
        )}
        {statValue !== null && (
          <div className="rr-heading" style={{ fontSize: 200 * unit, fontWeight: 900, lineHeight: 1, letterSpacing: -4, textShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            {visual.stat!.prefix}{formatNumber(statValue)}{visual.stat!.suffix && /^[%kKMB]$/.test(visual.stat!.suffix) ? visual.stat!.suffix : visual.stat!.suffix ? ` ${visual.stat!.suffix}` : ""}
          </div>
        )}
        {centered && <h1 style={{ margin: 0, fontSize: (portrait ? 96 : 110) * unit, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, textShadow: "0 8px 40px rgba(0,0,0,0.5)", maxWidth: 1500 }}>{visual.heading}</h1>}
        {sub && (
          <p style={{ margin: `${18 * unit}px 0 0`, fontSize: (centered ? 44 : 50) * unit, fontWeight: centered ? 500 : 700, lineHeight: 1.2, maxWidth: 1400, textShadow: "0 4px 24px rgba(0,0,0,0.6)", opacity: centered ? 0.9 : 1 }}>
            {sub}
          </p>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
