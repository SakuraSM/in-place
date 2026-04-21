import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModernDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function parseDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export default function ModernDatePicker({
  value,
  onChange,
  placeholder = '请选择日期',
}: ModernDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(selectedDate ?? new Date()));
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelPosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(320, window.innerWidth - 24);
      const nextLeft = Math.min(
        Math.max(12, rect.left),
        Math.max(12, window.innerWidth - panelWidth - 12),
      );

      setPanelStyle({
        top: rect.bottom + 8,
        left: nextLeft,
        width: panelWidth,
      });
    };

    updatePanelPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = rootRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedTrigger && !clickedPanel) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    [displayMonth],
  );

  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(displayMonth);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstWeekday);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [displayMonth]);

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          open ? 'border-sky-300 bg-white shadow-sm' : 'text-slate-900'
        }`}
      >
        <span className={displayValue ? 'text-slate-900' : 'text-slate-400'}>
          {displayValue || placeholder}
        </span>
        <CalendarDays size={16} className={open ? 'text-sky-500' : 'text-slate-400'} />
      </button>

      {open && (
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[90] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
            style={{
              top: panelStyle?.top ?? 0,
              left: panelStyle?.left ?? 12,
              width: panelStyle?.width ?? 320,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label="上个月"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
              <button
                type="button"
                onClick={() => setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label="下个月"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1 text-center text-[11px] font-medium text-slate-400">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const inCurrentMonth = date.getMonth() === displayMonth.getMonth();
                const isToday = sameDay(date, today);
                const isSelected = selectedDate ? sameDay(date, selectedDate) : false;

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange(formatDateValue(date));
                      setOpen(false);
                    }}
                    className={`flex h-10 items-center justify-center rounded-xl text-sm transition-colors ${
                      isSelected
                        ? 'bg-sky-500 font-semibold text-white shadow-sm shadow-sky-200'
                        : inCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isToday && !isSelected ? 'border border-sky-200 text-sky-600' : ''}`}>
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <RotateCcw size={13} />
                清空
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextValue = formatDateValue(today);
                  onChange(nextValue);
                  setDisplayMonth(startOfMonth(today));
                  setOpen(false);
                }}
                className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100 hover:text-sky-700"
              >
                选择今天
              </button>
            </div>
          </div>,
          document.body,
        )
      )}
    </div>
  );
}
