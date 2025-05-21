
import { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: string;
  comparison?: ReactNode;
  icon: ReactNode;
}

export interface TimeRangeSelectorProps {
  timeRange: 'day' | 'week' | 'month';
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
}

export interface TimeButtonProps {
  active: boolean;
  onClick: () => void;
  text: string;
}

export interface ChartTabProps {
  active: boolean;
  onClick: () => void;
  text: string;
}

export interface OverlayToggleProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  text: string;
  disabled?: boolean;
}

export interface AnalysisCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
    subtext: string;
  }>;
}

export interface ChartDataPoint {
  date: string;
  production: number;
  consumption: number;
  efficiency: number;
  weather: 'cloudy' | 'sunny';
  temperature: number;
  timestamp?: string;
  humidity?: number;
}

