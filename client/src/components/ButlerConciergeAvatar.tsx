import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface ButlerConciergeAvatarProps {
  voiceState: VoiceState;
  onClick?: () => void;
  size?: number;
}

/**
 * LUXURY BUTLER & CONCIERGE VIRTUAL AVATAR
 * A handsome, distinguished, and sophisticated luxury real estate butler.
 * Tailored midnight emerald suit, silk champagne tie, gold concierge pin,
 * warm expressive eyes, natural speech lip-sync, and animated reactions.
 */
export default function ButlerConciergeAvatar({
  voiceState = "idle",
  onClick,
  size = 240,
}: ButlerConciergeAvatarProps) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isSpeaking = voiceState === "speaking";

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
      style={{ width: `${size}px`, height: `${size + 30}px` }}
      title={
        isSpeaking
          ? "Concierge is speaking (tap to pause)"
          : isListening
          ? "Concierge is listening (tap to send)"
          : isProcessing
          ? "Concierge is consulting property catalog..."
          : "Tap Concierge to talk"
      }
    >
      {/* ── Ambient Radial Halo Glow ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{
          scale: isSpeaking ? [1, 1.22, 1] : isListening ? [1, 1.18, 1] : [1, 1.05, 1],
          opacity: isSpeaking ? [0.45, 0.75, 0.45] : isListening ? [0.5, 0.8, 0.5] : [0.2, 0.35, 0.2],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 1.5 : isListening ? 1.2 : 3.5,
          ease: "easeInOut",
        }}
        style={{
          width: `${size * 0.9}px`,
          height: `${size * 0.9}px`,
          top: "10%",
          background: isListening
            ? "radial-gradient(circle, rgba(52,211,153,0.45) 0%, rgba(16,72,75,0) 70%)"
            : isSpeaking
            ? "radial-gradient(circle, rgba(215,239,115,0.5) 0%, rgba(20,83,85,0) 70%)"
            : isProcessing
            ? "radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(16,72,75,0) 70%)"
            : "radial-gradient(circle, rgba(215,239,115,0.2) 0%, rgba(16,72,75,0) 70%)",
          filter: "blur(22px)",
        }}
      />

      {/* ── Acoustic Pulse Rings (when speaking or listening) ── */}
      {(isListening || isSpeaking) && (
        <motion.div
          className="absolute rounded-full pointer-events-none border"
          initial={{ width: size * 0.7, height: size * 0.7, opacity: 0.8 }}
          animate={{
            width: [size * 0.7, size * 1.1],
            height: [size * 0.7, size * 1.1],
            opacity: [0.7, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeOut",
          }}
          style={{
            top: "12%",
            borderColor: isListening ? "rgba(52,211,153,0.5)" : "rgba(215,239,115,0.55)",
          }}
        />
      )}

      {/* ── Main Avatar Stage ── */}
      <motion.div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center"
        animate={{
          y: isSpeaking ? [0, -4, 1, -3, 0] : isListening ? [0, -2, 0] : [0, -3, 0],
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: isSpeaking ? 0.7 : isListening ? 1.6 : 3.2,
            ease: "easeInOut",
          },
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <svg
          viewBox="0 0 280 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="suitGrad" x1="50" y1="180" x2="230" y2="290" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1a3f42" />
              <stop offset="50%" stopColor="#102e30" />
              <stop offset="100%" stopColor="#091f21" />
            </linearGradient>

            <linearGradient id="lapelGrad" x1="100" y1="170" x2="180" y2="270" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#245155" />
              <stop offset="100%" stopColor="#133639" />
            </linearGradient>

            <linearGradient id="tieGrad" x1="140" y1="180" x2="140" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f3fbc6" />
              <stop offset="50%" stopColor="#d7ef73" />
              <stop offset="100%" stopColor="#a3c435" />
            </linearGradient>

            <linearGradient id="skinGrad" x1="140" y1="60" x2="140" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde0c8" />
              <stop offset="60%" stopColor="#f5cbb0" />
              <stop offset="100%" stopColor="#e8b292" />
            </linearGradient>

            <linearGradient id="hairGrad" x1="140" y1="30" x2="140" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3d2c20" />
              <stop offset="50%" stopColor="#241a13" />
              <stop offset="100%" stopColor="#140e0a" />
            </linearGradient>

            <linearGradient id="pedestalGrad" x1="140" y1="260" x2="140" y2="295" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#204f52" />
              <stop offset="100%" stopColor="#0a2123" />
            </linearGradient>

            {/* Pedestal Clip Path */}
            <clipPath id="avatarCircleClip">
              <circle cx="140" cy="145" r="125" />
            </clipPath>
          </defs>

          {/* ══════════════════════════════════════════════════════════
              CIRCULAR LUXURY PORTRAIT BACKDROP
              ══════════════════════════════════════════════════════════ */}
          <circle
            cx="140"
            cy="145"
            r="120"
            fill="#092124"
            stroke={isListening ? "#34d399" : isSpeaking ? "#d7ef73" : "#245558"}
            strokeWidth="3.5"
            className="transition-colors duration-500"
          />

          {/* Subtle backdrop luxury ring patterns */}
          <circle cx="140" cy="145" r="105" stroke="rgba(215,239,115,0.08)" strokeWidth="1.5" strokeDasharray="4 6" />

          {/* Group clipped to portrait frame */}
          <g clipPath="url(#avatarCircleClip)">

            {/* ══════════════════════════════════════════════════════════
                BODY / SUIT / TIE
                ══════════════════════════════════════════════════════════ */}
            {/* Shoulders & Suit Jacket Body */}
            <path
              d="M 40 295 L 60 215 C 75 190 100 182 140 182 C 180 182 205 190 220 215 L 240 295 Z"
              fill="url(#suitGrad)"
            />

            {/* Crisp White Shirt Center */}
            <path
              d="M 120 160 L 140 215 L 160 160 L 140 166 Z"
              fill="#ffffff"
            />
            {/* Shirt Collar Points */}
            <path d="M 120 160 L 110 180 L 132 184 L 138 166 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />
            <path d="M 160 160 L 170 180 L 148 184 L 142 166 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />

            {/* Silk Tie */}
            <path
              d="M 134 180 L 146 180 L 149 220 L 140 248 L 131 220 Z"
              fill="url(#tieGrad)"
              stroke="#8ba826"
              strokeWidth="0.8"
            />
            {/* Tie Knot */}
            <polygon points="134,178 146,178 144,188 136,188" fill="#cbe362" stroke="#779418" strokeWidth="0.8" />

            {/* Suit Lapels (Left & Right) */}
            <path
              d="M 75 220 L 115 180 L 134 235 L 85 270 Z"
              fill="url(#lapelGrad)"
              stroke="#133639"
              strokeWidth="1.2"
            />
            <path
              d="M 205 220 L 165 180 L 146 235 L 195 270 Z"
              fill="url(#lapelGrad)"
              stroke="#133639"
              strokeWidth="1.2"
            />

            {/* Gold Concierge Lapel Pin (Star / Key symbol of Clefs d'Or Concierge) */}
            <g transform="translate(100, 218)">
              <circle cx="0" cy="0" r="4.5" fill="#d7ef73" stroke="#89a81e" strokeWidth="0.8" />
              <polygon points="0,-3.5 1,-1 3.5,0 1,1 0,3.5 -1,1 -3.5,0 -1,-1" fill="#10484b" />
            </g>

            {/* Champagne Gold Pocket Square */}
            <path d="M 185 235 L 198 231 L 202 236 L 187 239 Z" fill="#d7ef73" opacity="0.9" />

            {/* ══════════════════════════════════════════════════════════
                HEAD & NECK
                ══════════════════════════════════════════════════════════ */}
            {/* Neck */}
            <rect x="127" y="145" width="26" height="30" rx="6" fill="#e8b292" />
            <path d="M 127 158 Q 140 166 153 158" stroke="#cf9572" strokeWidth="2" fill="none" opacity="0.6" />

            {/* Head tilt & movement group */}
            <motion.g
              animate={{
                rotate: isListening ? 2.5 : isProcessing ? -2.5 : 0,
              }}
              transition={{ duration: 0.4 }}
              style={{ transformOrigin: "140px 145px" }}
            >
              {/* Ears */}
              <ellipse cx="98" cy="118" rx="8" ry="12" fill="url(#skinGrad)" />
              <ellipse cx="98" cy="118" rx="4.5" ry="7" fill="#cf9572" opacity="0.4" />
              {/* Concierge Micro Earpiece in Ear */}
              <circle cx="98" cy="120" r="2.8" fill="#10484b" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="98" cy="120" r="1.2" fill={isListening ? "#34d399" : "#d7ef73"} />

              <ellipse cx="182" cy="118" rx="8" ry="12" fill="url(#skinGrad)" />
              <ellipse cx="182" cy="118" rx="4.5" ry="7" fill="#cf9572" opacity="0.4" />

              {/* Head / Face Shape */}
              <path
                d="M 104 100 C 104 70 120 62 140 62 C 160 62 176 70 176 100 C 176 130 166 155 140 155 C 114 155 104 130 104 100 Z"
                fill="url(#skinGrad)"
                stroke="#dca480"
                strokeWidth="1.2"
              />

              {/* Sophisticated Groomed Hair */}
              <path
                d="M 100 95 C 98 62 115 42 140 42 C 168 42 182 60 180 95 C 176 78 165 70 148 72 C 130 74 116 82 100 95 Z"
                fill="url(#hairGrad)"
              />
              {/* Sideburns */}
              <path d="M 102 92 L 102 110 L 106 106 Z" fill="#241a13" />
              <path d="M 178 92 L 178 110 L 174 106 Z" fill="#241a13" />

              {/* ══════════════════════════════════════════════════════════
                  FACIAL FEATURES
                  ══════════════════════════════════════════════════════════ */}
              {/* Eyebrows */}
              <motion.path
                d="M 116 97 Q 126 93 134 96"
                stroke="#241a13"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                animate={{
                  d: isProcessing
                    ? "M 116 94 Q 126 91 134 95"
                    : isListening
                    ? "M 116 95 Q 126 91 134 95"
                    : "M 116 97 Q 126 93 134 96",
                }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                d="M 146 96 Q 154 93 164 97"
                stroke="#241a13"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                animate={{
                  d: isProcessing
                    ? "M 146 93 Q 154 89 164 95"
                    : isListening
                    ? "M 146 95 Q 154 91 164 95"
                    : "M 146 96 Q 154 93 164 97",
                }}
                transition={{ duration: 0.3 }}
              />

              {/* Eyes */}
              {/* Left Eye */}
              <g>
                <ellipse cx="125" cy="108" rx="7.5" ry="5.5" fill="#ffffff" />
                <motion.ellipse
                  cx="125"
                  cy="108"
                  rx="4.2"
                  ry="4.2"
                  fill="#3d2618"
                  animate={{
                    cx: isProcessing ? 127 : isListening ? 126 : isSpeaking ? [125, 126, 125] : 125,
                    cy: isProcessing ? 106 : 108,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <circle cx="125" cy="108" r="2.2" fill="#140e0a" />
                <circle cx="126.5" cy="106.5" r="1.2" fill="#ffffff" />
                {/* Natural Eyelid Blink */}
                <motion.path
                  d="M 117 108 Q 125 101 133 108"
                  stroke="#3d2618"
                  strokeWidth="1.8"
                  fill="none"
                />
                {/* Blink overlay */}
                <motion.ellipse
                  cx="125"
                  cy="108"
                  rx="8"
                  ry="0"
                  fill="#f5cbb0"
                  animate={{
                    ry: [0, 0, 0, 6, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4.8,
                    times: [0, 0.75, 0.82, 0.87, 1],
                  }}
                />
              </g>

              {/* Right Eye */}
              <g>
                <ellipse cx="155" cy="108" rx="7.5" ry="5.5" fill="#ffffff" />
                <motion.ellipse
                  cx="155"
                  cy="108"
                  rx="4.2"
                  ry="4.2"
                  fill="#3d2618"
                  animate={{
                    cx: isProcessing ? 157 : isListening ? 156 : isSpeaking ? [155, 156, 155] : 155,
                    cy: isProcessing ? 106 : 108,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <circle cx="155" cy="108" r="2.2" fill="#140e0a" />
                <circle cx="156.5" cy="106.5" r="1.2" fill="#ffffff" />
                {/* Natural Eyelid Line */}
                <motion.path
                  d="M 147 108 Q 155 101 163 108"
                  stroke="#3d2618"
                  strokeWidth="1.8"
                  fill="none"
                />
                {/* Blink overlay */}
                <motion.ellipse
                  cx="155"
                  cy="108"
                  rx="8"
                  ry="0"
                  fill="#f5cbb0"
                  animate={{
                    ry: [0, 0, 0, 6, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4.8,
                    times: [0, 0.75, 0.82, 0.87, 1],
                  }}
                />
              </g>

              {/* Sculpted Nose */}
              <path
                d="M 140 106 L 138 122 Q 140 126 143 125"
                stroke="#c98a63"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />

              {/* ══════════════════════════════════════════════════════════
                  MOUTH (Animated when speaking, warm gentle smile otherwise)
                  ══════════════════════════════════════════════════════════ */}
              {!isSpeaking ? (
                /* Warm friendly resting smile */
                <path
                  d={
                    isListening
                      ? "M 132 136 Q 140 142 148 136"
                      : isProcessing
                      ? "M 133 137 Q 140 140 147 137"
                      : "M 131 136 Q 140 143 149 136"
                  }
                  stroke="#9a4d35"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                /* Naturally animated speaking mouth */
                <motion.g
                  animate={{
                    scaleY: [1, 1.6, 0.9, 1.5, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.38,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: "140px 138px" }}
                >
                  <path
                    d="M 131 135 Q 140 133 149 135 Q 140 146 131 135 Z"
                    fill="#5c2016"
                    stroke="#9a4d35"
                    strokeWidth="1.2"
                  />
                  {/* Subtle white teeth line */}
                  <path d="M 134 136 Q 140 135 146 136" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                </motion.g>
              )}

              {/* Gentle Chin Shadow */}
              <path d="M 136 148 Q 140 150 144 148" stroke="#cf9572" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
            </motion.g>
          </g>

          {/* ══════════════════════════════════════════════════════════
              CONCIERGE BADGE ON BORDER PEDESTAL
              ══════════════════════════════════════════════════════════ */}
          <g transform="translate(140, 275)">
            {/* Plaque Background */}
            <rect
              x="-65"
              y="-12"
              width="130"
              height="24"
              rx="12"
              fill="url(#pedestalGrad)"
              stroke="#d7ef73"
              strokeWidth="1.5"
            />
            {/* Plaque Text */}
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="#fbfff9"
              fontSize="10"
              fontWeight="800"
              letterSpacing="0.8"
              fontFamily="system-ui, sans-serif"
            >
              ✦ LUXURY CONCIERGE
            </text>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
