
import { useState, useEffect, useMemo } from 'react';
import { ChartDataPoint } from '../types/chart';
import { database } from '../firebase/config';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { generateChartData } from '../utils/chartData'; // Keep for fallback

interface EnergyMetrics {
  currentProduction: number;
  dailyAverage: number;
  peakProduction: number;
  peakHour: number;
  currentEfficiency: number;
  performanceRatio: string;
  percentageChange: string;
  isIncrease: boolean;
  humidity?: number; // Added for SenseHat data
}

interface CachedData {
  day: ChartDataPoint[];
  week: ChartDataPoint[];
  month: ChartDataPoint[];
}

interface FirebaseData {
  consumption_wattage?: number;
  production_wattage?: number;
  temperature?: number;
  humidity?: number;
  timestamp: number;
}

export const useEnergyData = () => {
  // Cache data for each time range
  const [cachedData, setCachedData] = useState<CachedData>({
    day: [],
    week: [],
    month: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store the last update timestamp
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Set default house ID (should be configurable in a real app)
  const HOUSE_ID = "HOUSE_123"; // This should match what you use with mqtt_handler.py

  // Initialize data on mount
  useEffect(() => {
    fetchRealData();
  }, []);

  // Function to fetch real data from Firebase
  const fetchRealData = async () => {
    setIsLoading(true);
    try {
      // Reference to the latest data
      const dataRef = ref(database, `houses/${HOUSE_ID}`);
      
      // Create queries for different time periods
      const dayHours = 24;
      const weekHours = 24 * 7;
      const monthHours = 24 * 30;
      
      // Query for getting the latest entries
      const dataQuery = query(
        dataRef, 
        orderByChild('timestamp'),
        limitToLast(monthHours) // Get enough data for a month
      );
      
      onValue(dataQuery, (snapshot) => {
        if (!snapshot.exists()) {
          // If no data is available, use fallback generated data
          setCachedData({
            day: generateChartData('day'),
            week: generateChartData('week'),
            month: generateChartData('month'),
          });
          setError("No real-time data found. Using demo data.");
        } else {
          // Process the data
          const rawData: FirebaseData[] = [];
          snapshot.forEach((childSnapshot) => {
            const childData = childSnapshot.val();
            rawData.push(childData);
          });
          
          // Sort by timestamp
          rawData.sort((a, b) => a.timestamp - b.timestamp);
          
          // Process data for different time ranges
          setCachedData({
            day: processRawData(rawData, 'day', dayHours),
            week: processRawData(rawData, 'week', weekHours),
            month: processRawData(rawData, 'month', monthHours)
          });
          setError(null);
        }
        setIsLoading(false);
        setLastUpdate(new Date());
      }, {
        onlyOnce: false // Keep listening for updates
      });
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch energy data. Using demo data.");
      
      // Fallback to generated data
      setCachedData({
        day: generateChartData('day'),
        week: generateChartData('week'),
        month: generateChartData('month'),
      });
      setIsLoading(false);
      setLastUpdate(new Date());
    }
  };

  // Process the raw data into the format needed for charts
  const processRawData = (rawData: FirebaseData[], timeRange: 'day' | 'week' | 'month'): ChartDataPoint[] => {
    if (!rawData.length) return generateChartData(timeRange); // Use fallback data if no real data
    
    const result: ChartDataPoint[] = [];
    
    switch (timeRange) {
      case 'day':
        // Group data by hour
        const hourlyData = groupDataByHour(rawData);
        for (let hour = 0; hour < 24; hour++) {
          const hourData = hourlyData[hour] || [];
          const avgData = calculateAverageDataForPeriod(hourData);
          
          result.push({
            date: formatTime(hour),
            production: avgData.production,
            consumption: avgData.consumption,
            efficiency: calculateEfficiency(avgData.production, avgData.consumption),
            temperature: avgData.temperature,
            weather: avgData.temperature > 25 ? 'sunny' : 'cloudy',
            timestamp: formatTime(hour),
            humidity: avgData.humidity
          });
        }
        break;
        
      case 'week':
        // Group data by day of week
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyData = groupDataByDay(rawData);
        
        for (let i = 0; i < 7; i++) {
          const dayOfWeek = (new Date().getDay() + i) % 7;
          const dayName = days[dayOfWeek];
          const dayData = dailyData[dayOfWeek] || [];
          const avgData = calculateAverageDataForPeriod(dayData);
          
          result.push({
            date: dayName,
            production: avgData.production,
            consumption: avgData.consumption,
            efficiency: calculateEfficiency(avgData.production, avgData.consumption),
            temperature: avgData.temperature,
            weather: avgData.temperature > 25 ? 'sunny' : 'cloudy',
            humidity: avgData.humidity
          });
        }
        break;
        
      case 'month':
        // Group data by day of month
        const monthlyData = groupDataByDayOfMonth(rawData);
        const today = new Date().getDate();
        
        for (let i = 0; i < 30; i++) {
          const dayOfMonth = ((today - 1 + i) % 30) + 1;
          const dayData = monthlyData[dayOfMonth] || [];
          const avgData = calculateAverageDataForPeriod(dayData);
          
          result.push({
            date: `${dayOfMonth}`,
            production: avgData.production,
            consumption: avgData.consumption,
            efficiency: calculateEfficiency(avgData.production, avgData.consumption),
            temperature: avgData.temperature,
            weather: avgData.temperature > 25 ? 'sunny' : 'cloudy',
            humidity: avgData.humidity
          });
        }
        break;
    }
    
    return result;
  };

  // Helper functions for data processing
  const groupDataByHour = (data: FirebaseData[]): Record<number, FirebaseData[]> => {
    const result: Record<number, FirebaseData[]> = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      
      if (!result[hour]) {
        result[hour] = [];
      }
      
      result[hour].push(item);
    });
    
    return result;
  };
  
  const groupDataByDay = (data: FirebaseData[]): Record<number, FirebaseData[]> => {
    const result: Record<number, FirebaseData[]> = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      const day = date.getDay(); // 0-6, where 0 is Sunday
      
      if (!result[day]) {
        result[day] = [];
      }
      
      result[day].push(item);
    });
    
    return result;
  };
  
  const groupDataByDayOfMonth = (data: FirebaseData[]): Record<number, FirebaseData[]> => {
    const result: Record<number, FirebaseData[]> = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      const dayOfMonth = date.getDate(); // 1-31
      
      if (!result[dayOfMonth]) {
        result[dayOfMonth] = [];
      }
      
      result[dayOfMonth].push(item);
    });
    
    return result;
  };
  
  const calculateAverageDataForPeriod = (periodData: FirebaseData[]) => {
    if (!periodData.length) {
      return {
        production: 0,
        consumption: 0,
        temperature: 20,
        humidity: 50
      };
    }
    
    let totalProduction = 0;
    let totalConsumption = 0;
    let totalTemperature = 0;
    let totalHumidity = 0;
    
    periodData.forEach(item => {
      totalProduction += item.production_wattage || 0;
      totalConsumption += item.consumption_wattage || 0;
      totalTemperature += item.temperature || 0;
      totalHumidity += item.humidity || 0;
    });
    
    return {
      production: totalProduction / periodData.length / 1000, // Convert to kWh
      consumption: totalConsumption / periodData.length / 1000, // Convert to kWh
      temperature: totalTemperature / periodData.length,
      humidity: totalHumidity / periodData.length
    };
  };
  
  const calculateEfficiency = (production: number, consumption: number): number => {
    if (production === 0) return 0;
    // Calculate a simulated efficiency based on production vs. consumption
    // Higher is better, capped at 100
    const rawEfficiency = (production / (consumption || 1)) * 100;
    return Math.min(Math.max(Math.floor(rawEfficiency), 0), 100);
  };

  // Calculate current metrics
  const calculateMetrics = (data: ChartDataPoint[]): EnergyMetrics => {
    // Return default values if data is not yet loaded
    if (!data || data.length === 0) {
      return {
        currentProduction: 0,
        dailyAverage: 0,
        peakProduction: 0,
        peakHour: 0,
        currentEfficiency: 0,
        performanceRatio: "0.00",
        percentageChange: "0.0",
        isIncrease: false,
        humidity: 0,
      };
    }

    const currentHour = new Date().getHours();
    const currentIndex = Math.min(currentHour, data.length - 1);
    const currentData = data[currentIndex];

    if (!currentData) {
      console.error('No data available for current hour:', currentHour);
      return {
        currentProduction: 0,
        dailyAverage: 0,
        peakProduction: 0,
        peakHour: 0,
        currentEfficiency: 0,
        performanceRatio: "0.00",
        percentageChange: "0.0",
        isIncrease: false,
        humidity: 0,
      };
    }

    const dailyAverage = data.reduce((sum, point) => sum + point.production, 0) / data.length;
    const peakProduction = Math.max(...data.map(point => point.production));
    const peakHour = data.findIndex(point => point.production === peakProduction);
    
    // Ensure peak hour is valid
    const validPeakHour = Math.max(0, Math.min(23, peakHour));
    
    const yesterdayIndex = currentHour > 0 ? currentHour - 1 : data.length - 1;
    const yesterdayProduction = data[yesterdayIndex]?.production || currentData.production;
    const percentageChange = ((currentData.production - yesterdayProduction) / yesterdayProduction * 100).toFixed(1);

    return {
      currentProduction: currentData.production,
      dailyAverage,
      peakProduction,
      peakHour: validPeakHour,
      currentEfficiency: currentData.efficiency,
      performanceRatio: (dailyAverage / (peakProduction || 1)).toFixed(2),
      percentageChange,
      isIncrease: !percentageChange.startsWith('-'),
      humidity: currentData.humidity || 0,
    };
  };

  // Format time consistently
  const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

    // Update data periodically
  useEffect(() => {
    const updateInterval = setInterval(() => {
      fetchRealData();
    }, 60 * 1000); // Update every minute

    return () => clearInterval(updateInterval);
  }, []);

  // Memoize metrics to prevent recalculation on rerenders
  const metrics = useMemo(() => calculateMetrics(cachedData.day), [cachedData.day]);

  return {
    data: cachedData,
    metrics,
    formatTime,
    lastUpdate,
    isLoading,
    error,
  };
};
