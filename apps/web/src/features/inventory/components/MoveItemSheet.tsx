import LocationPicker from './LocationPicker';

interface Props {
  itemId: string;
  currentParentId: string | null;
  onMove: (newParentId: string | null) => Promise<boolean>;
  onClose: () => void;
}

export default function MoveItemSheet({ itemId, currentParentId, onMove, onClose }: Props) {
  return (
    <LocationPicker
      value={currentParentId}
      excludeId={itemId}
      onChange={onMove}
      onClose={onClose}
    />
  );
}
