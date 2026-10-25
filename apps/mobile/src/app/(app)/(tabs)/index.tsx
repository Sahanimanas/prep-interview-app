import { describeDaysRemaining } from '@preppilot/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AiUnavailableBanner } from '@/components/ai-callouts';
import { BooksIllustration, CompassIllustration } from '@/components/illustrations';
import { PlanCard } from '@/components/plan-card';
import { Button, EmptyState, ErrorState, HeroCard, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useGradients } from '@/hooks/use-theme';
import { useMe, usePlans } from '@/lib/queries';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Avatar({ name }: { name: string }) {
  const gradients = useGradients();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        <Text variant="smallStrong" color="#FFFFFF">
          {initials || '?'}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen() {
  const me = useMe();
  const plans = usePlans();
  const { isWide, isXL, columnWidth } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([plans.refetch(), me.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const firstName = me.data?.name.split(' ')[0];
  const newPlan = () => router.push('/plan/new');
  const columns = isXL ? 3 : isWide ? 2 : 1;
  const itemWidth = columns > 1 ? columnWidth(columns) : undefined;

  const active = (plans.data ?? []).filter((p) => p.status === 'ready' && p.daysRemaining >= 0);
  const next = [...active].sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const heroSubtitle = next
    ? `${describeDaysRemaining(next.daysRemaining)} · ${next.technology}. Small steps every day add up.`
    : 'Tell PrepPilot what your interview is about and get a day-by-day learning journey.';

  return (
    <Screen edges={['top']} backdrop wide refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="small" tone="textSecondary">
            {greeting()}
            {firstName ? `, ${firstName}` : ''} 👋
          </Text>
          <Text variant="title" accessibilityRole="header">
            Ready to level up?
          </Text>
        </View>
        {me.data ? <Avatar name={me.data.name} /> : null}
      </View>

      <HeroCard
        eyebrow={next ? 'Up next' : 'Start here'}
        title={next ? next.title : "Let's plan your prep"}
        subtitle={heroSubtitle}
        art={<CompassIllustration size={isWide ? 200 : 128} />}
        style={styles.hero}>
        <View style={styles.heroActions}>
          {next ? (
            <Button
              title="Continue"
              variant="light"
              icon="play"
              onPress={() => router.push({ pathname: '/plan/[planId]', params: { planId: next.id } })}
            />
          ) : null}
          <Button title="New plan" variant={next ? 'glass' : 'light'} icon="add" onPress={newPlan} />
        </View>
      </HeroCard>

      {me.data && !me.data.aiAvailable ? <AiUnavailableBanner style={styles.banner} /> : null}

      <SectionHeader
        title="Your plans"
        subtitle={plans.data && plans.data.length > 0 ? `${plans.data.length} plan${plans.data.length === 1 ? '' : 's'}` : undefined}
        style={styles.section}
      />

      {plans.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: columns }, (_, i) => (
            <View key={i} style={itemWidth ? { width: itemWidth } : styles.full}>
              <SkeletonCard lines={3} />
            </View>
          ))}
        </View>
      ) : plans.isError ? (
        <ErrorState error={plans.error} onRetry={() => void plans.refetch()} retrying={plans.isFetching} />
      ) : plans.data.length === 0 ? (
        <EmptyState
          illustration={<BooksIllustration size={200} />}
          title="No prep plans yet"
          message={'Try "Node.js backend role in 10 days" — PrepPilot asks a few questions, then builds your plan.'}
          actionLabel="Create your first plan"
          onAction={newPlan}
        />
      ) : (
        <View style={styles.grid}>
          {plans.data.map((plan, i) => (
            <Animated.View
              key={plan.id}
              entering={FadeInDown.delay(i * 70).duration(380).springify()}
              style={itemWidth ? { width: itemWidth } : styles.full}>
              <PlanCard plan={plan} />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: Spacing.three,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  banner: {
    marginBottom: Spacing.three,
  },
  section: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three - 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  full: {
    width: '100%',
  },
});
