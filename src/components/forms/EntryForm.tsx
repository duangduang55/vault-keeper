import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { useEntryStore } from '../../stores/entryStore'
import { CATEGORY_TEMPLATES, getTemplate } from '../../lib/templates'
import type { Entry, CreateEntryParams } from '../../types/entry'
import type { EntryType } from '../../types/common'
import { toast } from '../common/Toast'
import { PasswordGenerator } from './PasswordGenerator'

interface EntryFormProps {
  editEntry: Entry | null
  onClose: () => void
}

export function EntryForm({ editEntry, onClose }: EntryFormProps) {
  const { createEntry, updateEntry } = useEntryStore()
  const [type, setType] = useState(editEntry?.entry_type ?? '')
  const [name, setName] = useState(editEntry?.name ?? '')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [targetField, setTargetField] = useState<string | null>(null)

  const template = type ? getTemplate(type as EntryType) : null
  const isEdit = !!editEntry

  useEffect(() => {
    if (editEntry) {
      try {
        setFields(JSON.parse(editEntry.fields || '{}'))
      } catch { setFields({}) }
    }
  }, [editEntry])

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (!isEdit && !type) return

    const params: CreateEntryParams = {
      entry_type: isEdit ? editEntry!.entry_type : type,
      name: name.trim(),
      fields: JSON.stringify(fields),
    }

    setSaving(true)
    const result = isEdit
      ? await updateEntry(editEntry!.id, params)
      : await createEntry(params)

    setSaving(false)
    if (result) {
      toast(isEdit ? '已更新' : '已保存', 'success')
      onClose()
    } else {
      toast('保存失败', 'error')
    }
  }

  const handleGeneratorResult = (password: string) => {
    if (targetField) setFields((prev) => ({ ...prev, [targetField]: password }))
    setShowGenerator(false)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? '编辑条目' : '新增条目'}
        size="lg"
      >
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-surface-300">分类</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_TEMPLATES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => { setType(t.type); setFields({}) }}
                    className={`px-3 py-2.5 rounded-lg text-sm border transition-colors
                      ${type === t.type
                        ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                        : 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(type || isEdit) && template && (
            <>
              {template.fields.filter((f) => f.key === 'name').map((f) => (
                <Input
                  key={f.key}
                  label={f.label}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              ))}

              {template.fields.filter((f) => f.key !== 'name').map((f) => (
                <div key={f.key} className="relative">
                  <Input
                    label={f.label}
                    type={f.type}
                    value={fields[f.key] ?? ''}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                  {f.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => { setTargetField(f.key); setShowGenerator(true) }}
                      className="absolute right-10 bottom-2 text-[11px] text-primary-400 hover:text-primary-300"
                    >
                      生成
                    </button>
                  )}
                </div>
              ))}

              {type === 'custom' && (
                <div className="space-y-2">
                  {Object.entries(fields).filter(([k]) => k !== 'name').map(([key, val], idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        label="字段名"
                        value={key}
                        onChange={(e) => {
                          const newFields = { ...fields }
                          delete newFields[key]
                          newFields[e.target.value] = val
                          setFields(newFields)
                        }}
                        className="w-1/3"
                      />
                      <div className="flex-1">
                        <Input
                          label="值"
                          value={val}
                          onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = { ...fields }
                          delete newFields[key]
                          setFields(newFields)
                        }}
                        className="self-end text-surface-500 hover:text-red-400 pb-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setFields((prev) => ({ ...prev, ['']: '' }))}>
                    + 添加字段
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
              {saving ? '保存中...' : isEdit ? '更新' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      <PasswordGenerator
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerate={handleGeneratorResult}
      />
    </>
  )
}
