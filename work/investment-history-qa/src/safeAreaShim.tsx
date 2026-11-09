import { PropsWithChildren } from 'react';
import { View } from 'react-native';

export function SafeAreaProvider({ children }: PropsWithChildren) {
  return children;
}

export function SafeAreaView({ children, style }: PropsWithChildren<{ edges?: string[]; style?: unknown }>) {
  return <View style={style}>{children}</View>;
}
