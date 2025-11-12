import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@trycompai/ui/select';
import { Input } from '@trycompai/ui/input';

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const presets = [7, 30, 90, 180];
  const isPreset = presets.includes(value);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={isPreset ? String(value) : 'custom'}
        onValueChange={(v) => {
          if (v !== 'custom') onChange(Number(v));
        }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p} value={String(p)}>
              {p} days
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isPreset && (
        <Input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24"
        />
      )}
    </div>
  );
}
