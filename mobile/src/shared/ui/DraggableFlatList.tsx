'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FlatList, View, StyleSheet, Animated, PanResponder, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface DraggableFlatListProps<T> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  refreshControl?: React.ReactNode;
  contentContainerStyle?: any;
  ListEmptyComponent?: React.ReactNode;
}

export function DraggableFlatList<T extends { id: string }>({
  data,
  renderItem,
  keyExtractor,
  onDragEnd,
  ListHeaderComponent,
  ListFooterComponent,
  refreshControl,
  contentContainerStyle,
  ListEmptyComponent,
}: DraggableFlatListProps<T>) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(new Animated.Value(0));
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        dragY.setOffset(gestureState.y0);
        dragY.setValue(0);
      },
      onPanResponderMove: (e, gestureState) => {
        dragY.setValue(gestureState.moveY);
      },
      onPanResponderRelease: (e, gestureState) => {
        dragY.flattenOffset();
        // Calculate target index based on drag distance
        const avgHeight = 100; // approximate
        const deltaIndex = Math.round(gestureState.moveY / avgHeight);
        // This is simplified - in real implementation you'd calculate based on actual positions
      },
    })
  ).current;

  const handleLayout = useCallback((index: number) => (e: any) => {
    const height = e.nativeEvent.layout.height;
    setItemHeights(prev => {
      const next = new Map(prev);
      next.set(index, height);
      return next;
    });
  }, []);

  const animatedStyle = (index: number) => {
    if (draggingIndex === index) {
      return {
        transform: [{ translateY: dragY }],
        zIndex: 100,
        opacity: 0.8,
      };
    }
    return {};
  };

  const isItemDragging = (index: number) => draggingIndex === index;

  // Wrap renderItem to add drag handling
  const wrappedRenderItem = useCallback(({ item, index }: { item: T; index: number }) => {
    const layoutHandler = handleLayout(index);
    const children = renderItem({ item, index });
    
    return (
      <Animated.View style={[animatedStyle(index), styles.itemContainer]} onLayout={layoutHandler}>
        {Platform.OS === 'web' ? children : (
          <View {...panResponder.panHandlers}>
            {children}
          </View>
        )}
      </Animated.View>
    );
  }, [renderItem, draggingIndex, dragY]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlatList
        data={data}
        renderItem={wrappedRenderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        ListEmptyComponent={ListEmptyComponent}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 100,
  },
  itemContainer: {
    // Styles applied to each item wrapper
  },
});

export default DraggableFlatList;