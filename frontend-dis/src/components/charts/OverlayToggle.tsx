import { OverlayToggleProps } from '../../types/chart';

export const OverlayToggle = ({ active, onClick, icon, text }: OverlayToggleProps) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm ${
      active 
        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
        : 'text-gray-600 hover:bg-gray-50 border'
    }`}
  >
    {icon}
    <span>{text}</span>
  </button>
);