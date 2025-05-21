import { ChartTabProps } from '../../types/chart';

export const ChartTab = ({ active, onClick, text }: ChartTabProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm ${
      active 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {text}
  </button>
);