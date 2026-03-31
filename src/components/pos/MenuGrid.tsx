'use client'

import type { CategoryRow, MenuRow } from '@/lib/types'

export default function MenuGrid({
  categories,
  selectedCategoryId,
  onSelectCategory,
  items,
  onAdd,
}: {
  categories: CategoryRow[]
  selectedCategoryId: string | 'all'
  onSelectCategory: (id: string | 'all') => void
  items: MenuRow[]
  onAdd: (item: MenuRow) => void
}) {
  return (
    <section className="flex h-full flex-col rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-2xl font-bold">菜單</div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelectCategory('all')}
          className={`rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${
            selectedCategoryId === 'all'
              ? 'bg-black text-white'
              : 'bg-neutral-100 text-black'
          }`}
        >
          全部
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${
              selectedCategoryId === category.id
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-black'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onAdd(item)}
            className="flex min-h-[120px] flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-4 text-left transition hover:border-black hover:shadow-sm"
          >
            <div className="text-lg font-bold leading-snug">{item.name}</div>
            <div className="mt-4 text-sm font-semibold text-neutral-500">
              NT$ {item.price}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}