import type { PlanDay } from '@preppilot/shared';
import { StyleSheet, View } from 'react-native';

import { Chip, ChipGroup, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export interface TopicPickerProps {
  days: PlanDay[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max: number;
}

/** Multi-select of plan topics grouped by day. Empty selection means "let the AI choose". */
export function TopicPicker({ days, selected, onChange, max }: TopicPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="smallStrong" tone="textSecondary">
          Topics (optional)
        </Text>
        {selected.length > 0 ? (
          <Text variant="smallStrong" tone="primary" onPress={() => onChange([])}>
            Clear ({selected.length})
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="textMuted">
        {selected.length === 0 ? 'None selected — the AI will mix topics from your plan.' : `Up to ${max} topics.`}
      </Text>
      {days.map((day) => (
        <View key={day.dayNumber} style={styles.day}>
          <Text variant="caption" tone="textSecondary">
            Day {day.dayNumber} · {day.theme}
          </Text>
          <ChipGroup>
            {day.topics.map((topic) => (
              <Chip
                key={topic.id}
                label={topic.title}
                selected={selected.includes(topic.id)}
                disabled={!selected.includes(topic.id) && selected.length >= max}
                onPress={() => toggle(topic.id)}
              />
            ))}
          </ChipGroup>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  day: {
    gap: Spacing.one + 2,
    marginTop: Spacing.one,
  },
});
