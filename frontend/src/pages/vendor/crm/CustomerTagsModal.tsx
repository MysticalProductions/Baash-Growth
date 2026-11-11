import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Tag as TagIcon, Check } from 'lucide-react';
import api from '../../../services/api';
import { CustomerTag } from '../../../types/crm';

interface CustomerTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsUpdated?: () => void;
}

const PRESET_COLORS = [
  '#7B35E8', // Baash Purple
  '#F72585', // Baash Pink
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

export const CustomerTagsModal: React.FC<CustomerTagsModalProps> = ({
  isOpen,
  onClose,
  onTagsUpdated,
}) => {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create / Edit state
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      resetForm();
    }
  }, [isOpen]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tags');
      setTags(Array.isArray(res) ? res : (res?.data || []));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setColor(PRESET_COLORS[0]);
    setEditingTagId(null);
    setError('');
  };

  const handleStartEdit = (tag: CustomerTag) => {
    setEditingTagId(tag.id);
    setName(tag.name);
    setColor(tag.color || PRESET_COLORS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');
    try {
      if (editingTagId) {
        await api.patch(`/tags/${editingTagId}`, { name: name.trim(), color });
      } else {
        await api.post('/tags', { name: name.trim(), color });
      }
      resetForm();
      fetchTags();
      if (onTagsUpdated) onTagsUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string, tagName: string) => {
    if (!window.confirm(`Delete tag "${tagName}"? It will be removed from all customers.`)) {
      return;
    }
    try {
      await api.delete(`/tags/${tagId}`);
      fetchTags();
      if (onTagsUpdated) onTagsUpdated();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete tag');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12121A] border border-[#232336] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A2E]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#7B35E8]/10 rounded-lg text-[#7B35E8]">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Customer Tags</h2>
              <p className="text-xs text-[#9E9E9E]">Organize customers into vendor-specific labels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E9E] hover:text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Tag form (Create / Edit) */}
          <form onSubmit={handleSubmit} className="p-4 bg-[#1A1A2E]/60 border border-[#2A2A40] rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {editingTagId ? 'Edit Tag' : 'Create New Tag'}
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#9E9E9E]">Tag Name</label>
              <input
                type="text"
                placeholder="e.g. VIP, Delhi, Regular"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#12121A] border border-[#2A2A40] rounded-xl text-white placeholder-[#6E6E82] text-sm focus:outline-none focus:border-[#7B35E8]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#9E9E9E]">Tag Color</label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingTagId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-xs text-[#9E9E9E] hover:text-white bg-[#12121A] border border-[#2A2A40] rounded-lg"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#7B35E8] hover:bg-[#6824D3] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-[#7B35E8]/20 transition-all"
              >
                {editingTagId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Add Tag
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing tags list */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
              Existing Tags ({tags.length})
            </h3>

            {loading ? (
              <div className="py-8 text-center text-sm text-[#9E9E9E]">Loading tags...</div>
            ) : tags.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6E6E82]">
                No tags created yet. Create one above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-[#1A1A2E]/40 border border-[#2A2A40] rounded-xl hover:border-[#383854] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#7B35E8' }}
                      />
                      <span className="text-sm font-medium text-white truncate">{tag.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#232336] rounded-full text-[#9E9E9E]">
                        {tag._count?.assignments || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tag)}
                        className="p-1 text-[#9E9E9E] hover:text-[#7B35E8] rounded-md hover:bg-[#12121A] transition-colors"
                        title="Edit Tag"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tag.id, tag.name)}
                        className="p-1 text-[#9E9E9E] hover:text-red-400 rounded-md hover:bg-[#12121A] transition-colors"
                        title="Delete Tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1A1A2E] bg-[#0E0E17] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A2E] hover:bg-[#232336] text-white rounded-xl text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
