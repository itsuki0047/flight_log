'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockUsers, mockOrganization } from '@/lib/mock-data'
import { User as UserIcon, Home, FileText, Shield, Building } from 'lucide-react'

const tabs = [
  { id: 'user', label: 'ユーザー設定', icon: UserIcon },
  { id: 'home', label: 'ホーム表示', icon: Home },
  { id: 'pdf', label: 'PDF設定', icon: FileText },
  { id: 'org', label: '団体設定', icon: Building },
  { id: 'role', label: '権限設定', icon: Shield },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('user')
  const [users, setUsers] = useState(mockUsers)

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">設定</h1>

        <div className="flex gap-2 mb-6 border-b flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                tab === t.id ? 'border-sky-600 text-sky-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'user' && (
          <div className="bg-white border rounded-xl p-5 space-y-4 max-w-md">
            <h2 className="font-semibold">ユーザー設定</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">名前</label>
              <input defaultValue="山田 太郎" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">所属</label>
              <input defaultValue="大学航空部" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">テーマ</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm">
                <option>ライト</option>
                <option>ダーク</option>
                <option>システム設定に従う</option>
              </select>
            </div>
            <button className="bg-sky-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-sky-700">保存</button>
          </div>
        )}

        {tab === 'home' && (
          <div className="bg-white border rounded-xl p-5 space-y-3 max-w-md">
            <h2 className="font-semibold mb-2">ホーム表示設定</h2>
            {['今日のフライト件数', '現在飛行中一覧', '機体状態', '最近の個人ログ'].map(item => (
              <label key={item} className="flex items-center gap-3 text-sm">
                <input type="checkbox" defaultChecked /> {item}
              </label>
            ))}
            <div className="pt-2">
              <label className="text-xs text-gray-500 mb-1 block">デフォルトカテゴリ</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm">
                <option>滑空機</option><option>固定翼</option><option>回転翼</option>
              </select>
            </div>
          </div>
        )}

        {tab === 'pdf' && (
          <div className="bg-white border rounded-xl p-5 space-y-4 max-w-md">
            <h2 className="font-semibold">PDF設定</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">用紙サイズ</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"><option>A4</option><option>A5</option><option>B5</option></select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">用紙向き</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"><option>横</option><option>縦</option></select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">時間表示形式</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"><option>時:分 (HH:MM)</option><option>分</option></select>
            </div>
          </div>
        )}

        {tab === 'org' && (
          <div className="bg-white border rounded-xl p-5 space-y-4 max-w-lg">
            <h2 className="font-semibold">団体設定</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">団体名</label>
              <input defaultValue={mockOrganization.name} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">よく使う出発地（カンマ区切り）</label>
              <input defaultValue={mockOrganization.default_departure_airports.join(', ')} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">よく使う到着地（カンマ区切り）</label>
              <input defaultValue={mockOrganization.default_arrival_airports.join(', ')} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {tab === 'role' && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">権限設定</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left">ユーザー</th>
                  <th className="px-4 py-2 text-left">メール</th>
                  <th className="px-4 py-2 text-left">権限</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select value={u.role}
                        onChange={e => setUsers(prev => prev.map(x => x.id === u.id ? {...x, role: e.target.value as typeof u.role} : x))}
                        className="border rounded-lg px-2 py-1 text-sm">
                        <option value="admin">管理者</option>
                        <option value="instructor">教官</option>
                        <option value="operator">ピスト</option>
                        <option value="member">学生</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
