import { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: string;
  comparison?: ReactNode;
  icon: ReactNode;
}

export const StatCard = ({ title, value, comparison, icon }: StatCardProps) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex justify-between items-start">
      {icon}
    </div>
    <h3 className="text-gray-600 mt-2">{title}</h3>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {comparison && (
      <div className="text-sm mt-1 text-gray-500">{comparison}</div>
    )}
  </div>
);