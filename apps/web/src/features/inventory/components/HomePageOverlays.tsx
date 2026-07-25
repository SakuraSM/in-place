import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Category, Item } from '../../../legacy/database.types';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import ContextMenu from '../../../shared/ui/ContextMenu';
import BulkEditSheet from './BulkEditSheet';
import HomeBulkActionBar from './HomeBulkActionBar';
import ItemForm from './ItemForm';
import MoveItemSheet from './MoveItemSheet';

interface HomePageOverlaysProps {
  selectionMode: boolean;
  selectedItems: Item[];
  categories: Category[];
  contextItem: Item | null;
  deleteTarget: Item | null;
  moveTarget: Item | null;
  editItem: Item | null;
  currentParentId: string | null;
  selectedCount: number;
  showForm: boolean;
  showBulkEdit: boolean;
  bulkDeletePending: boolean;
  isDeleteSubmitting: boolean;
  isBulkDeleteSubmitting: boolean;
  formSubmitError: string | null;
  onCreate: () => void;
  onBulkEditOpen: () => void;
  onBulkDeleteOpen: () => void;
  onContextView: () => void;
  onContextEdit: () => void;
  onContextDelete: () => void;
  onContextMove: () => void;
  onContextClose: () => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  onBulkDeleteConfirm: () => Promise<void>;
  onBulkDeleteCancel: () => void;
  onMove: (parentId: string | null) => Promise<void>;
  onMoveClose: () => void;
  onSave: (data: Omit<Item, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onFormClose: () => void;
  onBulkSave: (payload: Partial<Item>) => Promise<void>;
  onBulkEditClose: () => void;
}

export default function HomePageOverlays(props: HomePageOverlaysProps) {
  return (
    <>
      {!props.selectionMode ? (
        <motion.button
          type="button"
          onClick={props.onCreate}
          aria-label="新增物品或收纳"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brandStrong text-white shadow-lg shadow-teal-200 md:hidden"
        >
          <Plus size={24} />
        </motion.button>
      ) : (
        <HomeBulkActionBar
          selectedCount={props.selectedCount}
          onEdit={props.onBulkEditOpen}
          onDelete={props.onBulkDeleteOpen}
        />
      )}

      {props.contextItem ? (
        <ContextMenu
          item={props.contextItem}
          onView={props.onContextView}
          onEdit={props.onContextEdit}
          onDelete={props.onContextDelete}
          onMove={props.onContextMove}
          onClose={props.onContextClose}
        />
      ) : null}

      {props.deleteTarget ? (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除「${props.deleteTarget.name}」吗？此操作不可撤销。${props.deleteTarget.type === 'container' ? '该节点下的所有内容也会一起删除。' : ''}`}
          confirmLabel="删除"
          danger
          onConfirm={props.onDeleteConfirm}
          onCancel={props.onDeleteCancel}
          isConfirming={props.isDeleteSubmitting}
        />
      ) : null}

      {props.bulkDeletePending ? (
        <ConfirmDialog
          title="确认批量删除"
          message={`确定要删除选中的 ${props.selectedCount} 项吗？此操作不可撤销，若包含位置或收纳会同时删除其下内容。`}
          confirmLabel="批量删除"
          danger
          onConfirm={props.onBulkDeleteConfirm}
          onCancel={props.onBulkDeleteCancel}
          isConfirming={props.isBulkDeleteSubmitting}
        />
      ) : null}

      {props.moveTarget ? (
        <MoveItemSheet
          currentParentId={props.moveTarget.parent_id}
          onMove={props.onMove}
          onClose={props.onMoveClose}
        />
      ) : null}

      {props.showForm ? (
        <ItemForm
          initial={props.editItem ?? undefined}
          defaultParentId={props.currentParentId}
          submitError={props.formSubmitError}
          onSave={props.onSave}
          onClose={props.onFormClose}
        />
      ) : null}

      {props.showBulkEdit ? (
        <BulkEditSheet
          items={props.selectedItems}
          categories={props.categories}
          onSave={props.onBulkSave}
          onClose={props.onBulkEditClose}
        />
      ) : null}
    </>
  );
}
