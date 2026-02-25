import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import Svg, { Ellipse, Circle, Path, G, Rect } from 'react-native-svg';
import { type BuddyStage, type BuddyMood } from '@/types';

interface BuddyProps {
  stage: BuddyStage;
  mood: BuddyMood;
  color: string;
  size?: number;
  goalType: 'gain' | 'lose';
  imageBase64?: string;
}

export default function BuddyMascot({ stage, mood, color, size = 200, goalType, imageBase64 }: BuddyProps) {
  if (imageBase64) {
    return (
      <View style={{
        width: size,
        height: size,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <Image
          source={{ uri: `data:image/png;base64,${imageBase64}` }}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="none"
        />
      </View>
    );
  }

  const dims = getBodyDimensions(stage, goalType);
  const moodFace = getMoodFace(mood);
  const darkerColor = adjustColorBrightness(color, -30);
  const lighterColor = adjustColorBrightness(color, 40);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Ellipse cx="100" cy="185" rx={dims.shadowRx} ry="6" fill="rgba(0,0,0,0.08)" />

        <G>
          <Ellipse
            cx="100"
            cy={dims.bodyY}
            rx={dims.bodyRx}
            ry={dims.bodyRy}
            fill={color}
          />
          <Ellipse
            cx="100"
            cy={dims.bodyY - dims.bodyRy * 0.15}
            rx={dims.bodyRx * 0.7}
            ry={dims.bodyRy * 0.5}
            fill={lighterColor}
            opacity={0.3}
          />
        </G>

        {renderArms(stage, goalType, color, darkerColor, dims)}
        {renderLegs(dims, darkerColor)}
        {renderFace(dims, moodFace, mood)}

        {stage >= 3 && goalType === 'gain' && renderMuscleLines(dims, darkerColor)}
        {stage >= 4 && goalType === 'lose' && renderFitLines(dims, darkerColor)}

        {mood === 'celebrating' && renderCelebration()}
        {mood === 'sleeping' && renderSleepZzz()}
        {mood === 'excited' && renderStars()}
      </Svg>
    </View>
  );
}

function getMoodAccent(mood: BuddyMood): string {
  switch (mood) {
    case 'happy': return '#FFD700';
    case 'excited': return '#FF6B6B';
    case 'celebrating': return '#58CC02';
    default: return '#FFD700';
  }
}

interface BodyDims {
  bodyRx: number;
  bodyRy: number;
  bodyY: number;
  shadowRx: number;
  armY: number;
  legSpread: number;
}

function getBodyDimensions(stage: BuddyStage, goalType: 'gain' | 'lose'): BodyDims {
  if (goalType === 'gain') {
    const configs: Record<BuddyStage, BodyDims> = {
      1: { bodyRx: 28, bodyRy: 38, bodyY: 120, shadowRx: 25, armY: 115, legSpread: 15 },
      2: { bodyRx: 33, bodyRy: 40, bodyY: 118, shadowRx: 28, armY: 113, legSpread: 17 },
      3: { bodyRx: 38, bodyRy: 42, bodyY: 116, shadowRx: 32, armY: 111, legSpread: 20 },
      4: { bodyRx: 42, bodyRy: 44, bodyY: 114, shadowRx: 36, armY: 108, legSpread: 22 },
      5: { bodyRx: 48, bodyRy: 46, bodyY: 112, shadowRx: 40, armY: 106, legSpread: 24 },
    };
    return configs[stage];
  }
  const configs: Record<BuddyStage, BodyDims> = {
    1: { bodyRx: 50, bodyRy: 48, bodyY: 112, shadowRx: 42, armY: 106, legSpread: 24 },
    2: { bodyRx: 44, bodyRy: 44, bodyY: 114, shadowRx: 38, armY: 108, legSpread: 22 },
    3: { bodyRx: 38, bodyRy: 42, bodyY: 116, shadowRx: 32, armY: 111, legSpread: 20 },
    4: { bodyRx: 33, bodyRy: 40, bodyY: 118, shadowRx: 28, armY: 113, legSpread: 18 },
    5: { bodyRx: 30, bodyRy: 38, bodyY: 120, shadowRx: 26, armY: 115, legSpread: 16 },
  };
  return configs[stage];
}

function renderArms(stage: BuddyStage, goalType: string, color: string, darkerColor: string, dims: BodyDims) {
  const isBuff = (goalType === 'gain' && stage >= 4) || (goalType === 'lose' && stage >= 4);
  const armThick = isBuff ? 10 : 7;

  const leftArmPath = isBuff
    ? `M${100 - dims.bodyRx - 2},${dims.armY} Q${100 - dims.bodyRx - 22},${dims.armY - 20} ${100 - dims.bodyRx - 15},${dims.armY - 35}`
    : `M${100 - dims.bodyRx - 2},${dims.armY} Q${100 - dims.bodyRx - 18},${dims.armY + 10} ${100 - dims.bodyRx - 12},${dims.armY + 22}`;

  const rightArmPath = isBuff
    ? `M${100 + dims.bodyRx + 2},${dims.armY} Q${100 + dims.bodyRx + 22},${dims.armY - 20} ${100 + dims.bodyRx + 15},${dims.armY - 35}`
    : `M${100 + dims.bodyRx + 2},${dims.armY} Q${100 + dims.bodyRx + 18},${dims.armY + 10} ${100 + dims.bodyRx + 12},${dims.armY + 22}`;

  return (
    <G>
      <Path d={leftArmPath} stroke={color} strokeWidth={armThick} strokeLinecap="round" fill="none" />
      <Path d={rightArmPath} stroke={color} strokeWidth={armThick} strokeLinecap="round" fill="none" />
      {isBuff && (
        <>
          <Circle cx={100 - dims.bodyRx - 15} cy={dims.armY - 35} r={5} fill={color} />
          <Circle cx={100 + dims.bodyRx + 15} cy={dims.armY - 35} r={5} fill={color} />
        </>
      )}
    </G>
  );
}

function renderLegs(dims: BodyDims, darkerColor: string) {
  const legTop = dims.bodyY + dims.bodyRy - 8;
  return (
    <G>
      <Path
        d={`M${100 - dims.legSpread},${legTop} L${100 - dims.legSpread - 3},${legTop + 20}`}
        stroke={darkerColor}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M${100 + dims.legSpread},${legTop} L${100 + dims.legSpread + 3},${legTop + 20}`}
        stroke={darkerColor}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx={100 - dims.legSpread - 4} cy={legTop + 22} rx={7} ry={4} fill={darkerColor} />
      <Ellipse cx={100 + dims.legSpread + 4} cy={legTop + 22} rx={7} ry={4} fill={darkerColor} />
    </G>
  );
}

interface MoodFace {
  eyeType: 'normal' | 'happy' | 'sad' | 'closed' | 'star';
  mouthType: 'smile' | 'grin' | 'sad' | 'open' | 'sleep' | 'neutral';
}

function getMoodFace(mood: BuddyMood): MoodFace {
  switch (mood) {
    case 'happy': return { eyeType: 'happy', mouthType: 'smile' };
    case 'excited': return { eyeType: 'star', mouthType: 'grin' };
    case 'hungry': return { eyeType: 'normal', mouthType: 'open' };
    case 'sad': return { eyeType: 'sad', mouthType: 'sad' };
    case 'sleeping': return { eyeType: 'closed', mouthType: 'sleep' };
    case 'celebrating': return { eyeType: 'star', mouthType: 'grin' };
    case 'neutral': return { eyeType: 'normal', mouthType: 'neutral' };
    default: return { eyeType: 'normal', mouthType: 'smile' };
  }
}

function renderFace(dims: BodyDims, face: MoodFace, mood: BuddyMood) {
  const faceY = dims.bodyY - dims.bodyRy * 0.2;
  const eyeSpacing = 14;

  return (
    <G>
      {renderEyes(face.eyeType, faceY, eyeSpacing)}
      {renderCheeks(faceY, eyeSpacing, mood)}
      {renderMouth(face.mouthType, faceY + 16)}
    </G>
  );
}

function renderEyes(type: string, y: number, spacing: number) {
  const leftX = 100 - spacing;
  const rightX = 100 + spacing;

  switch (type) {
    case 'happy':
      return (
        <G>
          <Path d={`M${leftX - 5},${y} Q${leftX},${y - 5} ${leftX + 5},${y}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M${rightX - 5},${y} Q${rightX},${y - 5} ${rightX + 5},${y}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'sad':
      return (
        <G>
          <Circle cx={leftX} cy={y} r={4} fill="#1A1A2E" />
          <Circle cx={rightX} cy={y} r={4} fill="#1A1A2E" />
          <Path d={`M${leftX - 4},${y - 6} L${leftX + 2},${y - 4}`} stroke="#1A1A2E" strokeWidth={1.5} strokeLinecap="round" />
          <Path d={`M${rightX + 4},${y - 6} L${rightX - 2},${y - 4}`} stroke="#1A1A2E" strokeWidth={1.5} strokeLinecap="round" />
        </G>
      );
    case 'closed':
      return (
        <G>
          <Path d={`M${leftX - 5},${y} L${leftX + 5},${y}`} stroke="#1A1A2E" strokeWidth={2} strokeLinecap="round" />
          <Path d={`M${rightX - 5},${y} L${rightX + 5},${y}`} stroke="#1A1A2E" strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'star':
      return (
        <G>
          <Path d={starPath(leftX, y, 5)} fill="#1A1A2E" />
          <Path d={starPath(rightX, y, 5)} fill="#1A1A2E" />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx={leftX} cy={y} r={4.5} fill="#1A1A2E" />
          <Circle cx={rightX} cy={y} r={4.5} fill="#1A1A2E" />
          <Circle cx={leftX + 1.5} cy={y - 1.5} r={1.5} fill="#FFFFFF" />
          <Circle cx={rightX + 1.5} cy={y - 1.5} r={1.5} fill="#FFFFFF" />
        </G>
      );
  }
}

function renderCheeks(y: number, spacing: number, mood: BuddyMood) {
  if (mood === 'sad' || mood === 'sleeping') return null;
  return (
    <G opacity={0.3}>
      <Ellipse cx={100 - spacing - 8} cy={y + 6} rx={5} ry={3} fill="#FF9999" />
      <Ellipse cx={100 + spacing + 8} cy={y + 6} rx={5} ry={3} fill="#FF9999" />
    </G>
  );
}

function renderMouth(type: string, y: number) {
  switch (type) {
    case 'smile':
      return <Path d={`M90,${y} Q100,${y + 10} 110,${y}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />;
    case 'grin':
      return (
        <G>
          <Path d={`M88,${y} Q100,${y + 14} 112,${y}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M90,${y + 1} Q100,${y + 12} 110,${y + 1}`} fill="#FF6B6B" opacity={0.5} />
        </G>
      );
    case 'sad':
      return <Path d={`M92,${y + 6} Q100,${y - 2} 108,${y + 6}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />;
    case 'open':
      return <Ellipse cx={100} cy={y + 3} rx={6} ry={8} fill="#1A1A2E" />;
    case 'sleep':
      return <Path d={`M95,${y + 2} Q100,${y + 5} 105,${y + 2}`} stroke="#1A1A2E" strokeWidth={2} fill="none" strokeLinecap="round" />;
    case 'neutral':
      return <Path d={`M93,${y + 2} L107,${y + 2}`} stroke="#1A1A2E" strokeWidth={2} strokeLinecap="round" />;
    default:
      return <Path d={`M90,${y} Q100,${y + 10} 110,${y}`} stroke="#1A1A2E" strokeWidth={2.5} fill="none" strokeLinecap="round" />;
  }
}

function renderMuscleLines(dims: BodyDims, darkerColor: string) {
  const cx = 100;
  const cy = dims.bodyY;
  return (
    <G opacity={0.25}>
      <Path d={`M${cx - 10},${cy + 5} Q${cx - 8},${cy + 12} ${cx - 12},${cy + 18}`} stroke={darkerColor} strokeWidth={1.5} fill="none" />
      <Path d={`M${cx + 10},${cy + 5} Q${cx + 8},${cy + 12} ${cx + 12},${cy + 18}`} stroke={darkerColor} strokeWidth={1.5} fill="none" />
    </G>
  );
}

function renderFitLines(dims: BodyDims, darkerColor: string) {
  const cx = 100;
  const cy = dims.bodyY;
  return (
    <G opacity={0.2}>
      <Path d={`M${cx - 8},${cy + 8} L${cx + 8},${cy + 8}`} stroke={darkerColor} strokeWidth={1} fill="none" />
      <Path d={`M${cx - 6},${cy + 14} L${cx + 6},${cy + 14}`} stroke={darkerColor} strokeWidth={1} fill="none" />
    </G>
  );
}

function renderCelebration() {
  return (
    <G>
      <Circle cx={60} cy={60} r={3} fill="#FFD700" />
      <Circle cx={140} cy={55} r={2.5} fill="#FF6B6B" />
      <Circle cx={50} cy={85} r={2} fill="#58CC02" />
      <Circle cx={150} cy={80} r={3} fill="#22D3EE" />
      <Rect x={70} y={50} width={3} height={8} fill="#FF9600" transform="rotate(20 71 54)" />
      <Rect x={125} y={48} width={3} height={8} fill="#A78BFA" transform="rotate(-15 126 52)" />
    </G>
  );
}

function renderSleepZzz() {
  return (
    <G>
      <Path d="M125,75 L135,75 L125,85 L135,85" stroke="#8B949E" strokeWidth={2} fill="none" />
      <Path d="M140,60 L152,60 L140,72 L152,72" stroke="#8B949E" strokeWidth={2.5} fill="none" opacity={0.6} />
    </G>
  );
}

function renderStars() {
  return (
    <G>
      <Path d={starPath(55, 70, 6)} fill="#FFD700" opacity={0.7} />
      <Path d={starPath(145, 65, 5)} fill="#FFD700" opacity={0.5} />
      <Path d={starPath(50, 100, 4)} fill="#FFD700" opacity={0.4} />
    </G>
  );
}

function starPath(cx: number, cy: number, r: number): string {
  let path = '';
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
    const ox = cx + r * Math.cos(outerAngle);
    const oy = cy + r * Math.sin(outerAngle);
    const ix = cx + (r * 0.4) * Math.cos(innerAngle);
    const iy = cy + (r * 0.4) * Math.sin(innerAngle);
    if (i === 0) path += `M${ox},${oy}`;
    else path += `L${ox},${oy}`;
    path += `L${ix},${iy}`;
  }
  path += 'Z';
  return path;
}

function adjustColorBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
