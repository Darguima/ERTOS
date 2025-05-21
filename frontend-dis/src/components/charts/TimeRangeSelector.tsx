import { Calendar } from 'lucide-react';
import { TimeRangeSelectorProps, TimeButtonProps } from '../../types/chart';

const TimeButton = ({ active, onClick, text }: TimeButtonProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded ${
      active 
        ? 'bg-blue-100 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {text}
  </button>
);

export const TimeRangeSelector = ({ timeRange, setTimeRange }: TimeRangeSelectorProps) => (
  <div className="flex items-center space-x-2 border rounded-lg p-1">
    <TimeButton 
      active={timeRange === 'day'} 
      onClick={() => setTimeRange('day')}
      text="Day"
    />
    <TimeButton 
      active={timeRange === 'week'} 
      onClick={() => setTimeRange('week')}
      text="Week"
    />
    <TimeButton 
      active={timeRange === 'month'} 
      onClick={() => setTimeRange('month')}
      text="Month"
    />
    <button className="p-2 hover:bg-gray-100 rounded">
      <Calendar className="w-4 h-4 text-gray-600" />
    </button>
  </div>
);