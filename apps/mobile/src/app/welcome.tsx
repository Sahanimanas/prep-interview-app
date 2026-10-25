import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { RocketIllustration } from '@/components/illustrations';
import { Float } from '@/components/motion/pulse';
import { Button, Card, Icon, Screen, Text, type IconName } from '@/components/ui';
import { Radius, Spacing, type GradientName } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useGradients } from '@/hooks/use-theme';

const FEATURES: { icon: IconName; title: string; body: string; gradient: GradientName }[] = [
  {
    icon: 'calendar',
    title: 'A plan built for your interview',
    body: 'Tell us the role, the stack and how many days you have. Get a day-by-day journey.',
    gradient: 'brand',
  },
  {
    icon: 'book',
    title: 'Learn, then prove it',
    body: 'AI lessons, flashcards with model answers and quizzes for every topic. Earn XP as you go.',
    gradient: 'ocean',
  },
  {
    icon: 'chat',
    title: 'Realistic mock interviews',
    body: 'Practice with an AI interviewer that scores every answer and hands you a scorecard.',
    gradient: 'warm',
  },
];

function FeatureCard({ feature, index, wide }: { feature: (typeof FEATURES)[number]; index: number; wide: boolean }) {
  const gradients = useGradients();
  return (
    <Animated.View entering={FadeInDown.delay(250 + index * 120).duration(450).springify()} style={wide ? styles.flex : undefined}>
      <Card style={styles.feature} level={2}>
        <LinearGradient colors={gradients[feature.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureIcon}>
          <Icon name={feature.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.featureText}>
          <Text variant="subheading">{feature.title}</Text>
          <Text variant="small" tone="textSecondary">
            {feature.body}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { isWide } = useResponsive();
  return (
    <Screen
      edges={['top', 'bottom']}
      backdrop
      wide={isWide}
      footer={
        <View style={[styles.actions, isWide && styles.actionsWide]}>
          <Button title="Get started — it's free" icon="arrowRight" iconPosition="right" size="lg" fullWidth onPress={() => router.push('/register')} />
          <Button title="I already have an account" variant="ghost" fullWidth onPress={() => router.push('/login')} />
        </View>
      }>
      <View style={styles.hero}>
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <Float distance={10}>
            <RocketIllustration size={isWide ? 260 : 210} />
          </Float>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.heroText}>
          <Text variant="overline" tone="primary" align="center">
            AI interview co-pilot
          </Text>
          <Text variant="hero" align="center">
            Walk in prepared.
          </Text>
          <Text variant="body" tone="textSecondary" align="center" style={styles.tagline}>
            PrepPilot turns "I have an interview in 10 days" into a personalised learning journey — lessons, flashcards,
            quizzes and mock interviews.
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.features, isWide && styles.featuresWide]}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} wide={isWide} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flexGrow: 1,
    flexBasis: 0,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heroText: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  tagline: {
    maxWidth: 420,
  },
  features: {
    gap: Spacing.three - 4,
  },
  featuresWide: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    gap: Spacing.three - 2,
    flexGrow: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.one,
  },
  actionsWide: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
