import React from "react";
import { motion } from "framer-motion";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface BrickbobAvatarProps {
  voiceState: VoiceState;
  onClick?: () => void;
  size?: number;
  showSpeechBubble?: boolean;
}

/**
 * BRICKBOB (BB) Virtual AI Avatar
 * Faithfully recreated from the official TARCIAN / TARUMT mascot:
 * Red brick body with 3D depth, blue "TARCIAN" baseball cap,
 * vintage cartoon rubber-hose eyes, white gloves, black shoes.
 */
export default function BrickbobAvatar({
  voiceState = "idle",
  onClick,
  size = 280,
  showSpeechBubble = true,
}: BrickbobAvatarProps) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";
  const isSpeaking = voiceState === "speaking";

  // Dynamic speech bubble content based on state
  const bubbleText = isSpeaking
    ? "BB is speaking!"
    : isProcessing
    ? "Thinking... 💭"
    : isListening
    ? "I'm listening! 👂"
    : 'Call me "BB"';

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group"
      style={{ width: `${size}px`, height: `${size + 40}px` }}
      title={
        isSpeaking
          ? "Brickbob is speaking (tap to pause)"
          : isListening
          ? "Brickbob is listening (tap to send)"
          : isProcessing
          ? "Brickbob is thinking..."
          : 'Tap Brickbob to talk!'
      }
    >
      {/* Floating Speech Bubble */}
      {showSpeechBubble && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: [0, -3, 0],
            scale: 1,
          }}
          transition={{
            y: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
            opacity: { duration: 0.3 },
          }}
          className="absolute -top-3 left-4 z-30 bg-white text-[#10484b] border-2 border-black px-3 py-1 rounded-2xl shadow-lg flex items-center gap-1 font-black text-xs"
        >
          <span>{bubbleText}</span>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black" />
          <div className="absolute -bottom-1 left-[25px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-white" />
        </motion.div>
      )}

      {/* Radiant Aura Glow behind Brickbob */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{
          scale: isSpeaking ? [1, 1.25, 1] : isListening ? [1, 1.2, 1] : [1, 1.06, 1],
          opacity: isSpeaking ? [0.4, 0.7, 0.4] : isListening ? [0.45, 0.75, 0.45] : [0.2, 0.35, 0.2],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 1.4 : isListening ? 1.2 : 3.2,
          ease: "easeInOut",
        }}
        style={{
          width: `${size * 0.85}px`,
          height: `${size * 0.85}px`,
          background: isListening
            ? "radial-gradient(circle, rgba(52,211,153,0.5) 0%, rgba(16,72,75,0) 70%)"
            : isSpeaking
            ? "radial-gradient(circle, rgba(215,239,115,0.55) 0%, rgba(200,40,45,0) 70%)"
            : isProcessing
            ? "radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(16,72,75,0) 70%)"
            : "radial-gradient(circle, rgba(215,239,115,0.25) 0%, rgba(16,72,75,0) 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Main Animated Brickbob Character Body */}
      <motion.div
        className="relative z-10 w-full h-full flex items-center justify-center"
        animate={{
          y: isSpeaking
            ? [0, -6, 2, -4, 0]
            : isListening
            ? [0, -3, 0]
            : [0, -5, 0],
          scale: isSpeaking ? [1, 1.02, 0.99, 1.02, 1] : 1,
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: isSpeaking ? 0.6 : isListening ? 1.6 : 2.8,
            ease: "easeInOut",
          },
          scale: {
            repeat: Infinity,
            duration: 0.6,
            ease: "easeInOut",
          },
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        <svg
          viewBox="0 0 340 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)]"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Drop shadow filter for white sticker outline */}
            <filter id="sticker-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {/* ══════════════════════════════════════════════════════════
              STICKER THICK WHITE BACKING (To replicate official sticker look)
              ══════════════════════════════════════════════════════════ */}
          <g filter="url(#sticker-glow)">
            {/* White outline silhouettes */}
            {/* Body & Hat Outer Silhouette */}
            <path
              d="M 85 110 C 85 70 120 40 180 40 C 235 40 265 70 265 110 L 265 240 L 95 240 Z"
              stroke="white"
              strokeWidth="22"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="white"
            />
          </g>

          {/* ══════════════════════════════════════════════════════════
              LEGS & BLACK SHOES
              ══════════════════════════════════════════════════════════ */}
          {/* Left Leg */}
          <rect x="135" y="235" width="16" height="30" rx="6" fill="#181818" stroke="white" strokeWidth="6" />
          <rect x="135" y="235" width="16" height="30" rx="6" fill="#181818" />

          {/* Right Leg */}
          <rect x="195" y="235" width="16" height="30" rx="6" fill="#181818" stroke="white" strokeWidth="6" />
          <rect x="195" y="235" width="16" height="30" rx="6" fill="#181818" />

          {/* Left Shoe */}
          <g>
            {/* Outer white sticker border */}
            <path
              d="M 115 258 C 115 250 148 248 162 255 C 168 259 168 272 160 274 C 145 277 115 275 115 258 Z"
              stroke="white"
              strokeWidth="10"
              strokeLinejoin="round"
              fill="white"
            />
            {/* Shoe Body */}
            <path
              d="M 118 260 C 118 252 146 250 159 256 C 165 260 164 270 156 272 C 142 275 118 273 118 260 Z"
              fill="#181818"
              stroke="#0a0a0a"
              strokeWidth="3.5"
            />
            {/* Shoe Highlight / Sole */}
            <path d="M 124 269 Q 140 272 154 269" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Right Shoe */}
          <g>
            {/* Outer white sticker border */}
            <path
              d="M 185 258 C 185 250 218 248 232 255 C 238 259 238 272 230 274 C 215 277 185 275 185 258 Z"
              stroke="white"
              strokeWidth="10"
              strokeLinejoin="round"
              fill="white"
            />
            {/* Shoe Body */}
            <path
              d="M 188 260 C 188 252 216 250 229 256 C 235 260 234 270 226 272 C 212 275 188 273 188 260 Z"
              fill="#181818"
              stroke="#0a0a0a"
              strokeWidth="3.5"
            />
            {/* Shoe Highlight / Sole */}
            <path d="M 194 269 Q 210 272 224 269" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* ══════════════════════════════════════════════════════════
              LEFT ARM & GLOVE (Viewer's Left - outstretched friendly arm)
              ══════════════════════════════════════════════════════════ */}
          <motion.g
            animate={{
              rotate: isSpeaking ? [-4, 6, -4] : isListening ? [0, 4, 0] : [0, 3, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: isSpeaking ? 0.7 : 2,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "115px 185px" }}
          >
            {/* Arm Sticker border */}
            <path d="M 115 185 Q 85 185 65 200" stroke="white" strokeWidth="24" strokeLinecap="round" />
            {/* Red Arm */}
            <path d="M 115 185 Q 85 185 65 200" stroke="#bf1f25" strokeWidth="15" strokeLinecap="round" />
            <path d="M 115 185 Q 85 185 65 200" stroke="#181818" strokeWidth="3" fill="none" />

            {/* White Glove */}
            <g transform="translate(42, 178) rotate(-15)">
              {/* White glove sticker border */}
              <circle cx="22" cy="22" r="19" fill="white" stroke="white" strokeWidth="8" />
              {/* Glove main body */}
              <circle cx="22" cy="22" r="17" fill="#ffffff" stroke="#181818" strokeWidth="3.5" />
              {/* Thumb */}
              <ellipse cx="34" cy="16" rx="8" ry="6" fill="#ffffff" stroke="#181818" strokeWidth="3" transform="rotate(-30 34 16)" />
              {/* Finger lines */}
              <path d="M 16 16 C 14 22 17 28 20 30" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 23 15 C 23 21 25 27 27 29" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
              {/* Glove Cuff */}
              <ellipse cx="14" cy="28" rx="8" ry="5" fill="#ffffff" stroke="#181818" strokeWidth="3" transform="rotate(40 14 28)" />
            </g>
          </motion.g>

          {/* ══════════════════════════════════════════════════════════
              RIGHT ARM & GLOVE (Viewer's Right - cheerful raised wave!)
              ══════════════════════════════════════════════════════════ */}
          <motion.g
            animate={{
              rotate: isSpeaking
                ? [-8, 16, -8]
                : isListening
                ? [5, 18, 5]
                : [-2, 12, -2],
            }}
            transition={{
              repeat: Infinity,
              duration: isSpeaking ? 0.5 : isListening ? 1.2 : 2.2,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "235px 185px" }}
          >
            {/* Arm Sticker border */}
            <path d="M 230 185 Q 260 175 278 150" stroke="white" strokeWidth="24" strokeLinecap="round" />
            {/* Red Arm */}
            <path d="M 230 185 Q 260 175 278 150" stroke="#bf1f25" strokeWidth="15" strokeLinecap="round" />
            <path d="M 230 185 Q 260 175 278 150" stroke="#181818" strokeWidth="3" fill="none" />

            {/* White Glove waving */}
            <g transform="translate(262, 126) rotate(20)">
              {/* White glove sticker border */}
              <circle cx="22" cy="22" r="19" fill="white" stroke="white" strokeWidth="8" />
              {/* Glove main body */}
              <circle cx="22" cy="22" r="17" fill="#ffffff" stroke="#181818" strokeWidth="3.5" />
              {/* Waving Thumb */}
              <ellipse cx="10" cy="18" rx="8" ry="6" fill="#ffffff" stroke="#181818" strokeWidth="3" transform="rotate(30 10 18)" />
              {/* Finger lines */}
              <path d="M 20 12 C 22 18 20 25 18 28" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 27 15 C 28 20 27 26 25 29" stroke="#181818" strokeWidth="2.5" strokeLinecap="round" />
              {/* Glove Cuff */}
              <ellipse cx="28" cy="32" rx="9" ry="5" fill="#ffffff" stroke="#181818" strokeWidth="3" transform="rotate(-20 28 32)" />
            </g>
          </motion.g>

          {/* ══════════════════════════════════════════════════════════
              3D RED BRICK BODY
              ══════════════════════════════════════════════════════════ */}
          {/* 3D Right Side Depth */}
          <path
            d="M 230 135 L 260 148 L 260 236 L 230 225 Z"
            fill="#8a171c"
            stroke="#181818"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Mortar lines on 3D Right side */}
          <path d="M 230 162 L 260 175" stroke="#181818" strokeWidth="2.5" />
          <path d="M 230 192 L 260 205" stroke="#181818" strokeWidth="2.5" />
          <path d="M 245 142 L 245 168" stroke="#181818" strokeWidth="2" />
          <path d="M 245 198 L 245 228" stroke="#181818" strokeWidth="2" />

          {/* Front Brick Face */}
          <path
            d="M 112 135 L 230 135 L 230 225 L 112 225 Z"
            fill="#c9282d"
            stroke="#181818"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Front Mortar Lines (Standard staggered brick pattern) */}
          {/* Horizontal brick divider 1 */}
          <line x1="112" y1="162" x2="230" y2="162" stroke="#181818" strokeWidth="3" />
          {/* Horizontal brick divider 2 */}
          <line x1="112" y1="192" x2="230" y2="192" stroke="#181818" strokeWidth="3" />

          {/* Vertical staggered bricks */}
          {/* Row 1 verticals */}
          <line x1="145" y1="135" x2="145" y2="162" stroke="#181818" strokeWidth="2.5" />
          <line x1="195" y1="135" x2="195" y2="162" stroke="#181818" strokeWidth="2.5" />
          {/* Row 2 verticals (behind eyes / mouth) */}
          <line x1="171" y1="162" x2="171" y2="192" stroke="#181818" strokeWidth="2.5" opacity="0.4" />
          {/* Row 3 verticals */}
          <line x1="145" y1="192" x2="145" y2="225" stroke="#181818" strokeWidth="2.5" />
          <line x1="195" y1="192" x2="195" y2="225" stroke="#181818" strokeWidth="2.5" />

          {/* ══════════════════════════════════════════════════════════
              EYES (Classic 1930s rubber-hose cartoon oval eyes)
              ══════════════════════════════════════════════════════════ */}
          {/* Left Eye */}
          <g>
            {/* White Sclera */}
            <motion.ellipse
              cx="145"
              cy="166"
              rx="15"
              ry="22"
              fill="#ffffff"
              stroke="#181818"
              strokeWidth="3.5"
              animate={{
                scaleY: isProcessing ? [1, 0.2, 1] : [1, 1, 0.08, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: isProcessing ? 2.5 : 4.5,
                times: isProcessing ? [0, 0.1, 0.2] : [0, 0.75, 0.8, 0.85],
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "145px 166px" }}
            />
            {/* Left Pupil (Black oval with white crescent highlight) */}
            <motion.g
              animate={{
                x: isListening ? 3 : isProcessing ? 4 : isSpeaking ? [-1, 2, -1] : 0,
                y: isListening ? -2 : isProcessing ? -4 : 0,
              }}
              transition={{ duration: 0.4 }}
            >
              <ellipse cx="145" cy="166" rx="10" ry="17" fill="#181818" />
              {/* Crescent reflection highlight */}
              <ellipse cx="142" cy="164" rx="3.5" ry="8" fill="#ffffff" opacity="0.95" />
            </motion.g>
          </g>

          {/* Right Eye */}
          <g>
            {/* White Sclera */}
            <motion.ellipse
              cx="195"
              cy="166"
              rx="15"
              ry="22"
              fill="#ffffff"
              stroke="#181818"
              strokeWidth="3.5"
              animate={{
                scaleY: isProcessing ? [1, 0.2, 1] : [1, 1, 0.08, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: isProcessing ? 2.5 : 4.5,
                times: isProcessing ? [0, 0.1, 0.2] : [0, 0.75, 0.8, 0.85],
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "195px 166px" }}
            />
            {/* Right Pupil */}
            <motion.g
              animate={{
                x: isListening ? 3 : isProcessing ? 4 : isSpeaking ? [-1, 2, -1] : 0,
                y: isListening ? -2 : isProcessing ? -4 : 0,
              }}
              transition={{ duration: 0.4 }}
            >
              <ellipse cx="195" cy="166" rx="10" ry="17" fill="#181818" />
              {/* Crescent reflection highlight */}
              <ellipse cx="192" cy="164" rx="3.5" ry="8" fill="#ffffff" opacity="0.95" />
            </motion.g>
          </g>

          {/* ══════════════════════════════════════════════════════════
              MOUTH (Animated for speaking, smiling for idle)
              ══════════════════════════════════════════════════════════ */}
          {!isSpeaking ? (
            /* Classic cute smile */
            <motion.path
              d={
                isListening
                  ? "M 160 186 Q 170 195 180 186"
                  : isProcessing
                  ? "M 163 187 Q 170 188 177 187"
                  : "M 158 185 Q 170 196 182 185"
              }
              stroke="#181818"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              transition={{ duration: 0.3 }}
            />
          ) : (
            /* Animated talking open mouth with tongue */
            <motion.g
              animate={{
                scaleY: [1, 1.45, 0.8, 1.3, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.35,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "170px 188px" }}
            >
              <path
                d="M 158 184 Q 170 180 182 184 Q 170 204 158 184 Z"
                fill="#181818"
                stroke="#181818"
                strokeWidth="2.5"
              />
              {/* Cute Pink Tongue inside mouth */}
              <path
                d="M 164 195 Q 170 190 176 195 Q 170 202 164 195 Z"
                fill="#ff6b81"
              />
            </motion.g>
          )}

          {/* ══════════════════════════════════════════════════════════
              BLUE BASEBALL CAP WITH "TARCIAN" EMBROIDERY
              ══════════════════════════════════════════════════════════ */}
          {/* Cap Crown / Dome */}
          <path
            d="M 98 128 C 95 62 145 42 180 42 C 225 42 260 70 262 138 C 250 148 235 152 220 152 C 170 152 115 146 98 128 Z"
            fill="#1c5db6"
            stroke="#181818"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Cap Panel Stitch Line */}
          <path d="M 180 42 Q 185 85 190 120" stroke="#124385" strokeWidth="2.5" fill="none" opacity="0.6" />

          {/* Cap Top Button */}
          <ellipse cx="180" cy="42" rx="7" ry="4" fill="#124385" stroke="#181818" strokeWidth="2.5" />

          {/* White "TARCIAN" Text Embroidered on the Cap */}
          <g transform="translate(180, 88) rotate(-4)">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="20"
              fontWeight="900"
              fontFamily="Arial Black, Impact, sans-serif"
              letterSpacing="0.5"
              style={{
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))",
                textTransform: "uppercase",
              }}
            >
              TARCIAN
            </text>
          </g>

          {/* Cap Visor / Curved Brim */}
          <path
            d="M 94 122 C 90 135 125 152 180 150 C 230 148 255 125 258 116 C 255 106 220 124 175 126 C 125 128 98 115 94 122 Z"
            fill="#164d99"
            stroke="#181818"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Brim Underside Highlight */}
          <path
            d="M 102 124 Q 170 145 245 122"
            stroke="#307be0"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      </motion.div>
    </div>
  );
}
