/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Lock, Unlock, Plus, X } from 'lucide-react'
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
  const [sensitiveCustomFields, setSensitiveCustomFields] = useState<Set<string>>(new Set())

  const template = type ? getTemplate(type as EntryType) : null
  const isEdit = !!editEntry

  useEffect(() => {
    if (!editEntry) return
    try {
      const parsed = JSON.parse(editEntry.fields || '{}') as Record<string, string>
      const sensitiveRaw = parsed['_sensitive'] || ''
      if (sensitiveRaw) {
        delete parsed['_sensitive']
        setSensitiveCustomFields(new Set(sensitiveRaw.split(',').filter(Boolean)))
      }
      setFields(parsed)
    } catch { setFields({}) }
  }, [])

  useEffect(() => {
    if (!template) return
    setMultilineFields(new Set(template.fields.filter(f => f.multiline).map(f => f.key)))
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

    const activeType = isEdit ? editEntry!.entry_type : type
    let fieldsToSave = fields
    if (activeType === 'custom' && sensitiveCustomFields.size > 0) {
      fieldsToSave = { ...fields, _sensitive: [...sensitiveCustomFields].join(',') }
    }

    const params: CreateEntryParams = {
      entry_type: isEdit ? editEntry!.entry_type : type,
      name: name.trim(),
      fields: JSON.stringify(fieldsToSave),
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
                    className={`px-3 py-2.5 rounded text-sm border transition-all duration-200
                      ${type === t.type
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-500'
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
                          className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
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
                        className="w-full px-3 py-2 rounded bg-surface-800 border border-surface-700/50 text-surface-100 placeholder:text-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent resize-y min-h-[80px] transition-all duration-200"
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
                            className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
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
                          <div className="flex items-center justify-between gap-1">
                            <label className="block text-sm font-medium text-surface-300">值</label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSensitiveCustomFields(prev => {
                                    const next = new Set(prev)
                                    if (next.has(key)) next.delete(key)
                                    else next.add(key)
                                    return next
                                  })
                                }}
                                className={`flex items-center gap-1 text-[11px] transition-colors ${sensitiveCustomFields.has(key) ? 'text-yellow-400' : 'text-surface-500 hover:text-surface-300'}`}
                              >
                                {sensitiveCustomFields.has(key) ? <Lock size={11} /> : <Unlock size={11} />}
                                {sensitiveCustomFields.has(key) ? '敏感' : '公开'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleMultiline(multilineKey)}
                                className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
                              >
                                {isMultiline ? '单行' : '多行'}
                              </button>
                            </div>
                          </div>
                          {isMultiline ? (
                            <textarea
                              value={val}
                              onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 rounded bg-surface-800 border border-surface-700/50 text-surface-100 placeholder:text-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent resize-y min-h-[60px] transition-all duration-200"
                            />
                          ) : (
                            <Input
                              type={sensitiveCustomFields.has(key) ? 'password' : 'text'}
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
                          className="p-1 text-surface-500 hover:text-red-400 pt-6 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                  <Button variant="ghost" size="sm" onClick={() => setFields((prev) => ({ ...prev, ['']: '' }))}>
                    <Plus size={14} />
                    添加字段
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
