import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../utils/api'
import { format, parseISO, getYear, getMonth, getDate, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns'
import { FaEdit, FaTrash, FaCalendarAlt } from 'react-icons/fa'

export default function DayNotes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlDate = searchParams.get('date')
  const initialDate = urlDate || format(new Date(), 'yyyy-MM-dd')
  const initialDateObj = parseISO(initialDate)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedYear, setSelectedYear] = useState(getYear(initialDateObj))
  const [selectedMonth, setSelectedMonth] = useState(getMonth(initialDateObj))
  const [selectedDay, setSelectedDay] = useState(getDate(initialDateObj))
  const [note, setNote] = useState('')
  const [existingNote, setExistingNote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNotes, setSavedNotes] = useState([]) // List of all saved notes
  const [editingNoteDate, setEditingNoteDate] = useState(null) // Track which note is being edited

  // Generate date options
  const currentYear = getYear(new Date())
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  // Get days in selected month
  const getDaysInMonth = (year, month) => {
    const lastDay = new Date(year, month + 1, 0)
    return Array.from({ length: lastDay.getDate() }, (_, i) => i + 1)
  }

  const days = getDaysInMonth(selectedYear, selectedMonth)

  // Update selectedDate when year, month, or day changes
  useEffect(() => {
    const validDay = Math.min(selectedDay, days.length)
    const newDate = format(new Date(selectedYear, selectedMonth, validDay), 'yyyy-MM-dd')
    if (newDate !== selectedDate) {
      setSelectedDate(newDate)
      // Adjust day if it's invalid for the new month
      if (selectedDay > days.length) {
        setSelectedDay(days.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedDay])

  // Clear note on initial mount if no URL date
  useEffect(() => {
    if (!urlDate) {
      setNote('')
      setExistingNote(null)
      setEditingNoteDate(null)
    }
  }, [])

  // Update selectedDate when URL param changes
  useEffect(() => {
    if (urlDate && urlDate !== selectedDate) {
      // Clear note immediately when URL date changes
      setNote('')
      setExistingNote(null)
      setEditingNoteDate(null)
      setSelectedDate(urlDate)
      const dateObj = parseISO(urlDate)
      setSelectedYear(getYear(dateObj))
      setSelectedMonth(getMonth(dateObj))
      setSelectedDay(getDate(dateObj))
    }
  }, [urlDate, selectedDate])

  useEffect(() => {
    // Clear note immediately when date changes, then fetch
    setNote('')
    setExistingNote(null)
    setEditingNoteDate(null)
    
    // Update URL param when date changes
    setSearchParams({ date: selectedDate })
    
    // Use a small delay to ensure state is cleared before fetching
    const timer = setTimeout(() => {
      fetchNote()
    }, 0)
    
    return () => clearTimeout(timer)
  }, [selectedDate])

  const fetchNote = async () => {
    setLoading(true)
    // Always clear note field - notes are shown in the list below
    setNote('')
    setExistingNote(null)
    try {
      const response = await api.get(`/day-notes/${selectedDate}`)
      const noteData = response.data
      // Don't populate the note field - just track that it exists
      setExistingNote(noteData)
      
      // Add to saved notes list if not already there
      setSavedNotes((prev) => {
        const exists = prev.some(n => n.date === noteData.date)
        if (!exists) {
          return [noteData, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
        }
        return prev
      })
    } catch (error) {
      if (error.response?.status === 404) {
        // No note exists for this date - that's fine
        setExistingNote(null)
        setNote('')
      } else {
        console.error('Error fetching note:', error)
        setExistingNote(null)
        setNote('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return

    setSaving(true)
    try {
      const response = await api.post('/day-notes', {
        date: selectedDate,
        note: note.trim(),
      })
      const savedNote = response.data
      setExistingNote(savedNote)
      
      // Update or add note to the saved notes list
      setSavedNotes((prev) => {
        const existingIndex = prev.findIndex(n => n.date === savedNote.date)
        if (existingIndex >= 0) {
          // Update existing note
          const updated = [...prev]
          updated[existingIndex] = savedNote
          return updated.sort((a, b) => new Date(b.date) - new Date(a.date))
        } else {
          // Add new note
          return [savedNote, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
        }
      })
      
      // Clear the form after saving
      setNote('')
      setExistingNote(null)
      setEditingNoteDate(null)
    } catch (error) {
      console.error('Error saving note:', error)
      alert(error.response?.data?.detail || 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dateToDelete) => {
    const dateStr = dateToDelete || selectedDate
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await api.delete(`/day-notes/${dateStr}`)
      
      // Remove from saved notes list
      setSavedNotes((prev) => prev.filter(n => n.date !== dateStr))
      
      // If deleting the currently selected note, clear the form
      if (dateStr === selectedDate) {
        setNote('')
        setExistingNote(null)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert(error.response?.data?.detail || 'Failed to delete note')
    }
  }

  const handleEdit = (noteToEdit) => {
    const dateObj = parseISO(noteToEdit.date)
    setSelectedDate(noteToEdit.date)
    setSelectedYear(getYear(dateObj))
    setSelectedMonth(getMonth(dateObj))
    setSelectedDay(getDate(dateObj))
    setNote(noteToEdit.note)
    setExistingNote(noteToEdit)
    setEditingNoteDate(noteToEdit.date)
    setSearchParams({ date: noteToEdit.date })
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setNote('')
    setExistingNote(null)
    setEditingNoteDate(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2 break-words">Day Notes</h1>
        <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary break-words">Add notes for specific days</p>
      </div>

      <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
            Select Date
          </label>
          <div className="flex flex-row gap-2 sm:gap-3 items-center">
            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = parseInt(e.target.value)
                setSelectedYear(year)
                setNote('')
                setExistingNote(null)
                setEditingNoteDate(null)
              }}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                const month = parseInt(e.target.value)
                setSelectedMonth(month)
                setNote('')
                setExistingNote(null)
                setEditingNoteDate(null)
              }}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>

            {/* Day Dropdown */}
            <select
              value={selectedDay}
              onChange={(e) => {
                const day = parseInt(e.target.value)
                setSelectedDay(day)
                setNote('')
                setExistingNote(null)
                setEditingNoteDate(null)
              }}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>

            {/* Today Button */}
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const year = getYear(today)
                const month = getMonth(today)
                const day = getDate(today)
                setSelectedYear(year)
                setSelectedMonth(month)
                setSelectedDay(day)
                setNote('')
                setExistingNote(null)
                setEditingNoteDate(null)
                const todayStr = format(today, 'yyyy-MM-dd')
                setSelectedDate(todayStr)
                setSearchParams({ date: todayStr })
              }}
              className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity font-medium flex items-center justify-center gap-2"
              title="Jump to today"
            >
              <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Today</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
              Note for {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
            </label>
            <textarea
              key={selectedDate}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              required
              minLength={1}
              maxLength={500}
              rows={6}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all resize-none"
            />
            <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
              {note.length}/500 characters
            </p>
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-accent-teal via-accent-cyan to-accent-sky text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-teal/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving ? 'Saving...' : editingNoteDate ? 'Update Note' : 'Save Note'}
            </button>
            {editingNoteDate && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-500/10 border border-gray-500 dark:text-gray-300 light:text-gray-600 rounded-lg sm:rounded-xl hover:bg-gray-500/20 transition-colors font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Saved Notes List */}
      {savedNotes.length > 0 && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft w-full max-w-full overflow-x-hidden">
          <h2 className="text-xl sm:text-2xl font-bold dark:text-dark-text light:text-light-text mb-4 sm:mb-6">
            Saved Notes
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {savedNotes.map((savedNote) => (
              <div
                key={savedNote.date}
                className={`dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all ${
                  editingNoteDate === savedNote.date ? 'ring-2 ring-accent-cyan' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <div className="text-sm sm:text-base font-semibold dark:text-dark-text light:text-light-text">
                        {format(parseISO(savedNote.date), 'MMMM dd, yyyy')}
                      </div>
                      {savedNote.creator_name && (
                        <span className="text-xs sm:text-sm dark:text-dark-text-tertiary light:text-light-text-tertiary italic">
                          created by {savedNote.creator_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary break-words whitespace-pre-wrap">
                      {savedNote.note}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(savedNote)}
                      className="p-2 sm:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500 dark:text-blue-300 light:text-blue-600 rounded-lg sm:rounded-xl transition-colors"
                      title="Edit note"
                    >
                      <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(savedNote.date)}
                      className="p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500 dark:text-red-300 light:text-red-600 rounded-lg sm:rounded-xl transition-colors"
                      title="Delete note"
                    >
                      <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

