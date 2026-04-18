import LocationPicker from './LocationPicker';

interface Props {
  currentParentId: string | null;
  onMove: (newParentId: string | null) => void;
  onClose: () => void;
}

export default function MoveItemSheet({ currentParentId, onMove, onClose }: Props) {
  return (
    <LocationPicker
      value={currentParentId}
      onChange={onMove}
      onClose={onClose}
    />
  );
}
