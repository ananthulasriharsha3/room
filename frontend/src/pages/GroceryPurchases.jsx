import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listGroceryPurchases, addGroceryPurchase, addGroceryPurchasesBatch, deleteGroceryPurchase, scanBill } from '../utils/grocery'
import { format } from 'date-fns'
import { FaCamera, FaTrash } from 'react-icons/fa'

export default function GroceryPurchases() {
  const location = useLocation()
  const isGrocery = location.pathname === '/grocery'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showScanForm, setShowScanForm] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    unit: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [scanFile, setScanFile] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const data = await listGroceryPurchases()
      setItems(data.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date)))
    } catch (error) {
      console.error('Error fetching grocery purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await addGroceryPurchase({
        name: formData.name,
        price: parseFloat(formData.price),
        quantity: formData.quantity || null,
        unit: formData.unit || null,
        purchase_date: formData.purchase_date,
      })
      setFormData({
        name: '',
        price: '',
        quantity: '',
        unit: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
      })
      setShowAddForm(false)
      fetchItems()
    } catch (error) {
      console.error('Error adding grocery purchase:', error)
      alert(error.message || 'Failed to add grocery purchase')
    }
  }

  const handleScan = async (e) => {
    e.preventDefault()
    if (!scanFile) return

    setScanning(true)
    try {
      const response = await scanBill(scanFile)
      setScanResults(response)
    } catch (error) {
      console.error('Error scanning bill:', error)
      alert(error.message || 'Failed to scan bill. Bill scanning is not available in the frontend. Please use manual entry.')
    } finally {
      setScanning(false)
    }
  }

  const handleAddFromScan = async (items) => {
    try {
      const purchases = items.map((item) => ({
        name: item.name || 'Unknown',
        price: parseFloat(item.price || 0),
        quantity: item.quantity || null,
        unit: item.unit || null,
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
      }))

      await addGroceryPurchasesBatch(purchases)
      setScanResults(null)
      setShowScanForm(false)
      setScanFile(null)
      fetchItems()
      alert('Items added successfully!')
    } catch (error) {
      console.error('Error adding scanned items:', error)
      alert(error.message || 'Failed to add items')
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return

    try {
      await deleteGroceryPurchase(itemId)
      fetchItems()
    } catch (error) {
      console.error('Error deleting purchase:', error)
      alert(error.message || 'Failed to delete purchase')
    }
  }

  const handleToggleSelect = (itemId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) return

    try {
      const deletePromises = Array.from(selectedItems).map(id => 
        deleteGroceryPurchase(id)
      )
      await Promise.all(deletePromises)
      setSelectedItems(new Set())
      setIsSelectMode(false)
      fetchItems()
      alert(`${selectedItems.size} item(s) deleted successfully!`)
    } catch (error) {
      console.error('Error deleting items:', error)
      alert(error.message || 'Failed to delete items')
    }
  }

  const handleCancelSelect = () => {
    setSelectedItems(new Set())
    setIsSelectMode(false)
  }

  const totalSpent = items.reduce((sum, item) => sum + item.price, 0)

  // Group items by purchase date
  const groupedItems = items.reduce((acc, item) => {
    const date = item.purchase_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(item)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="dark:text-dark-text-secondary light:text-light-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full max-w-full box-border">
        <div className="min-w-0 flex-1 max-w-full">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold dark:text-dark-text light:text-light-text mb-1 sm:mb-2 break-words">Grocery Purchases</h1>
          <p className="text-sm sm:text-base dark:text-dark-text-secondary light:text-light-text-secondary break-words">Track grocery purchases and bills</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto flex-shrink-0 max-w-full">
          <button
            onClick={() => {
              setShowScanForm(!showScanForm)
              setShowAddForm(false)
            }}
            className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <FaCamera /> Scan Bill
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setShowScanForm(false)
            }}
            className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Scan Bill Form */}
      {showScanForm && (
        <div className={`${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft`}
        style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Scan Grocery Bill</h2>
          {!scanResults ? (
            <form onSubmit={handleScan} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Bill Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScanFile(e.target.files[0])}
                  required
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                />
                <p className="text-xs dark:text-dark-text-tertiary light:text-light-text-tertiary mt-1">
                  Note: Requires Tesseract OCR to be installed
                </p>
              </div>
              <button
                type="submit"
                disabled={scanning || !scanFile}
                className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {scanning ? 'Scanning...' : 'Scan Bill'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className={`${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-xl p-4`}
              style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
              >
                <h3 className="font-semibold dark:text-dark-text light:text-light-text mb-3">Scanned Items:</h3>
                <div className="space-y-2">
                  {scanResults.items.map((item, idx) => (
                    <div key={idx} className="text-sm dark:text-dark-text-secondary light:text-light-text-secondary">
                      {item.name} - ₹{item.price} {item.quantity && `(${item.quantity} ${item.unit || ''})`}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => handleAddFromScan(scanResults.items)}
                  className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
                >
                  Add All Items
                </button>
                <button
                  onClick={() => {
                    setScanResults(null)
                    setScanFile(null)
                  }}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} dark:text-dark-text light:text-light-text font-semibold rounded-lg sm:rounded-xl hover:opacity-90 transition-opacity`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                >
                  Scan Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Item Form */}
      {showAddForm && (
        <div className={`${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-surface light:bg-light-surface border dark:border-dark-border light:border-light-border'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft`}
        style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
        >
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-dark-text light:text-light-text mb-3 sm:mb-4">Add Grocery Purchase</h2>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={200}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className={`w-full px-4 py-3 ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Quantity
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className={`w-full px-4 py-3 ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className={`w-full px-4 py-3 ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                  placeholder="kg, L, etc."
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium dark:text-dark-text-secondary light:text-light-text-secondary mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${isGrocery ? 'bg-transparent/10 backdrop-blur-sm border-white/15' : 'dark:bg-dark-card light:bg-light-card border dark:border-dark-border light:border-light-border'} rounded-lg sm:rounded-xl dark:text-dark-text light:text-light-text dark:placeholder:text-dark-text-secondary light:placeholder:text-light-text-secondary focus:outline-none focus:ring-2 dark:focus:ring-white/50 light:focus:ring-blue-500/50 transition-all`}
                  style={isGrocery ? { background: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-accent-lime via-accent-emerald to-accent-teal text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-accent-lime/30 hover:scale-105 transition-all"
            >
              Add Purchase
            </button>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="dark:bg-gradient-to-br dark:from-dark-surface dark:via-dark-card dark:to-dark-surface light:bg-gradient-to-br light:from-light-surface light:via-light-card light:to-light-surface border-2 sm:border-4 dark:border-accent-teal/40 light:border-accent-teal/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl w-full max-w-full overflow-x-hidden box-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 w-full max-w-full box-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto min-w-0 flex-1 max-w-full">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-accent-teal via-accent-cyan to-accent-sky bg-clip-text text-transparent break-words min-w-0 max-w-full">All Purchases</h2>
            {!isSelectMode ? (
              <button
                onClick={() => setIsSelectMode(true)}
                className="btn-stranger w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <FaTrash className="text-base sm:text-lg" /> Delete All
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handleSelectAll}
                  className="btn-stranger w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm break-words"
                >
                  {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedItems.size === 0}
                  className="btn-stranger w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 break-words"
                >
                  <FaTrash className="text-sm sm:text-base flex-shrink-0" /> <span className="break-words">Delete ({selectedItems.size})</span>
                </button>
                <button
                  onClick={handleCancelSelect}
                  className="btn-stranger w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto flex-shrink-0">
            <p className="text-xs sm:text-sm dark:text-dark-text-secondary light:text-light-text-secondary">Total Spent</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold dark:text-dark-text light:text-light-text break-words">₹{totalSpent.toFixed(2)}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="dark:text-dark-text-secondary light:text-light-text-secondary text-center py-6 sm:py-8 text-sm sm:text-base">No purchases yet</p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .map(([date, dateItems]) => {
                const dateTotal = dateItems.reduce((sum, item) => sum + item.price, 0)
                return (
                  <div key={date} className="dark:bg-gradient-to-br dark:from-dark-card dark:via-dark-surface dark:to-dark-card light:bg-gradient-to-br light:from-light-card light:via-light-surface light:to-light-card border-2 sm:border-4 dark:border-accent-lime/30 light:border-accent-lime/20 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-lg w-full max-w-full overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                      <h3 className="font-extrabold text-base sm:text-lg bg-gradient-to-r from-accent-lime via-accent-emerald to-accent-teal bg-clip-text text-transparent">
                        {format(new Date(date), 'MMMM dd, yyyy')}
                      </h3>
                      <p className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-accent-yellow via-accent-amber to-accent-orange bg-clip-text text-transparent">₹{dateTotal.toFixed(2)}</p>
                    </div>
                    <div className="space-y-2">
                      {dateItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 dark:bg-gradient-to-r dark:from-dark-surface dark:to-dark-card light:bg-gradient-to-r light:from-light-surface light:to-light-card rounded-lg sm:rounded-xl transition-all border-2 ${
                            isSelectMode && selectedItems.has(item.id) 
                              ? 'ring-2 sm:ring-4 ring-accent-indigo border-accent-violet dark:bg-gradient-to-r dark:from-accent-indigo/30 dark:to-accent-violet/30 light:bg-gradient-to-r light:from-accent-indigo/20 light:to-accent-violet/20 shadow-xl' 
                              : 'border-accent-teal/20 dark:border-accent-teal/30'
                          } ${isSelectMode ? 'cursor-pointer hover:ring-2 sm:hover:ring-4 hover:ring-accent-violet/70 hover:border-accent-fuchsia/50 hover:shadow-2xl' : 'hover:shadow-lg'}`}
                          onClick={() => isSelectMode && handleToggleSelect(item.id)}
                        >
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {isSelectMode && (
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => handleToggleSelect(item.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 sm:w-6 sm:h-6 text-accent-indigo border-3 border-accent-violet rounded-lg focus:ring-accent-fuchsia focus:ring-2 sm:focus:ring-4 cursor-pointer bg-gradient-to-br from-accent-indigo to-accent-violet flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm sm:text-base dark:text-dark-text light:text-light-text break-words">{item.name}</p>
                              {item.quantity && (
                                <p className="text-xs sm:text-sm font-semibold dark:text-dark-text-tertiary light:text-light-text-tertiary">
                                  {item.quantity} {item.unit || ''}
                                </p>
                              )}
                              {item.is_from_bill && (
                                <span className="inline-block mt-1 px-2 sm:px-3 py-1 text-xs font-bold bg-gradient-to-r from-accent-cyan via-accent-sky to-accent-blue text-white rounded-lg shadow-md">
                                  From Bill
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 w-full sm:w-auto">
                            <p className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-accent-emerald to-accent-teal bg-clip-text text-transparent">₹{item.price.toFixed(2)}</p>
                            {!isSelectMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(item.id)
                                }}
                                className="btn-stranger px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
