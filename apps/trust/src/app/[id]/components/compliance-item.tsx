interface ComplianceItemProps {
  text: string;
  isCompliant: boolean;
}

export default function ComplianceItem({ text, isCompliant }: ComplianceItemProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{text}</span>
      {isCompliant ? (
        <div className="h-2 w-2 rounded-full bg-green-500" />
      ) : (
        <div className="h-2 w-2 rounded-full bg-red-500" />
      )}
    </div>
  );
}
