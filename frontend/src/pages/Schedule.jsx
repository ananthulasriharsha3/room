import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSchedule, createSchedule } from '../utils/schedule'
import { getSettings } from '../utils/settings'
import { getDayNote } from '../utils/dayNotes'
import { format, startOfYear, endOfYear, eachDayOfInterval, getYear, differenceInDays, startOfDay } from 'date-fns'
import { FaSync, FaLightbulb, FaEdit, FaCalendarDay } from 'react-icons/fa'
import NoteFloatingWidget from '../components/NoteFloatingWidget'

export default function Schedule() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSchedule = location.pathname === '/schedule'
  const [schedule, setSchedule] = useState(null)
  const [settings, setSettings] = useState(null)
  const [dayNotes, setDayNotes] = useState({}) // Map of date strings to notes
  const currentYear = getYear(new Date())
  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedStartDate, setSelectedStartDate] = useState(todayDate) // Date to jump to - defaults to today
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [currentStartIndex, setCurrentStartIndex] = useState(0)
  const DAYS_PER_PAGE = 5

  const loadSavedSchedule = async () => {
    try {
      const data = await getSchedule(selectedYear)
      setSchedule(data)
      // Don't reset currentStartIndex here - let the selectedStartDate effect handle it
      setError(null)
    } catch (error) {
      // Schedule not found is expected if not generated yet - don't show error
      if (error.message && !error.message.includes('not found')) {
        console.error('Error loading saved schedule:', error)
      }
      // Don't set error for not found - just means schedule hasn't been generated yet
    }
  }

  useEffect(() => {
    fetchSettings()
    loadSavedSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  useEffect(() => {
    setCurrentStartIndex(0)
    setDayNotes({}) // Clear notes when year changes
    // If selected year is current year, default to today, otherwise start from beginning
    if (selectedYear === currentYear) {
      setSelectedStartDate(todayDate)
    } else {
      setSelectedStartDate(null)
    }
    loadSavedSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  useEffect(() => {
    if (selectedStartDate && schedule) {
      const yearStart = startOfYear(new Date(selectedYear, 0, 1))
      const selectedDate = startOfDay(new Date(selectedStartDate))
      const daysDiff = differenceInDays(selectedDate, yearStart)
      if (daysDiff >= 0) {
        const yearEnd = endOfYear(new Date(selectedYear, 11, 31))
        const daysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd })
        const maxIndex = Math.max(0, Math.min(daysDiff, daysInYear.length - DAYS_PER_PAGE))
        setCurrentStartIndex(maxIndex)
      }
    }
  }, [selectedStartDate, selectedYear, schedule])

  const fetchSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('Failed to load settings. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const generateSchedule = async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await createSchedule(selectedYear, null)
      setSchedule(data)
      setCurrentStartIndex(0) // Reset to first page
      setDayNotes({}) // Clear notes when schedule is regenerated
    } catch (error) {
      console.error('Error generating schedule:', error)
      const errorMessage = error.message || 'Failed to generate schedule. Please try again.'
      setError(errorMessage)
      setSchedule(null)
    } finally {
      setGenerating(false)
    }
  }

  const handleYearChange = (e) => {
    const year = Number(e.target.value)
    if (year >= 1900 && year <= 2100) {
      setSelectedYear(year)
      setSchedule(null) // Clear schedule when year changes
      setError(null)
      setSelectedStartDate(null)
    }
  }

  const handleDateSelect = (e) => {
    const dateValue = e.target.value
    if (dateValue) {
      const selectedDate = new Date(dateValue)
      const dateYear = getYear(selectedDate)
      if (dateYear === selectedYear) {
        setSelectedStartDate(dateValue)
      } else {
        // If date is from different year, change year first
        setSelectedYear(dateYear)
        setTimeout(() => setSelectedStartDate(dateValue), 100)
      }
    }
  }

  const jumpToToday = () => {
    const today = new Date()
    const todayYear = getYear(today)
    if (todayYear === selectedYear) {
      setSelectedStartDate(format(today, 'yyyy-MM-dd'))
    } else {
      setSelectedYear(todayYear)
      setTimeout(() => setSelectedStartDate(format(today, 'yyyy-MM-dd')), 100)
    }
  }

  const daysInYear = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1))
    const yearEnd = endOfYear(new Date(selectedYear, 11, 31))
    return eachDayOfInterval({ start: yearStart, end: yearEnd })
  }, [selectedYear])

  const handlePrevious = useCallback(() => {
    setCurrentStartIndex((prev) => Math.max(0, prev - DAYS_PER_PAGE))
  }, [DAYS_PER_PAGE])

  const handleNext = useCallback(() => {
    if (schedule && daysInYear.length > 0) {
      const maxIndex = daysInYear.length - DAYS_PER_PAGE
      setCurrentStartIndex((prev) => Math.min(maxIndex, prev + DAYS_PER_PAGE))
    }
  }, [schedule, daysInYear.length, DAYS_PER_PAGE])

  // Memoize displayed days to prevent unnecessary recalculations
  const displayedDays = useMemo(() => {
    if (!schedule) return []
    return daysInYear.slice(currentStartIndex, currentStartIndex + DAYS_PER_PAGE)
  }, [schedule, daysInYear, currentStartIndex, DAYS_PER_PAGE])

  // Fetch notes for displayed days - optimized with cancellation
  useEffect(() => {
    if (!schedule || displayedDays.length === 0) return
    
    let cancelled = false
    
    const fetchNotesForDisplayedDays = async () => {
      const notesMap = {}
      
      // Use Promise.all with staggered delays for better performance
      const requests = displayedDays.map(async (day, i) => {
        if (cancelled) return
        
        const dateStr = format(day, 'yyyy-MM-dd')
        
        // Skip if we already have this note
        if (dayNotes[dateStr] !== undefined) {
          notesMap[dateStr] = dayNotes[dateStr]
          return
        }
        
        // Small delay between requests (reduced from 100ms)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        // Retry logic for failed requests (reduced retries)
        let retries = 1
        let success = false
        
        while (retries >= 0 && !success && !cancelled) {
          try {
            const response = await getDayNote(dateStr)
            if (!cancelled) {
              notesMap[dateStr] = response.note
            }
            success = true
          } catch (error) {
            if (error.message && error.message.includes('not found')) {
              success = true
            } else if (retries > 0) {
              retries--
              await new Promise(resolve => setTimeout(resolve, 200))
            } else {
              success = true
            }
          }
        }
      })
      
      await Promise.all(requests)
      
      if (!cancelled && Object.keys(notesMap).length > 0) {
        setDayNotes((prev) => ({ ...prev, ...notesMap }))
      }
    }
    
    fetchNotesForDisplayedDays()
    
    return () => {
      cancelled = true
    }
  }, [schedule, displayedDays, dayNotes])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  const canGoPrevious = currentStartIndex > 0
  const canGoNext = schedule && currentStartIndex + DAYS_PER_PAGE < daysInYear.length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2">Schedule</h1>
          <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary">Yearly duty rotation</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto flex-wrap sm:flex-nowrap gap-2 sm:gap-0">
          <input
            type="number"
            value={selectedYear}
            onChange={handleYearChange}
            min="1900"
            max="2100"
            className={`px-3 sm:px-4 py-2 border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all w-20 sm:w-32 text-sm sm:text-base font-semibold flex-shrink-0 ${
              isSchedule ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
            }`}
            placeholder="Year"
            style={{
              color: 'inherit',
              WebkitTextFillColor: 'inherit'
            }}
          />
          {!schedule && (
            <button
              onClick={generateSchedule}
              disabled={generating || !settings || !settings.persons || settings.persons.length === 0 || !settings.tasks || settings.tasks.length === 0}
              className="flex-1 sm:flex-none min-w-0 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-indigo/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
            >
              {generating ? 'Generating...' : 'Generate Year'}
            </button>
          )}
          {schedule && (
            <button
              onClick={generateSchedule}
              disabled={generating}
              className="flex-1 sm:flex-none min-w-fit px-3 sm:px-4 py-2 bg-gradient-to-r from-accent-sky via-accent-blue to-accent-indigo text-white border-0 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-sky/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
              title="Regenerate schedule"
            >
              {generating ? <><FaSync className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" /> <span>Regenerating...</span></> : <><FaSync className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" /> <span>Regenerate</span></>}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="dark:bg-red-900/20 light:bg-red-100 border border-red-500 rounded-2xl p-4 shadow-soft">
          <p className="dark:text-red-200 light:text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {/* Settings Warning */}
      {settings && (!settings.persons || settings.persons.length === 0 || !settings.tasks || settings.tasks.length === 0) && (
        <div className="dark:bg-yellow-900/20 light:bg-yellow-100 border border-yellow-500 rounded-2xl p-4 shadow-soft">
          <p className="dark:text-yellow-200 light:text-yellow-800 font-medium">
            Please configure people and tasks in the Admin Panel before generating a schedule.
          </p>
        </div>
      )}

      {schedule && (
        <div className="border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold dark:text-dark-text light:text-light-text mb-2 sm:mb-3">
              {selectedYear}
            </h2>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
              <div className="px-2 sm:px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="dark:text-dark-text-secondary light:text-light-text-secondary">People: </span>
                <span className="dark:text-dark-text light:text-light-text font-medium">{schedule.persons.join(', ')}</span>
              </div>
              <div className="px-2 sm:px-3 py-1 rounded-lg backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                <span className="dark:text-dark-text-secondary light:text-light-text-secondary">Tasks: </span>
                <span className="dark:text-dark-text light:text-light-text font-medium">{schedule.tasks.join(', ')}</span>
              </div>
            </div>
            <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mb-2 flex flex-wrap items-center gap-1">
              <FaLightbulb className="w-3 h-3 flex-shrink-0" /> <span className="hidden sm:inline">To change person names, go to Admin Panel → Edit Settings → Click</span><span className="sm:hidden">Tap</span> <FaEdit className="w-3 h-3 mx-1 flex-shrink-0" /> <span className="hidden sm:inline">next to a name, then regenerate this schedule</span>
            </p>
            
            {/* Date Selection and Navigation Controls */}
            <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary whitespace-nowrap">
                    Jump to date:
                  </label>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <input
                      type="date"
                      value={selectedStartDate || ''}
                      onChange={handleDateSelect}
                      min={`${selectedYear}-01-01`}
                      max={`${selectedYear}-12-31`}
                      className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 text-sm border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all ${
                        isSchedule ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
                      }`}
                    />
                    <button
                      onClick={jumpToToday}
                      className={`px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity font-medium whitespace-nowrap ${
                        isSchedule ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
                      }`}
                      title="Jump to today"
                    >
                      <FaCalendarDay className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Today
                    </button>
                  </div>
                </div>
                <div className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary w-full sm:w-auto text-center sm:text-left">
                  Showing {currentStartIndex + 1}-{Math.min(currentStartIndex + DAYS_PER_PAGE, daysInYear.length)} of {daysInYear.length} days
                </div>
              </div>
              {/* Navigation Buttons - Always visible on mobile */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 w-full py-2 sm:py-0">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className={`flex-1 sm:flex-none min-w-[100px] sm:min-w-0 px-4 sm:px-4 py-3 sm:py-2 text-sm sm:text-sm border-2 rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 hover:border-accent-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md sm:shadow-none active:scale-95 ${
                    isSchedule ? 'bg-transparent/20 backdrop-blur-sm border-white/20' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border disabled:hover:border-dark-border disabled:hover:border-light-border'
                  }`}
                >
                  ← <span className="hidden sm:inline">Previous 5 Days</span><span className="sm:hidden">Prev</span>
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className={`flex-1 sm:flex-none min-w-[100px] sm:min-w-0 px-4 sm:px-4 py-3 sm:py-2 text-sm sm:text-sm border-2 rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 hover:border-accent-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md sm:shadow-none active:scale-95 ${
                    isSchedule ? 'bg-transparent/20 backdrop-blur-sm border-white/20' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border disabled:hover:border-dark-border disabled:hover:border-light-border'
                  }`}
                >
                  <span className="hidden sm:inline">Next 5 Days</span><span className="sm:hidden">Next</span> →
                </button>
              </div>
            </div>
          </div>

          {/* 5 Days Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {displayedDays.map((day) => {
              const dayData = schedule.days.find(
                (d) => format(new Date(d.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              )
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const isToday = format(day, 'yyyy-MM-dd') === todayDate
              
              const dateStr = format(day, 'yyyy-MM-dd')
              const noteText = dayNotes[dateStr] || (dayData && dayData.note)
              const hasNote = !!noteText
              
              return (
                <div
                  key={day.toISOString()}
                  className={`relative border rounded-lg sm:rounded-xl p-3 sm:p-4 min-h-[150px] sm:min-h-[180px] lg:min-h-[200px] hover:shadow-soft transition-shadow backdrop-blur-sm ${
                    isSchedule ? 'bg-transparent/10 border-white/15' : 'dark:bg-dark-card light:bg-light-card dark:border-dark-border light:border-light-border'
                  } ${
                    isWeekend ? 'opacity-90' : ''
                  } ${
                    isToday ? 'ring-4 ring-[#E50914] dark:ring-[#B1060F] bg-[#E50914]/10 dark:bg-[#B1060F]/20 border-[#E50914] dark:border-[#B1060F] shadow-2xl dark:shadow-[#B1060F]/50 light:shadow-[#E50914]/70' : ''
                  }`}
                >
                  {hasNote && (
                    <NoteFloatingWidget 
                      date={dateStr}
                      note={noteText}
                      onClick={(date) => navigate(`/notes?date=${date}`)}
                    />
                  )}
                  <div className="mb-2 sm:mb-3">
                    <div className="text-xs sm:text-sm font-semibold dark:text-dark-text-secondary light:text-light-text-secondary mb-1">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold dark:text-dark-text light:text-light-text">
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                      {format(day, 'MMM')}
                    </div>
                    {isWeekend && (
                      <div className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1 italic">
                        weekend
                      </div>
                    )}
                  </div>
                  {dayData ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      {Object.entries(dayData.assignments).map(([task, person]) => (
                        <div key={task} className="text-xs sm:text-sm">
                          <span className="dark:text-dark-text-secondary light:text-light-text-secondary">{task}:</span>
                          <span className="dark:text-dark-text light:text-light-text ml-1 font-semibold">{person}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="text-xs sm:text-sm dark:text-dark-text-tertiary light:text-light-text-tertiary">No assignments</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!schedule && !generating && !error && (
        <div className="border rounded-2xl p-8 text-center shadow-soft backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Select a year and click Generate Year to create a schedule</p>
        </div>
      )}
    </div>
  )
}
