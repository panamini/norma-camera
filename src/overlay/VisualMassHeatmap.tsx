import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeVisualMassDebug } from '../detection/nativeHeuristicTypes';

type Props = {
  width: number;
  height: number;
  debug: NativeVisualMassDebug | null;
};

function alphaForEnergy(energy: number): number {
  return Math.max(0.08, Math.min(0.28, 0.06 + energy * 0.22));
}

function VisualMassHeatmapComponent({ width, height, debug }: Props) {
  if (!debug || width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {debug.cells.map((cell, index) => (
        <View
          key={`${cell.x}-${cell.y}-${index}`}
          style={[
            styles.cell,
            {
              left: cell.x * width,
              top: cell.y * height,
              width: cell.width * width,
              height: cell.height * height,
              backgroundColor: `rgba(255, 196, 64, ${alphaForEnergy(cell.energy)})`
            }
          ]}
        />
      ))}
      {debug.selectedCandidate ? (
        <View
          style={[
            styles.selectedBounds,
            {
              left: debug.selectedCandidate.bounds.x * width,
              top: debug.selectedCandidate.bounds.y * height,
              width: debug.selectedCandidate.bounds.width * width,
              height: debug.selectedCandidate.bounds.height * height
            }
          ]}
        />
      ) : null}
      {debug.stabilizedCandidate ? (
        <View
          style={[
            styles.stabilizedBounds,
            {
              left: debug.stabilizedCandidate.bounds.x * width,
              top: debug.stabilizedCandidate.bounds.y * height,
              width: debug.stabilizedCandidate.bounds.width * width,
              height: debug.stabilizedCandidate.bounds.height * height
            }
          ]}
        />
      ) : null}
      <View style={styles.label}>
        <Text style={styles.labelText}>CONTRAST MASS · NOT OBJECT DETECTION</Text>
      </View>
    </View>
  );
}

export const VisualMassHeatmap = memo(VisualMassHeatmapComponent);

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  selectedBounds: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6ee7ff'
  },
  stabilizedBounds: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#84f28f'
  },
  label: {
    position: 'absolute',
    right: 10,
    top: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  labelText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '800'
  }
});
