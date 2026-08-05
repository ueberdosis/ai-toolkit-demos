"use client";

export type SegmentedOption = {
  id: string;
  label: string;
};

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div
      className="grid w-full gap-0 rounded-lg bg-[var(--gray-2)] p-0.5"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          // Marked important: some demos ship an unlayered global `button` rule, which would
          // otherwise beat these utilities no matter how specific they are.
          className={`flex min-h-6 cursor-pointer items-center justify-center rounded-md! px-1.5! py-0! text-xs! font-medium leading-[1.15] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] ${
            value === option.id
              ? "bg-white! text-[var(--black-contrast)]! hover:bg-white!"
              : "bg-transparent! text-[var(--gray-5)]! hover:bg-transparent! hover:text-[var(--black)]!"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
