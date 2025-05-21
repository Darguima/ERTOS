
import { useState } from 'react';
import { Download, Sun, TrendingUp, Gauge, Cloud, Filter, ArrowUp, ArrowDown, Droplets, Settings } from 'lucide-react';
import { LineChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, BarChart, Bar } from 'recharts';
import { StatCard } from './StatCard';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ChartTab } from './ChartTab';
import { OverlayToggle } from './OverlayToggle';
import { AnalysisCard } from './AnalysisCard';
import { useEnergyData } from '../../hooks/useEnergyData';
import { ChartDataPoint } from '../../types/chart';
import SystemControls from '../controls/SystemControls';

const EnergyDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'performance'>('overview');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [showHumidityOverlay, setShowHumidityOverlay] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const { data, metrics, formatTime, isLoading, error } = useEnergyData();
  const HOUSE_ID = "HOUSE_123"; // This should match what you use with mqtt_handler.py
  const currentData = data[timeRange] || [];

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-medium text-gray-700">Loading energy data...</p>
      </div>
    );
  }

  // Error state
  if (error && !currentData.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
          <h3 className="text-xl font-semibold text-red-700 mb-2">Data Retrieval Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-gray-600">We're currently showing demo data. The real-time system might be offline or experiencing connectivity issues.</p>
        </div>
      </div>
    );
  }

  // Early return if no data is available
  if (!currentData.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-xl font-medium text-gray-700">No data available for the selected time range</p>
      </div>
    );
  }

  const TrendArrow = metrics.isIncrease ? 
    <ArrowUp className="w-4 h-4 text-green-500 inline mr-1" /> : 
    <ArrowDown className="w-4 h-4 text-red-500 inline mr-1" />;

  const getTimeRangeText = () => {
    switch (timeRange) {
      case 'day':
        return '24 Hour';
      case 'week':
        return '7 Day';
      case 'month':
        return '30 Day';
    }
  };

  const getChartTitle = () => {
    const timeRangeText = getTimeRangeText();
    switch (activeTab) {
      case 'overview':
        return `Energy Production vs Consumption - ${timeRangeText} View`;
      case 'production':
        return `Solar Production Analysis - ${timeRangeText} View`;
      case 'performance':
        return `System Performance - ${timeRangeText} View`;
      default:
        return '';
    }
  };

  const formatDateLabel = (date: string) => {
    switch (timeRange) {
      case 'day':
        return `Hour: ${date}`;
      case 'week':
        return `Day: ${date}`;
      default:
        return `Date: ${date}`;
    }
  };

  const renderChart = () => {
    if (!currentData.length) return null;

    switch (activeTab) {
      case 'production':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Solar Production (kWh)', angle: -90, position: 'insideLeft' }}
              />
              {showWeatherOverlay && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={[0, 36]}
                  label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight' }}
                />
              )}
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow">
                        <p className="font-medium">{formatDateLabel(data.date)}</p>
                        <p className="text-blue-600">Production: {data.production.toFixed(2)} kWh</p>
                        {showWeatherOverlay && (
                          <>
                            <p className="text-gray-600">Temperature: {data.temperature.toFixed(1)}°C</p>
                            {showHumidityOverlay && (
                              <p className="text-blue-400">Humidity: {(data.humidity || 0).toFixed(1)}%</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="production"
                fill="#2563eb"
                name="Production"
              />
              {showWeatherOverlay && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  name="Temperature"
                />
              )}
              {showWeatherOverlay && showHumidityOverlay && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#60a5fa"
                  strokeDasharray="5 5"
                  name="Humidity"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'performance':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis 
                label={{ value: 'System Efficiency (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow">
                        <p className="font-medium">{formatDateLabel(data.date)}</p>
                        <p className="text-green-600">Efficiency: {data.efficiency}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="efficiency" 
                stroke="#10b981" 
                name="Efficiency"
              />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }}
              />
              {showWeatherOverlay && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={[0, 36]}
                  label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight' }}
                />
              )}
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartDataPoint;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow">
                        <p className="font-medium">{formatDateLabel(data.date)}</p>
                        <p className="text-blue-600">Production: {data.production.toFixed(2)} kWh</p>
                        <p className="text-red-600">Consumption: {data.consumption.toFixed(2)} kWh</p>
                        {showWeatherOverlay && (
                          <>
                            <p className="text-gray-600">Temperature: {data.temperature.toFixed(1)}°C</p>
                            {showHumidityOverlay && (
                              <p className="text-blue-400">Humidity: {(data.humidity || 0).toFixed(1)}%</p>
                            )}
                            <p className="text-gray-600">Weather: {data.weather}</p>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="production"
                stroke="#2563eb"
                fill="#93c5fd"
                fillOpacity={0.3}
                name="Production"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="consumption"
                stroke="#dc2626"
                strokeWidth={2}
                name="Consumption"
              />
              {showWeatherOverlay && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  name="Temperature"
                />
              )}
              {showWeatherOverlay && showHumidityOverlay && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#60a5fa"
                  strokeDasharray="5 5"
                  name="Humidity"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  // Get the current weather data safely
  const getCurrentWeather = () => {
    const firstDataPoint = currentData[0];
    if (!firstDataPoint) {
      return {
        weather: 'N/A',
        temperature: 0
      };
    }
    return {
      weather: firstDataPoint.weather || 'N/A',
      temperature: firstDataPoint.temperature || 0
    };
  };

  const weatherData = getCurrentWeather();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-2">Energy Charts and Analytics</h1>
      {error ? (
        <p className="text-orange-500 mb-4 text-sm font-medium bg-orange-50 p-2 rounded">
          Using demo data - Real-time system is disconnected
        </p>
      ) : (
        <p className="text-green-500 mb-4 text-sm font-medium bg-green-50 p-2 rounded">
          Connected to Raspberry Pi SenseHat - Displaying real-time data
        </p>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Current Production"
          value={`${metrics.currentProduction.toFixed(1)} kW`}
          comparison={`Peak at ${formatTime(metrics.peakHour)}`}
          icon={<Sun className="w-6 h-6 text-yellow-500" />}
        />
        <StatCard
          title="Today's Generation"
          value={`${metrics.dailyAverage.toFixed(1)} kWh`}
          comparison={
            <span className="flex items-center">
              {TrendArrow}
              {metrics.isIncrease ? '+' : ''}{Math.abs(parseFloat(metrics.percentageChange))}% from previous
            </span>
          }
          icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="System Efficiency"
          value={`${metrics.currentEfficiency}%`}
          comparison="Based on current conditions"
          icon={<Gauge className="w-6 h-6 text-green-500" />}
        />
        <StatCard
          title="Humidity"
          value={`${metrics.humidity?.toFixed(1) || 0}%`}
          comparison="Current sensor reading"
          icon={<Droplets className="w-6 h-6 text-blue-400" />}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Energy Analytics</h2>
            <div className="flex items-center space-x-2">
              <ChartTab
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                text="Overview"
              />
              <ChartTab
                active={activeTab === 'production'}
                onClick={() => setActiveTab('production')}
                text="Production Analysis"
              />
              <ChartTab
                active={activeTab === 'performance'}
                onClick={() => setActiveTab('performance')}
                text="System Performance"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} />
            <button className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-4">
          {activeTab !== 'performance' && (
            <OverlayToggle
              active={showWeatherOverlay}
              onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
              icon={<Cloud className="w-4 h-4" />}
              text="Temperature"
            />
          )}
          {activeTab !== 'performance' && (
            <OverlayToggle
              active={showHumidityOverlay}
              onClick={() => setShowHumidityOverlay(!showHumidityOverlay)}
              icon={<Droplets className="w-4 h-4" />}
              text="Humidity"
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{getChartTitle()}</h3>
          </div>
        </div>

        <div className="p-6">
          <div className="h-96">
            {renderChart()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <AnalysisCard
          title="System Performance"
          items={[
            {
              label: "Peak Production Time",
              value: formatTime(metrics.peakHour),
              subtext: `${metrics.peakProduction.toFixed(1)} kWh peak generation`
            },
            {
              label: "Current Efficiency",
              value: `${metrics.currentEfficiency}%`,
              subtext: `Based on current conditions`
            }
          ]}
        />
        <AnalysisCard
          title="Production Analysis"
          items={[
            {
              label: "Daily Average",
              value: `${metrics.dailyAverage.toFixed(1)} kWh`,
              subtext: `Based on ${timeRange === 'day' ? '24 hours' : timeRange === 'week' ? '7 days' : '30 days'}`
            },
            {
              label: "Performance Ratio",
              value: metrics.performanceRatio,
              subtext: "Actual vs theoretical output"
            }
          ]}
        />
        <AnalysisCard
          title="Weather Impact"
          items={[
            {
              label: "Current Conditions",
              value: `${weatherData.weather}, ${weatherData.temperature.toFixed(1)}°C`,
              subtext: timeRange === 'day' ? `At ${currentData[0]?.date || 'N/A'}` : 'Current reading'
            },
            {
              label: "Production Forecast",
              value: `${(metrics.currentProduction * 1.1).toFixed(1)} kWh`,
              subtext: "Expected output based on conditions"
            }
          ]}
        />
      </div>

      <div className="flex justify-between items-center mt-8 mb-4">
        <h2 className="text-xl font-semibold">System Controls</h2>
        <button 
          onClick={() => setShowControls(!showControls)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
        >
          <Settings className="w-4 h-4" />
          <span>{showControls ? "Hide Controls" : "Show Controls"}</span>
        </button>
      </div>

      {showControls && (
        <SystemControls houseId={HOUSE_ID} />
      )}
    </div>
  );
};

export default EnergyDashboard;
