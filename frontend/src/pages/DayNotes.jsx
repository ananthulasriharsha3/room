import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format, parseISO } from 'date-fns'

export default function DayNotes() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [existingNote, setExistingNote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchNote()
  }, [selectedDate])

  const fetchNote = async () => {
    setLoading(true)
    try {
      // Try to get note for selected date
      // Since there's no GET endpoint for a specific date, we'll handle it in the form
      setExistingNote(null)
    } catch (error) {
      console.error('Error fetching note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return

    setSaving(true)
    try {
      await api.post('/day-notes', {
        date: selectedDate,
        note: note.trim(),
      })
      setExistingNote({ date: selectedDate, note: note.trim() })
      alert('Note saved successfully!')
    } catch (error) {
      console.error('Error saving note:', error)
      alert(error.response?.data?.detail || 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await api.delete(`/day-notes/${selectedDate}`)
      setNote('')
      setExistingNote(null)
      alert('Note deleted successfully!')
    } catch (error) {
      console.error('Error deleting note:', error)
      alert(error.response?.data?.detail || 'Failed to delete note')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Day Notes</h1>
        <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Add notes for specific days</p>
      </div>

      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
        <div className="mb-6">
          <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setNote('')
              setExistingNote(null)
            }}
            className="px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
              Note for {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              required
              minLength={1}
              maxLength={500}
              rows={6}
              className="w-full px-4 py-3 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all resize-none"
            />
            <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
              {note.length}/500 characters
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="px-6 py-3 bg-gradient-to-r from-accent-teal via-accent-cyan to-accent-sky text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-teal/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
            {existingNote && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-3 bg-red-500/10 border border-red-500 dark:text-red-300 light:text-red-600 rounded-xl hover:bg-red-500/20 transition-colors font-semibold"
              >
                Delete Note
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

