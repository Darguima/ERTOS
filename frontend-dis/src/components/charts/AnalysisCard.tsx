import { AnalysisCardProps } from '../../types/chart';

export const AnalysisCard = ({ title, items }: AnalysisCardProps) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="font-medium mb-4">{title}</h3>
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index}>
          <p className="text-sm text-gray-600">{item.label}</p>
          <p className="text-lg font-semibold mt-1">{item.value}</p>
          <p className="text-sm text-gray-500">{item.subtext}</p>
        </div>
      ))}
    </div>
  </div>
);