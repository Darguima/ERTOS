
import { ChartDataPoint } from '../types/chart';

export const generateChartData = (timeRange: 'day' | 'week' | 'month'): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let length: number;
  
  // Temperature generation helper for consistency
  const generateTemperature = (hour: number) => {
    // Simulate temperature curve: cooler at night, warmer during day
    const baseTemp = 20; // Base temperature
    const amplitude = 8; // Temperature variation
    const hourOffset = (hour + 6) % 24; // Shift curve so lowest temp is at 6AM
    return baseTemp + amplitude * Math.sin((hourOffset / 24) * Math.PI * 2);
  };
  
  switch (timeRange) {
    case 'day':
      length = 24;
      for (let i = 0; i < length; i++) {
        const temp = generateTemperature(i);
        data.push({
          date: `${i.toString().padStart(2, '0')}:00`,
          production: Math.random() * 15 + (temp - 15), // Production correlates with temperature
          consumption: Math.random() * 25 + 15,
          efficiency: Math.floor(Math.random() * 20 + 80),
          weather: temp > 25 ? 'sunny' : 'cloudy',
          temperature: temp,
          timestamp: `${i.toString().padStart(2, '0')}:00`
        });
      }
      break;
    
    case 'week':
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      length = 7;
      for (let i = 0; i < length; i++) {
        const temp = 20 + Math.random() * 16;
        data.push({
          date: days[i],
          production: Math.random() * 15 + (temp - 15),
          consumption: Math.random() * 25 + 15,
          efficiency: Math.floor(Math.random() * 20 + 80),
          weather: temp > 25 ? 'sunny' : 'cloudy',
          temperature: temp
        });
      }
      break;
    
    default: // month
      length = 30;
      for (let i = 0; i < length; i++) {
        const temp = 20 + Math.random() * 16;
        data.push({
          date: `${i + 1}`,
          production: Math.random() * 15 + (temp - 15),
          consumption: Math.random() * 25 + 15,
          efficiency: Math.floor(Math.random() * 20 + 80),
          weather: temp > 25 ? 'sunny' : 'cloudy',
          temperature: temp
        });
      }
  }

  return data;
};

