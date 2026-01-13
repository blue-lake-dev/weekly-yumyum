interface SectionHeaderProps {
  emoji: string;
  title: string;
}

export function SectionHeader({ emoji, title }: SectionHeaderProps) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
      <span>{emoji}</span>
      <span>{title}</span>
    </h2>
  );
}
