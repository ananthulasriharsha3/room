import { useEffect, useState } from 'react'
import api from '../utils/api'
import { format, startOfYear, endOfYear, eachDayOfInterval, getYear, differenceInDays, startOfDay } from 'date-fns'
import { FaSync, FaLightbulb, FaEdit, FaCalendarDay } from 'react-icons/fa'

export default function Schedule() {
  const [schedule, setSchedule] = useState(null)
  const [settings, setSettings] = useState(null)
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
      const response = await api.get(`/schedule/${selectedYear}`)
      setSchedule(response.data)
      // Don't reset currentStartIndex here - let the selectedStartDate effect handle it
      setError(null)
    } catch (error) {
      // Schedule not found is expected if not generated yet - don't show error
      if (error.response?.status !== 404) {
        console.error('Error loading saved schedule:', error)
      }
      // Don't set error for 404 - just means schedule hasn't been generated yet
    }
  }

  useEffect(() => {
    fetchSettings()
    loadSavedSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCurrentStartIndex(0)
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
      const response = await api.get('/settings')
      setSettings(response.data)
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
      const response = await api.post('/schedule', {
        year: selectedYear,
        month: null, // Generate full year
      })
      setSchedule(response.data)
      setCurrentStartIndex(0) // Reset to first page
    } catch (error) {
      console.error('Error generating schedule:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate schedule. Please try again.'
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

  const handlePrevious = () => {
    setCurrentStartIndex((prev) => Math.max(0, prev - DAYS_PER_PAGE))
  }

  const handleNext = () => {
    if (schedule) {
      const yearStart = startOfYear(new Date(selectedYear, 0, 1))
      const yearEnd = endOfYear(new Date(selectedYear, 11, 31))
      const daysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd })
      const maxIndex = daysInYear.length - DAYS_PER_PAGE
      setCurrentStartIndex((prev) => Math.min(maxIndex, prev + DAYS_PER_PAGE))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  const yearStart = startOfYear(new Date(selectedYear, 0, 1))
  const yearEnd = endOfYear(new Date(selectedYear, 11, 31))
  const daysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd })
  const displayedDays = schedule ? daysInYear.slice(currentStartIndex, currentStartIndex + DAYS_PER_PAGE) : []
  const canGoPrevious = currentStartIndex > 0
  const canGoNext = schedule && currentStartIndex + DAYS_PER_PAGE < daysInYear.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold dark:text-dark-text light:text-light-text mb-2">Schedule</h1>
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Yearly duty rotation</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={selectedYear}
            onChange={handleYearChange}
            min="1900"
            max="2100"
            className="px-4 py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all w-32 font-semibold"
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
                  className="px-6 py-3 bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-fuchsia text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-indigo/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {generating ? 'Generating...' : 'Generate Year'}
            </button>
          )}
          {schedule && (
            <button
              onClick={generateSchedule}
              disabled={generating}
                  className="px-4 py-2 bg-gradient-to-r from-accent-sky via-accent-blue to-accent-indigo text-white border-0 text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-sky/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Regenerate schedule"
            >
              {generating ? 'Regenerating...' : <><FaSync className="inline w-4 h-4 mr-1" /> Regenerate</>}
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
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-6 shadow-soft">
          <div className="mb-6">
            <h2 className="text-2xl font-bold dark:text-dark-text light:text-light-text mb-3">
              {selectedYear}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              <div className="dark:bg-dark-card light:bg-light-card px-3 py-1 rounded-lg">
                <span className="dark:text-dark-text-secondary light:text-light-text-secondary">People: </span>
                <span className="dark:text-dark-text light:text-light-text font-medium">{schedule.persons.join(', ')}</span>
              </div>
              <div className="dark:bg-dark-card light:bg-light-card px-3 py-1 rounded-lg">
                <span className="dark:text-dark-text-secondary light:text-light-text-secondary">Tasks: </span>
                <span className="dark:text-dark-text light:text-light-text font-medium">{schedule.tasks.join(', ')}</span>
              </div>
            </div>
            <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mb-2 flex items-center gap-1">
              <FaLightbulb className="w-3 h-3" /> To change person names, go to Admin Panel → Edit Settings → Click <FaEdit className="w-3 h-3 mx-1" /> next to a name, then regenerate this schedule
            </p>
            
            {/* Date Selection and Navigation Controls */}
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary">
                    Jump to date:
                  </label>
                  <input
                    type="date"
                    value={selectedStartDate || ''}
                    onChange={handleDateSelect}
                    min={`${selectedYear}-01-01`}
                    max={`${selectedYear}-12-31`}
                    className="px-3 py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all"
                  />
                  <button
                    onClick={jumpToToday}
                    className="px-3 py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity text-sm font-medium"
                    title="Jump to today"
                  >
                    <FaCalendarDay className="inline w-4 h-4 mr-1" /> Today
                  </button>
                </div>
                <div className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
                  Showing {currentStartIndex + 1}-{Math.min(currentStartIndex + DAYS_PER_PAGE, daysInYear.length)} of {daysInYear.length} days
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="px-4 py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  ← Previous 5 Days
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="px-4 py-2 dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl dark:text-dark-text light:text-light-text hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Next 5 Days →
                </button>
              </div>
            </div>
          </div>

          {/* 5 Days Display */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {displayedDays.map((day) => {
              const dayData = schedule.days.find(
                (d) => format(new Date(d.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              )
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              
              return (
                <div
                  key={day.toISOString()}
                  className={`dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border rounded-xl p-4 min-h-[200px] hover:shadow-soft transition-shadow ${
                    isWeekend ? 'opacity-90' : ''
                  }`}
                >
                  <div className="mb-3">
                    <div className="text-sm font-semibold dark:text-dark-text-secondary light:text-light-text-secondary mb-1">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-2xl font-bold dark:text-dark-text light:text-light-text">
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
                    <div className="space-y-2">
                      {Object.entries(dayData.assignments).map(([task, person]) => (
                        <div key={task} className="text-sm">
                          <span className="dark:text-dark-text-secondary light:text-light-text-secondary">{task}:</span>
                          <span className="dark:text-dark-text light:text-light-text ml-1 font-semibold">{person}</span>
                        </div>
                      ))}
                      {dayData.note && (
                        <div className="mt-3 pt-3 border-t dark:border-dark-border light:border-light-border">
                          <p className="text-xs dark:text-dark-text-secondary light:text-light-text-secondary italic">{dayData.note}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm dark:text-dark-text-tertiary light:text-light-text-tertiary">No assignments</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!schedule && !generating && !error && (
        <div className="dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border rounded-2xl p-8 text-center shadow-soft">
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary">Select a year and click Generate Year to create a schedule</p>
        </div>
      )}
    </div>
  )
}
