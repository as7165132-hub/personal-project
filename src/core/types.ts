/**
 * SURFACE DEBUT - Core Type Definitions
 * 상태, 모드, 설정에 대한 타입 정의
 */

export type AppState = 'DEFAULT_2D' | 'SWITCHING' | 'SURFACE_ISO';

export type AppMode = 'default' | 'april' | 'midsommar';

export type Language = 'KR' | 'EN';

export interface CameraConfig {
  rx: number; // rotateX in degrees
  rz: number; // rotateZ in degrees
  ty?: number; // translateY in px
  tyVh?: number; // translateY in vh
  scale: number;
}

export interface ThresholdConfig {
  clicks: number;
  hoverMs: number;
  dragCount: number;
}

export interface MotionConfig {
  switchMs: number;
  easing: string;
  bubbleFloatMs: number;
  cardSkewMax: number;
  cardTranslateZ: number;
}

export interface Settings {
  modes: Record<AppMode, boolean>;
  specialDays: Record<string, string>;
  threshold: ThresholdConfig;
  camera: {
    top: CameraConfig;
    iso: CameraConfig;
  };
  motion: MotionConfig;
  a11y: {
    reducedMotion: boolean;
    keyboardEnabled: boolean;
  };
  performance: {
    targetFps: number;
    lcpMs: number;
    bundleKbGzip: number;
    maxDrawCalls: number;
  };
}

export interface CopyData {
  [lang: string]: {
    [key: string]: string;
  };
}

export interface StateTransitionEvent {
  from: AppState;
  to: AppState;
  timestamp: number;
}

export type EventCallback = (event: StateTransitionEvent) => void;
