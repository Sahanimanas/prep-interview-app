import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';
import Markdown, { type ASTNode, type RenderRules } from 'react-native-markdown-display';

import { Text } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.codeBlock, { backgroundColor: theme.codeBackground, borderColor: theme.border }]}>
      {language ? (
        <Text variant="overline" color={theme.textMuted} style={styles.codeLang}>
          {language}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.codeScroll}>
        <Text selectable style={[styles.codeText, { color: theme.codeText, fontFamily: Fonts?.mono }]}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

function renderCode(node: ASTNode): ReactNode {
  const language = (node as ASTNode & { sourceInfo?: string }).sourceInfo?.trim().split(/\s+/)[0];
  return <CodeBlock key={node.key} code={node.content.replace(/\n+$/, '')} language={language || undefined} />;
}

const rules: RenderRules = {
  fence: renderCode,
  code_block: renderCode,
};

export interface MarkdownViewProps {
  children: string;
  /** Slightly smaller body text (e.g. inside cards). */
  compact?: boolean;
}

export function MarkdownView({ children, compact = false }: MarkdownViewProps) {
  const theme = useTheme();
  const bodySize = compact ? 15 : 16;
  const mono = Fonts?.mono;

  const markdownStyles: Record<string, TextStyle | ViewStyle> = {
    body: { color: theme.text, fontSize: bodySize, lineHeight: bodySize * 1.55 },
    heading1: { color: theme.text, fontSize: 24, lineHeight: 30, fontWeight: '700', marginTop: Spacing.three, marginBottom: Spacing.two },
    heading2: { color: theme.text, fontSize: 20, lineHeight: 26, fontWeight: '700', marginTop: Spacing.three, marginBottom: Spacing.two },
    heading3: { color: theme.text, fontSize: 17, lineHeight: 24, fontWeight: '700', marginTop: Spacing.three - 4, marginBottom: Spacing.one },
    heading4: { color: theme.text, fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: Spacing.two },
    paragraph: { marginTop: 0, marginBottom: Spacing.three - 4 },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    link: { color: theme.primary, textDecorationLine: 'underline' },
    bullet_list: { marginBottom: Spacing.two },
    ordered_list: { marginBottom: Spacing.two },
    list_item: { marginBottom: Spacing.one },
    bullet_list_icon: { color: theme.primary, marginRight: Spacing.two },
    ordered_list_icon: { color: theme.primary, marginRight: Spacing.two },
    code_inline: {
      fontFamily: mono,
      fontSize: bodySize - 2,
      backgroundColor: theme.surfaceMuted,
      color: theme.primary,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    blockquote: {
      backgroundColor: theme.primaryMuted,
      borderLeftColor: theme.primary,
      borderLeftWidth: 3,
      paddingHorizontal: Spacing.three - 4,
      paddingVertical: Spacing.two,
      marginVertical: Spacing.two,
      borderRadius: 4,
    },
    hr: { backgroundColor: theme.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.three },
    table: { borderWidth: 1, borderColor: theme.border, borderRadius: Radius.sm, marginBottom: Spacing.three - 4 },
    thead: { backgroundColor: theme.surfaceMuted },
    th: { padding: Spacing.two, borderColor: theme.border },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
    td: { padding: Spacing.two, borderColor: theme.border },
  };

  return (
    <Markdown
      style={markdownStyles}
      rules={rules}
      onLinkPress={(url) => {
        void Linking.openURL(url);
        return false;
      }}>
      {children}
    </Markdown>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.three - 4,
    overflow: 'hidden',
  },
  codeLang: {
    paddingHorizontal: Spacing.three - 4,
    paddingTop: Spacing.two,
  },
  codeScroll: {
    padding: Spacing.three - 4,
  },
  codeText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
