import type { CategoryTemplate, EntryType } from '../types/common';

/** 分类模板定义 */
export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    type: 'api_key',
    label: 'API 密钥',
    icon: 'Key',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '例如: OpenAI API' },
      { key: 'key', label: 'Key', type: 'password', required: true, placeholder: 'sk-...' },
      { key: 'secret', label: 'Secret', type: 'password', required: false, placeholder: '可选' },
      { key: 'domain', label: '域名', type: 'url', required: false, placeholder: 'https://api.example.com' },
      { key: 'notes', label: '备注', type: 'text', required: false, placeholder: '添加备注信息...', multiline: true },
    ],
  },
  {
    type: 'password',
    label: '密码',
    icon: 'Lock',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '例如: GitHub' },
      { key: 'username', label: '用户名', type: 'text', required: true, placeholder: 'user@example.com' },
      { key: 'password', label: '密码', type: 'password', required: true, placeholder: '输入密码' },
      { key: 'url', label: '网址', type: 'url', required: false, placeholder: 'https://...' },
      { key: 'notes', label: '备注', type: 'text', required: false, placeholder: '添加备注信息...', multiline: true },
    ],
  },
  {
    type: 'id_card',
    label: '身份证',
    icon: 'CreditCard',
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true, placeholder: '真实姓名' },
      { key: 'idNumber', label: '身份证号', type: 'text', required: true, placeholder: '18位身份证号' },
      { key: 'gender', label: '性别', type: 'text', required: false, placeholder: '男/女' },
      { key: 'birthDate', label: '出生日期', type: 'date', required: false, placeholder: 'YYYY-MM-DD' },
      { key: 'notes', label: '备注', type: 'text', required: false, placeholder: '添加备注信息...', multiline: true },
    ],
  },
  {
    type: 'license_key',
    label: '激活码',
    icon: 'Ticket',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '例如: IntelliJ IDEA' },
      { key: 'licenseKey', label: '激活码', type: 'text', required: true, placeholder: 'XXXX-XXXX-XXXX' },
      { key: 'product', label: '产品', type: 'text', required: false, placeholder: '产品名称' },
      { key: 'purchaseDate', label: '购买日期', type: 'date', required: false, placeholder: 'YYYY-MM-DD' },
      { key: 'notes', label: '备注', type: 'text', required: false, placeholder: '添加备注信息...', multiline: true },
    ],
  },
  {
    type: 'custom',
    label: '自定义',
    icon: 'FileText',
    fields: [
      { key: 'name', label: '名称', type: 'text', required: true, placeholder: '条目名称' },
    ],
  },
];

/** 根据类型获取模板 */
export function getTemplate(type: EntryType): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES.find((t) => t.type === type);
}

/** 获取分类图标名称 */
export function getCategoryIcon(type: string): string {
  const template = CATEGORY_TEMPLATES.find((t) => t.type === type);
  return template?.icon ?? 'FileText';
}

/** 获取分类标签 */
export function getCategoryLabel(type: string): string {
  const template = CATEGORY_TEMPLATES.find((t) => t.type === type);
  return template?.label ?? '未知';
}
