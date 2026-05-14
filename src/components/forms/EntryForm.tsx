import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { useEntryStore } from '../../stores/entryStore'
import { CATEGORY_TEMPLATES, getTemplate } from '../../lib/templates'
import type { Entry, CreateEntryParams } from '../../types/entry'
import type { EntryType, FieldDefinition } from '../../types/common'
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
  const [multilineFields, setMultilineFields] = useState<Set<string>>(new Set())

  const template = type ? getTemplate(type as EntryType) : null
  const isEdit = !!editEntry

  useEffect(() => {
    if (editEntry) {
      try {
        setFields(JSON.parse(editEntry.fields || '{}'))
      } catch { setFields({}) }
    }
  }, [editEntry])

  // 根据模板初始化多行字段状态
  useEffect(() => {
    if (template) {
      setMultilineFields(new Set(template.fields.filter(f => f.multiline).map(f => f.key)))
    }
  }, [template])

  const canHaveMultiline = (f: FieldDefinition) => f.type !== 'password'

  const toggleMultiline = (key: string) => {
    setMultilineFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

              {template.fields.filter((f) => f.key !== 'name').map((f) => {
                const isMultiline = multilineFields.has(f.key)
                const canToggle = canHaveMultiline(f)
                return (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-surface-300">{f.label}</label>
                      {canToggle && (
                        <button
                          type="button"
                          onClick={() => toggleMultiline(f.key)}
                          className="text-[11px] text-primary-400 hover:text-primary-300"
                        >
                          {isMultiline ? '单行' : '多行'}
                        </button>
                      )}
                    </div>
                    {isMultiline ? (
                      <textarea
                        value={fields[f.key] ?? ''}
                        onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y min-h-[80px]"
                      />
                    ) : (
                      <div className="relative">
                        <Input
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
                    )}
                  </div>
                )
              })}

              {type === 'custom' && (
                <div className="space-y-2">
                  {Object.entries(fields).filter(([k]) => k !== 'name').map(([key, val], idx) => {
                    const multilineKey = `custom_${idx}`
                    const isMultiline = multilineFields.has(multilineKey)
                    return (
                      <div key={idx} className="flex gap-2 items-start">
                        <Input
                          label="字段名"
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value
                            const newFields = { ...fields }
                            delete newFields[key]
                            newFields[newKey] = val
                            setFields(newFields)
                            // 同步多行状态
                            setMultilineFields(prev => {
                              const next = new Set(prev)
                              if (next.has(multilineKey)) {
                                next.delete(multilineKey)
                                next.add(`custom_${idx}`)
                              }
                              return next
                            })
                          }}
                          className="w-1/3"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-surface-300">值</label>
                            <button
                              type="button"
                              onClick={() => toggleMultiline(multilineKey)}
                              className="text-[11px] text-primary-400 hover:text-primary-300"
                            >
                              {isMultiline ? '单行' : '多行'}
                            </button>
                          </div>
                          {isMultiline ? (
                            <textarea
                              value={val}
                              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y min-h-[60px]"
                            />
                          ) : (
                            <Input
                              value={val}
                              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = { ...fields }
                            delete newFields[key]
                            setFields(newFields)
                          }}
                          className="text-surface-500 hover:text-red-400 pt-6"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
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
