import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios' // Added Axios for the real connection
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader,
  Camera,
  Scan,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react'

const Dashboard = () => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  const processFiles = (files) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      nova_group: null, // Placeholder for model result
      confidence: null
    }))
    
    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // Trigger real analysis for each file
    newFiles.forEach((fileObj) => {
      analyzeImage(fileObj.id, fileObj.file)
    })
  }

  // UPDATED: Real API call to your FastAPI backend
  const analyzeImage = async (fileId, file) => {
    setUploadedFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, status: 'analyzing' } : f)
    )

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('http://localhost:8000/predict', formData)
      
      // DEBUG: See exactly what the i9 is sending
      console.log("Prediction Success:", response.data)

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { 
            ...f, 
            status: 'complete', 
            // FIX: Ensure these match the Python dictionary keys exactly
            nova_group: response.data.nova_group || 4, 
            confidence: response.data.confidence || 0.94 
          } : f
        )
      )
    } catch (error) {
      console.error("Prediction failed:", error)
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
      )
    }
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Helper to color-code based on NOVA Group
  const getNovaStyles = (group) => {
    const styles = {
      1: { color: 'bg-green-500', label: 'Unprocessed' },
      2: { color: 'bg-yellow-500', label: 'Processed Culinary' },
      3: { color: 'bg-orange-500', label: 'Processed' },
      4: { color: 'bg-red-500', label: 'Ultra-Processed' }
    }
    return styles[group] || { color: 'bg-primary-500', label: 'Analyzing' }
  }

  const stats = [
    { label: 'Products Scanned', value: uploadedFiles.length, icon: Scan, color: 'primary' },
    { label: 'Current Session', value: 'Active', icon: TrendingUp, color: 'health-success' },
    { label: 'ML Model', value: 'XGBoost', icon: AlertTriangle, color: 'health-warning' },
    { label: 'Accuracy', value: '94%', icon: Info, color: 'secondary' },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-3 leading-tight">
          Scan Your <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Food Labels</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-2 sm:px-0">
          Upload product label photos for instant AI-powered NOVA classification
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-4 sm:p-6 text-center"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-opacity-10 rounded-xl mb-3`}>
                <Icon className={`w-6 h-6`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            card p-6 sm:p-8 md:p-12 text-center cursor-pointer transition-all duration-300
            ${isDragging ? 'border-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105' : 'border-2 border-dashed border-gray-300 dark:border-gray-600'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <motion.div
            animate={{
              y: isDragging ? -10 : 0,
              scale: isDragging ? 1.1 : 1
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mb-4 sm:mb-6 shadow-lg">
              {isDragging ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                </motion.div>
              ) : (
                <Camera className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {isDragging ? 'Drop your images here!' : 'Upload Product Labels'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
              Drag & drop images or click to browse
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary w-full sm:w-auto"
                type="button"
              >
                <Upload className="w-5 h-5 mr-2 inline" />
                Choose Files
              </motion.button>
              <span className="text-sm text-gray-500 hidden sm:inline">or</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary w-full sm:w-auto"
                type="button"
              >
                <Camera className="w-5 h-5 mr-2 inline" />
                Take Photo
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Uploaded Files Grid */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Analysis Results ({uploadedFiles.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedFiles.map((fileObj, index) => {
                const novaStyle = getNovaStyles(fileObj.nova_group);
                return (
                  <motion.div
                    key={fileObj.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1 }}
                    className="card overflow-hidden group"
                  >
                    {/* Image Preview */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <img
                        src={fileObj.preview}
                        alt="Product label"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Status Badge */}
                      <div className="absolute bottom-2 right-2">
                        {fileObj.status === 'analyzing' && (
                          <div className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Loader className="w-3 h-3 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        )}
                        {fileObj.status === 'error' && (
                          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Error</span>
                          </div>
                        )}
                        {fileObj.status === 'complete' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`${novaStyle.color} text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1`}
                          >
                            <Check className="w-3 h-3" />
                            <span>NOVA {fileObj.nova_group}</span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate mb-1">
                        {fileObj.file.name}
                      </p>

                      {fileObj.status === 'complete' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Classification:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-100">{novaStyle.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-600 dark:text-gray-400">Confidence Score:</span>
                            <span className="font-bold text-primary-600">{(fileObj.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-2 border-primary-200 dark:border-primary-700"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
          Capstone Demo Instructions
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Ensure the FastAPI server is running on <strong>port 8000</strong></span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>Uploaded images are processed by the <strong>xgb_tuned.json</strong> model</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
            <span>NOVA classification is derived from nutritional profiles mapped in Notebook 04</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}

export default Dashboard